import { Collection, MongoClient } from "mongodb";
import { AppInfo, createEmptyAppInfo, UserConfig } from "structs/user-config";

export interface Database {
    getAppInfo: () => Promise<AppInfo>
    getUserConfig: (id: string) => Promise<UserConfig | null>
    setUserConfig: (user: UserConfig) => Promise<void>
    close: () => Promise<void>
}

const getAppInfo = async (collection: Collection): Promise<AppInfo> => {
    const appInfo = await collection.findOne<AppInfo>({ id: "0" });
    return appInfo || createEmptyAppInfo();
}

const getUserConfig = (collection: Collection, id: string) => collection.findOne<UserConfig>({ id }, { projection: { _id: 0 } });

const setUserConfig = async (collection: Collection, user: UserConfig) => {
    const update_result = await collection.updateOne(
        { id: user.id },
        { $set: user },
        { upsert: true }
    );

    if (!update_result.acknowledged) {
        throw new Error('Failed to acknowledge user upsert operation. The database did not confirm the write.');
    }
};

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
        } catch (error: any) {
            console.error(
                `Database connection failed on attempt ${attempt}/${MAX_DB_CONNECTION_RETRIES}. Error: ${error.message}`
            );
            if (attempt < MAX_DB_CONNECTION_RETRIES) {
                const backoffDelay = initialDelayMs * Math.pow(2, attempt - 1);
                console.log(`Retrying connection in ${backoffDelay}ms...`);
                await delay(backoffDelay);
            }
        }
    }
    throw new Error(
        `Failed to connect to the database after ${MAX_DB_CONNECTION_RETRIES} attempts.`
    );
};

const newDatabase = async (url: string): Promise<Database> => {
    const client = await connectDatabaseWithRetry(url);

    const db = client.db();
    const users = db.collection("users");

    return {
        getAppInfo: () => getAppInfo(users),
        getUserConfig: (userId: string): Promise<UserConfig | null> => getUserConfig(users, userId),
        setUserConfig: (user: UserConfig) => setUserConfig(users, user),
        close: (): Promise<void> => client.close()
    }
}

export default {
    newDatabase
}