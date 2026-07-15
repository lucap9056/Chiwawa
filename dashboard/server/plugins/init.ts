import { RedisClient, SQL } from "bun";
import { definePlugin } from "nitro";
import type { Result } from "resultant.js/rustify";
import cache, { type Cache } from "#/services/cache";
import database, { type Database } from "#/services/database";
import { fetchIssueToken, initializeTTS, type TTSMessage } from "#/services/microsoft-tts";
import { newOAuth2Provider, type OAuth2Provider } from "#/services/oauth2-provider";
import sessions, { type Sessions } from "#/services/sessions";

export interface State {
    oauth2Provider: OAuth2Provider;
    db: Database;
    cache: Cache;
    sessions: Sessions;
    tts: TTSMessage;
    updateTTS: (region: string, apiKey: string) => Promise<Result<void, Error>>;
    dispose: () => Promise<void>;
}

const REQUIRED_ENV_VARS = [
    {
        key: "REDIS_URL",
        description: "Redis connection URL, required to store sessions and publish cache updates.",
    },
    {
        key: "DATABASE_URL",
        description: "Postgres connection URL, required to read/write app config and user data.",
    },
    {
        key: "CLIENT_ID",
        description: "Discord application client ID, required to build the OAuth2 login URL.",
    },
    {
        key: "CLIENT_SECRET",
        description: "Discord application client secret, required to exchange/refresh OAuth2 tokens.",
    },
    {
        key: "REDIRECT_URI",
        description: "Discord OAuth2 redirect URI, required to match the callback registered on Discord.",
    },
    {
        key: "ADMINS",
        description: "Comma-separated Discord user IDs, required to bootstrap the initial app config admins.",
    },
] as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_VARS)[number]["key"];

const env = Object.fromEntries(REQUIRED_ENV_VARS.map(({ key }) => [key, (process.env[key] || "").trim()])) as Record<
    RequiredEnvKey,
    string
>;

const missingEnvVars = REQUIRED_ENV_VARS.filter(({ key }) => env[key] === "");
if (missingEnvVars.length > 0) {
    const detail = missingEnvVars.map(({ key, description }) => `  - ${key}: ${description}`).join("\n");
    throw new Error(`ENV_CONFIG_ERROR: missing required environment variable(s):\n${detail}`);
}

const REDIS_URL = env.REDIS_URL;
const DATABASE_URL = env.DATABASE_URL;

const CLIENT_ID = env.CLIENT_ID;
const CLIENT_SECRET = env.CLIENT_SECRET;
const REDIRECT_URI = env.REDIRECT_URI;

const TTS_REGION = process.env.TTS_REGION || "";
const TTS_APIKEY = process.env.TTS_APIKEY || "";

const ADMINS = env.ADMINS;

const initializeState = (rdb: RedisClient, sql: SQL, oauth2Provider: OAuth2Provider, envAdmins: string): State => {
    const db = database.newDatabase(sql, envAdmins.split(","));
    const ca = cache.newCache(rdb);
    const se = sessions.newSessions(rdb);

    let tts: TTSMessage = initializeTTS(TTS_REGION, TTS_APIKEY);

    return {
        oauth2Provider,
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

const rdb = new RedisClient(REDIS_URL);
const sql = new SQL(DATABASE_URL);
await Promise.all([rdb.connect(), sql.connect()]);

const oauth2Provider = newOAuth2Provider(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
export const state: State = initializeState(rdb, sql, oauth2Provider, ADMINS);

export default definePlugin((_) => {
    process.on("SIGTERM", async () => {
        await state.dispose();
    });
    process.on("SIGINT", async () => {
        await state.dispose();
    });
});
