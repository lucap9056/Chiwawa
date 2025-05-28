import { MongoClient, Collection } from "mongodb";
import { createPool, Factory, Pool } from "generic-pool";
import { createEmptyUserConfig, UserConfig } from "structs/user-config";
import { OAuth2Token } from "structs/discord-oauth2";
import { randomBytes } from "crypto";
import { Session } from "structs/sessions";
import { AppInfo } from "structs/profile";

declare global {
    var _mongoPool: Pool<Client>;
}

const DATABASE_URL = process.env["DATABASE_URL"] || "";

const enum COLLECTIONS {
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

const mongoPool = global._mongoPool || (() => {
    const pool = createPool(factory, {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 70000
    });
    global._mongoPool = pool;

    pool.on("factoryCreateError", (err) => {
        console.log(err);
    });

    return pool;
})();

export async function getMongoClient(): Promise<Client> {
    return mongoPool.acquire();
}

export async function releaseMongoClient(client: Client): Promise<void> {
    return mongoPool.release(client);
}

export async function useMongo<T>(
    callback: (client: Client) => Promise<T>
): Promise<[T, undefined] | [undefined, Error]> {
    let client: Client | null = null;

    try {
        client = await getMongoClient();
        const result = await callback(client);
        return [result, undefined] as const;
    } catch (err) {
        return [undefined, err as Error] as const;
    } finally {
        try {
            if (client) {
                await releaseMongoClient(client);
            }
        } catch (err) {
            console.error("Error releasing MongoDB client:", err);
        }
    }
}

type App = Omit<AppInfo, "ttsAccessToken"> & {
    id: "0",
    guildIds: string[]
}


class Client {
    private client: MongoClient;
    private users: Collection;
    private sessions: Collection;

    constructor(client: MongoClient) {
        this.client = client;

        const db = client.db();

        const users = db.collection(COLLECTIONS.USERS);
        const sessions = db.collection(COLLECTIONS.SESSIONS);

        this.users = users;
        this.sessions = sessions;

        users.createIndex({ id: 1 });
        sessions.createIndex({ sessionId: 1 });
        sessions.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
    }

    public async getAppInfo(): Promise<App> {
        const result = await this.users.findOne<App>({ id: "0" }, { projection: { _id: 0 } });
        if (!result) {
            throw new Error("Application information document not found in the database.");
        }
        return result;
    }

    public async getUserConfig(id: string): Promise<UserConfig> {
        const result = await this.users.findOne<UserConfig>({ id }, { projection: { _id: 0 } });
        return result || createEmptyUserConfig(id);
    }

    public async updateUserConfig(user: UserConfig): Promise<void> {
        const result = await this.users.updateOne(
            { id: user.id },
            { $set: user },
            { upsert: true }
        );
        if (!result.acknowledged) {
            throw new Error(`Failed to update user with ID: ${user.id}. Database operation not acknowledged.`);
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