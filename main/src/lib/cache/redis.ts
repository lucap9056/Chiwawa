import { EventEmitter } from "node:events";
import { RedisClient } from "bun";
import { AppConfig } from "models";
import { buildResultAsync, match, None, type Option, type Result, Some } from "resultant.js/rustify";
import {
    CONFIG_UPDATED_CHANNEL,
    GUILD_IDS_KEY,
    GUILDS_UPDATED_CHANNEL,
    type GuildEvent,
    type GuildEventType,
    SPEECH_CACHE_PREFIX,
} from "./protocol";

export interface CacheEvents {
    configUpdated: [config: AppConfig];
    reconnected: [];
}

// hit: false means nothing cached yet. speech: None means cached as "muted".
export type SpeechCacheLookup = { hit: false } | { hit: true; speech: Option<Uint8Array> };

export interface Cache extends EventEmitter<CacheEvents> {
    syncGuildIds: (guildIds: string[]) => Promise<Result<void, Error>>;
    addGuild: (guildId: string) => Promise<Result<void, Error>>;
    removeGuild: (guildId: string) => Promise<Result<void, Error>>;

    getSpeech: (userId: string, guildId: string, join: boolean) => Promise<Result<SpeechCacheLookup, Error>>;
    setSpeech: (
        userId: string,
        guildId: string,
        join: boolean,
        speech: Option<Uint8Array>,
    ) => Promise<Result<void, Error>>;
    close: () => Promise<void>;
}

const publishGuildEvent = (rdb: RedisClient, type: GuildEventType, guildId: string): Promise<number> => {
    const event: GuildEvent = { type, guildId };
    return rdb.publish(GUILDS_UPDATED_CHANNEL, JSON.stringify(event));
};

const speechCacheKey = (userId: string, guildId: string, join: boolean): string =>
    `${SPEECH_CACHE_PREFIX}:${userId}:${guildId}:${join ? "join" : "leave"}`;

const SPEECH_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

const newCache = (redisUrl: string) =>
    buildResultAsync<Cache>(async () => {
        if (redisUrl === "") {
            throw new Error("CACHE_CONNECTION_ERROR: REDIS_URL is empty.");
        }

        const rdb = new RedisClient(redisUrl);
        await rdb.connect();

        const subscriber = await rdb.duplicate();

        const emitter = new EventEmitter<CacheEvents>();

        subscriber.onconnect = () => emitter.emit("reconnected");
        subscriber.onclose = (error) => console.error(`cache: subscriber connection closed: ${error.message}`);

        await subscriber.subscribe(CONFIG_UPDATED_CHANNEL, (payload) => {
            emitter.emit("configUpdated", AppConfig.fromJSON(JSON.parse(payload)));
        });

        return Object.assign(emitter, {
            // Atomically replaces GUILD_IDS_KEY with guildIds via a temp-key swap. MULTI/EXEC
            // have no convenience methods on Bun's RedisClient yet, so this is raw commands.
            syncGuildIds: (guildIds: string[]) =>
                buildResultAsync(async () => {
                    if (guildIds.length === 0) {
                        await rdb.del(GUILD_IDS_KEY);
                        return;
                    }

                    const tmpKey = `${GUILD_IDS_KEY}:tmp`;

                    await rdb.send("MULTI", []);
                    await rdb.send("DEL", [tmpKey]);
                    await rdb.send("SADD", [tmpKey, ...guildIds]);
                    await rdb.send("RENAME", [tmpKey, GUILD_IDS_KEY]);
                    await rdb.send("EXEC", []);
                }),

            addGuild: (guildId: string) =>
                buildResultAsync(async () => {
                    await rdb.sadd(GUILD_IDS_KEY, guildId);
                    await publishGuildEvent(rdb, "join", guildId);
                }),

            removeGuild: (guildId: string) =>
                buildResultAsync(async () => {
                    await rdb.srem(GUILD_IDS_KEY, guildId);
                    await publishGuildEvent(rdb, "leave", guildId);
                }),

            getSpeech: (userId: string, guildId: string, join: boolean) =>
                buildResultAsync(async (): Promise<SpeechCacheLookup> => {
                    const key = speechCacheKey(userId, guildId, join);
                    const raw = await rdb.getBuffer(key);
                    if (raw === null) {
                        return { hit: false };
                    };

                    return { hit: true, speech: raw.length === 0 ? None<Uint8Array>() : Some(raw) };
                }),

            setSpeech: (userId: string, guildId: string, join: boolean, speech: Option<Uint8Array>) =>
                buildResultAsync(async () => {
                    const value = match(speech, { Some: (buf) => buf, None: () => new Uint8Array(0) });
                    await rdb.set(speechCacheKey(userId, guildId, join), value, "EX", SPEECH_CACHE_TTL_SECONDS);
                }),

            close: async () => {
                subscriber.close();
                rdb.close();
            },
        });
    });

export default {
    newCache,
};
