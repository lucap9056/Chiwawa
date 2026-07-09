import { createEmptyAppConfig } from "lib/config";
import type { AppConfig, UserConfig } from "models";
import { MongoClient } from "mongodb";
import { buildResult, Err, Ok, Option, type Result } from "resultant.js/rustify";

export interface AppInfo {
    version: number;
    config: AppConfig;
    guildIds: string[];
}

export interface Database {
    initAppInfo: () => Promise<Result<void, Error>>;
    setGuildIds: (guildIds: string[]) => Promise<Result<void, Error>>;
    setAppConfig: (config: AppConfig) => Promise<Result<void, Error>>;
    getAppConfig: () => Promise<Result<Option<AppConfig>, Error>>;
    getUserConfig: (id: string) => Promise<Result<Option<UserConfig>, Error>>;
    close: () => Promise<void>;
}

const MAX_DB_CONNECTION_RETRIES = 5;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const connectDatabaseWithRetry = async (databaseUrl: string): Promise<MongoClient> => {
    const initialDelayMs = 1000;

    for (let attempt = 1; attempt <= MAX_DB_CONNECTION_RETRIES; attempt++) {
        const client = new MongoClient(databaseUrl);
        try {
            await client.connect();
            console.log(`Successfully connected to the database on attempt ${attempt}.`);
            return client;
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(
                    `Database connection failed on attempt ${attempt}/${MAX_DB_CONNECTION_RETRIES}. Error: ${error.message}`,
                );
            }
            if (attempt < MAX_DB_CONNECTION_RETRIES) {
                const backoffDelay = initialDelayMs * 2 ** (attempt - 1);
                console.log(`Retrying connection in ${backoffDelay}ms...`);
                await delay(backoffDelay);
            }
        }
    }
    throw new Error(`Failed to connect to the database after ${MAX_DB_CONNECTION_RETRIES} attempts.`);
};

const newDatabase = (databaseUrl: string) =>
    buildResult<Database>(async () => {
        if (databaseUrl === "") {
            throw new Error("DB_CONNECTION_ERROR: Database URL cannot be empty.");
        }
        const client = await connectDatabaseWithRetry(databaseUrl);

        const db = client.db();
        const users = db.collection<UserConfig>("users");
        const app = db.collection<AppInfo>("app");

        const id = "0";
        const version = 1;

        return {
            initAppInfo: () =>
                buildResult(async () => {
                    const guildIds: string[] = [];
                    const config = createEmptyAppConfig();
                    const { acknowledged } = await app.updateOne(
                        { id },
                        { $setOnInsert: { version, guildIds, config } },
                        { upsert: true },
                    );
                    if (!acknowledged) {
                        throw new Error("DB_INIT_APP_INFO_FAILED: Database operation not acknowledged.");
                    }
                }),
            setGuildIds: (guildIds: string[]) =>
                buildResult(async () => {
                    const { acknowledged } = await app.updateOne({ id }, { $set: { version, guildIds } });
                    if (!acknowledged) {
                        throw new Error("DB_SET_GUILD_IDS_FAILED: Database operation not acknowledged.");
                    }
                }),
            setAppConfig: (config: AppConfig) =>
                buildResult(async () => {
                    const { acknowledged } = await app.updateOne({ id }, { $set: { version, config } });
                    if (!acknowledged) {
                        throw new Error("DB_SET_APP_CONFIG_FAILED: Database operation not acknowledged.");
                    }
                }),

            getAppConfig: () =>
                app
                    .findOne<AppInfo>({ id }, { projection: { _id: 0, id: 0, guildIds: 0 } })
                    .then((appInfo) => Ok<Option<AppConfig>, Error>(new Option(appInfo).map(({ config }) => config)))
                    .catch((err) => Err<Option<AppConfig>, Error>(err)),

            getUserConfig: (id: string) =>
                users
                    .findOne<UserConfig>({ id }, { projection: { _id: 0 } })
                    .then((user) => Ok<Option<UserConfig>, Error>(new Option(user)))
                    .catch((err) => Err<Option<UserConfig>, Error>(err)),

            close: (): Promise<void> => {
                return client.close();
            },
        };
    });

export default {
    newDatabase,
};
