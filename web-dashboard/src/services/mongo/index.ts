import { MongoClient, Collection } from "mongodb";
import { createPool, Factory, Pool } from "generic-pool";
import { createEmptySpeechNotice, createEmptyUserConfig, SpeechNotice, UserConfig } from "structs/user-config";
import { OAuth2Token } from "structs/discord-oauth2";
import { randomBytes } from "crypto";
import { AdminAppConfig, AppConfig, createEmptyAdminAppConfig } from "structs/app-config";
import { Session } from "structs/sessions";
import { AppInfo } from "structs/profile";
import { Mutex } from "structs/mutex";
import { goify } from "resultant.js/goify";
import { buildResult, match, Option, Result } from "resultant.js/rustify";

declare global {
    var _mongoMutex: Mutex
    var _mongoPool: Pool<Client>;
}

const DATABASE_URL = process.env["DATABASE_URL"] || "";

const enum COLLECTIONS {
    APP = "app",
    USERS = "users",
    SESSIONS = "sessions"
}

const factory: Factory<Client> = {
    create: async () => {
        const client = new MongoClient(DATABASE_URL);
        await client.connect();
        return new Client(client);
    },
    destroy: async (client) => {
        await client.close();
    },
};

const createMongoPool = async () => {
    const pool = createPool(factory, {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 70000
    });

    pool.on("factoryCreateError", (err) => {
        console.log(err);
    });

    try {
        console.log('Attempting to acquire first MongoDB connection for initialization...');
        const client = await pool.acquire();
        await pool.release(client);
        console.log('First MongoDB connection successfully established and pool initialized.');
    } catch (error) {
        console.error('Initialization of the first MongoDB connection failed:', error);
        throw new Error(`Failed to initialize MongoDB connection pool: ${(error as Error).message}`);
    }

    return pool;
}

const mux = global._mongoMutex || (() => {
    const mutex = new Mutex();
    global._mongoMutex = mutex;
    return mutex;
})();


export const useMongo = <T>(callback: (client: Client) => Promise<T>) => goify(async () => {
    const [mongoPool, err] = await mux.runExclusive<Pool<Client>>(
        async () => {
            if (global._mongoPool) {
                return global._mongoPool;
            }
            const pool = await createMongoPool();
            global._mongoPool = pool;
            return pool;
        }
    );

    if (err) {
        throw err;
    }

    const client = await mongoPool.acquire();
    const result = await buildResult(() => callback(client));
    mongoPool.release(client);
    if (result.isOk()) {
        return result.unwrap();
    } else {
        throw result.unwrapErr();
    }
});

interface App {
    version: number
    config: AdminAppConfig,
    guildIds: []
};

class Client {
    private client: MongoClient;
    private app: Collection<AppInfo>;
    private users: Collection<UserConfig>;
    private sessions: Collection<Session>;

    constructor(client: MongoClient) {
        this.client = client;

        const db = client.db();

        const app = db.collection<AppInfo>(COLLECTIONS.APP);
        const users = db.collection<UserConfig>(COLLECTIONS.USERS);
        const sessions = db.collection<Session>(COLLECTIONS.SESSIONS);

        this.app = app;
        this.users = users;
        this.sessions = sessions;

        users.createIndex({ id: 1 });
        sessions.createIndex({ sessionId: 1 });
        sessions.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
    }

    public async getAppInfo(): Promise<App> {
        const result = await this.app.findOne<App>({ id: "0" }, { projection: { _id: 0 } });
        if (!result) {
            console.error("Application information document not found in the database.");
            return {
                version: 1,
                guildIds: [],
                config: createEmptyAdminAppConfig()
            };
        }
        return result;
    }

    public async updateAppConfig(userId: string, config: AppConfig): Promise<void> {
        const id = "0";
        const version = 1;
        const emptyGuildIds: string[] = [];
        const emptyConfig = createEmptyAdminAppConfig();

        const ensureExistenceResult = await this.app.updateOne(
            { id },
            { $setOnInsert: { id, version, guildIds: emptyGuildIds, config: emptyConfig } },
            { upsert: true }
        );

        if (!ensureExistenceResult.acknowledged) {
            throw new Error(``);
        }

        const result = await this.app.updateOne(
            { id, "config.admins": { $in: [userId] } },
            { $set: { id, version, config } }
        );

        if (!result.acknowledged) {
            throw new Error(`Failed to update appInfo. Database operation not acknowledged.`);
        }
    }

    public async getUserConfig(id: string): Promise<UserConfig> {
        const emptyUserConfig = createEmptyUserConfig(id);
        const result = await buildResult(() => this.users.findOne<UserConfig>({ id }, { projection: { _id: 0 } }));
        return match(result, {
            Ok(value) {
                return new Option(value).map((v) => ({ ...emptyUserConfig, ...v })).unwrapOr(emptyUserConfig);
            },
            Err() {
                return emptyUserConfig;
            }
        })
    }

    public async updateUserSpeechNotice(userId: string, guildId: string, speechNotice: SpeechNotice): Promise<void> {

        const updatedData = guildId === "" ? {
            global: speechNotice
        } : {
            guilds: {
                [guildId]: speechNotice
            }
        }

        const result = await this.users.updateOne(
            { id: userId },
            { $set: updatedData },
            { upsert: true }
        );
        if (!result.acknowledged) {
            throw new Error(`Failed to update user with ID: ${userId}. Database operation not acknowledged.`);
        }
    }

    public async createSession(userId: string, userToken: OAuth2Token, maxAge: number): Promise<string> {
        const sessionId = randomBytes(16).toString("hex");
        const expireAt = new Date(Date.now() + maxAge * 1000);
        const session: Session = { sessionId, userId, userToken, expireAt };
        const result = await this.sessions.insertOne(session);
        if (!result.acknowledged) {
            throw new Error("Failed to create new session. Database operation not acknowledged.");
        }
        return sessionId;
    }

    public async getSession(sessionId: string): Promise<Session | null> {
        return await this.sessions.findOne<Session>({ sessionId });
    }

    public async updateSession(session: Session): Promise<void> {
        const { sessionId } = session;
        const res = await this.sessions.updateOne(
            { sessionId },
            { $set: session },
            { upsert: true }
        );
        if (!res.acknowledged) {
            throw new Error(`Failed to update session with ID: ${sessionId}. Database operation not acknowledged.`);
        }
    }

    public async deleteSession(sessionId: string): Promise<void> {
        const result = await this.sessions.deleteOne({ sessionId });
        if (!result.acknowledged) {
            throw new Error(`Failed to delete session with ID: ${sessionId}. Database operation not acknowledged.`);
        }
    }

    public close(force?: boolean): Promise<void> {
        return this.client.close(force);
    }
}