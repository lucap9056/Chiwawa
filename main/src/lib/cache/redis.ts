import { EventEmitter } from "node:events";
import { RedisClient } from "bun";
import { AppConfig } from "models";
import { buildResult, type Result } from "resultant.js/rustify";
import { CONFIG_UPDATED_CHANNEL, GUILD_IDS_KEY, GUILDS_UPDATED_CHANNEL, type GuildEvent, type GuildEventType } from "./protocol";

export interface CacheEvents {
    configUpdated: [config: AppConfig];
    // Fires once per new connect of the subscriber connection, including the first —
    // listeners should re-read AppConfig from Postgres, since messages missed while
    // that connection was down are not replayed.
    reconnected: [];
}

export interface Cache extends EventEmitter<CacheEvents> {
    syncGuildIds: (guildIds: string[]) => Promise<Result<void, Error>>;
    addGuild: (guildId: string) => Promise<Result<void, Error>>;
    removeGuild: (guildId: string) => Promise<Result<void, Error>>;
    close: () => Promise<void>;
}

const publishGuildEvent = (rdb: RedisClient, type: GuildEventType, guildId: string): Promise<number> => {
    const event: GuildEvent = { type, guildId };
    return rdb.publish(GUILDS_UPDATED_CHANNEL, JSON.stringify(event));
};

const newCache = (redisUrl: string) =>
    buildResult<Cache>(async () => {
        if (redisUrl === "") {
            throw new Error("CACHE_CONNECTION_ERROR: REDIS_URL is empty.");
        }

        const rdb = new RedisClient(redisUrl);
        await rdb.connect();

        // Subscribing takes over a connection — Bun only allows ping/subscribe/unsubscribe
        // on it afterwards — so pub/sub gets its own duplicated connection.
        const subscriber = await rdb.duplicate();

        const emitter = new EventEmitter<CacheEvents>();

        // Fires on every connect, including the first — not just later reconnects.
        subscriber.onconnect = () => emitter.emit("reconnected");
        subscriber.onclose = (error) => console.error(`cache: subscriber connection closed: ${error.message}`);

        await subscriber.subscribe(CONFIG_UPDATED_CHANNEL, (payload) => {
            emitter.emit("configUpdated", AppConfig.fromJSON(JSON.parse(payload)));
        });

        return Object.assign(emitter, {
            // Atomically replaces GUILD_IDS_KEY with guildIds via a temp-key swap. MULTI/EXEC
            // have no convenience methods on Bun's RedisClient yet, so this is raw commands.
            syncGuildIds: (guildIds: string[]) =>
                buildResult(async () => {
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
                buildResult(async () => {
                    await rdb.sadd(GUILD_IDS_KEY, guildId);
                    await publishGuildEvent(rdb, "join", guildId);
                }),

            removeGuild: (guildId: string) =>
                buildResult(async () => {
                    await rdb.srem(GUILD_IDS_KEY, guildId);
                    await publishGuildEvent(rdb, "leave", guildId);
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
