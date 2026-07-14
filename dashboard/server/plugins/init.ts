import { RedisClient, SQL } from "bun";
import { definePlugin } from "nitro";
import type { Result } from "resultant.js/rustify";
import cache, { type Cache } from "#/services/cache";
import database, { type Database } from "#/services/database";
import { fetchIssueToken, initializeTTS, type TTSMessage } from "#/services/microsoft-tts";
import sessions, { type Sessions } from "#/services/sessions";

export interface State {
    db: Database;
    cache: Cache;
    sessions: Sessions;
    tts: TTSMessage;
    updateTTS: (region: string, apiKey: string) => Promise<Result<void, Error>>;
    dispose: () => Promise<void>;
}

const TTS_REGION = process.env.TTS_REGION || "";
const TTS_APIKEY = process.env.TTS_APIKEY || "";
const REDIS_URL = process.env.REDIS_URL || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const initializeState = (rdb: RedisClient, sql: SQL): State => {
    const db = database.newDatabase(sql);
    const ca = cache.newCache(rdb);
    const se = sessions.newSessions(rdb);

    let tts: TTSMessage = initializeTTS(TTS_REGION, TTS_APIKEY);

    return {
        db: db,
        cache: ca,
        sessions: se,
        get tts() {
            return tts;
        },

        updateTTS: async (region: string, apiKey: string) => {
            const now = Date.now();
            const res = await fetchIssueToken(now, region, apiKey);
            return res.map((token) => {
                tts = initializeTTS(region, apiKey, token);
            });
        },
        dispose: async () => {
            await Promise.all([sql.close(), rdb.close()]);
        },
    };
};

if (REDIS_URL === "") {
    throw new Error("CACHE_CONNECTION_ERROR: REDIS_URL is empty.");
}

if (DATABASE_URL === "") {
    throw new Error("DB_CONNECTION_ERROR: DATABASE_URL is empty.");
}

const rdb = new RedisClient(REDIS_URL);
const sql = new SQL(DATABASE_URL);
await Promise.all([rdb.connect(), sql.connect()]);

export const state: State = initializeState(rdb, sql);

export default definePlugin((_) => {
    process.on("SIGTERM", async () => {
        await state.dispose();
    });
    process.on("SIGINT", async () => {
        await state.dispose();
    });
});
