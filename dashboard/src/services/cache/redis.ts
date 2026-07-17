import type { RedisClient } from "bun";
import { buildResultAsync, type Result } from "resultant.js/rustify";
import type { AppConfig } from "#/models";
import { CONFIG_UPDATED_CHANNEL, GUILD_IDS_KEY, SPEECH_CACHE_PREFIX } from "./protocol";

export interface Cache {
    intersectGuildIds: (guildIds: string[]) => Promise<Result<string[], Error>>;
    delSpeech: (userId: string, guildIds: string[]) => Promise<Result<void, Error>>;
    saveConfig: (config: AppConfig) => Promise<Result<number, Error>>;
}

const publishConfigUpdated = (rdb: RedisClient, config: AppConfig): Promise<number> =>
    rdb.publish(CONFIG_UPDATED_CHANNEL, JSON.stringify(config));

const speechCacheKey = (userId: string, guildId: string, join: boolean): string =>
    `${SPEECH_CACHE_PREFIX}:${userId}:${guildId}:${join ? "join" : "leave"}`;

const newCache = (rdb: RedisClient) => ({
    intersectGuildIds: (guildIds: string[]) =>
        buildResultAsync(async (): Promise<string[]> => {
            if (guildIds.length === 0) return [];

            const flags = await rdb.smismember(GUILD_IDS_KEY, guildIds[0], ...guildIds.slice(1));
            return guildIds.filter((_, i) => flags[i] === 1);
        }),
    delSpeech: (userId: string, guildIds: string[]) =>
        buildResultAsync(async (): Promise<void> => {
            const keys = [];
            for (const guildId of guildIds) {
                keys.push(speechCacheKey(userId, guildId, true), speechCacheKey(userId, guildId, false));
            }
            await rdb.del(...keys);
        }),
    saveConfig: (config: AppConfig) => buildResultAsync(() => publishConfigUpdated(rdb, config)),
});

export default {
    newCache,
};
