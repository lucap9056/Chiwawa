import type { RedisClient } from "bun";
import { buildResult, type Result } from "resultant.js/rustify";
import type { AppConfig } from "#/models";
import { CONFIG_UPDATED_CHANNEL, GUILD_IDS_KEY } from "./protocol";

export interface Cache {
    intersectGuildIds: (guildIds: string[]) => Promise<Result<string[], Error>>;
    saveConfig: (config: AppConfig) => Promise<Result<number, Error>>;
}

const publishConfigUpdated = (rdb: RedisClient, config: AppConfig): Promise<number> =>
    rdb.publish(CONFIG_UPDATED_CHANNEL, JSON.stringify(config));

const newCache = (rdb: RedisClient) => ({
    intersectGuildIds: (guildIds: string[]) =>
        buildResult(async (): Promise<string[]> => {
            if (guildIds.length === 0) return [];

            const flags = await rdb.smismember(GUILD_IDS_KEY, guildIds[0], ...guildIds.slice(1));
            return guildIds.filter((_, i) => flags[i] === 1);
        }),
    saveConfig: (config: AppConfig) => buildResult(() => publishConfigUpdated(rdb, config)),
});

export default {
    newCache,
};
