import { MongoClient } from "mongodb";
import { AppInfo, UserConfig } from "/structs/user-config";

export interface Database {
    setAppInfo: (appInfo: AppInfo) => Promise<void>
    get: (id: string) => Promise<UserConfig | null>
    close: () => Promise<void>
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
    const collection = db.collection<UserConfig>("users");

    return {
        setAppInfo: async (appInfo: AppInfo) => {
            const { acknowledged } = await collection.updateOne(
                { id: "0" },
                { $set: appInfo },
                { upsert: true }
            );
            if (!acknowledged) throw new Error("SET_GUILD_IDS_FAILED: Database operation not acknowledged.");
        },
        get: (id: string): Promise<UserConfig | null> => {
            return collection.findOne<UserConfig>({ id }, { projection: { _id: 0 } });
        },
        close: (): Promise<void> => {
            return client.close();
        }
    }
}

export default {
    newDatabase
}