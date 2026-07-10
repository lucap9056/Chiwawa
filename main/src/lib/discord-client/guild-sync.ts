import type { Client, Guild } from "discord.js";
import type { Cache } from "lib/cache";

const getJoinedGuildIds = (client: Client<true>): string[] => client.guilds.cache.map((g) => g.id);

const logError = (action: string, err: Error): void => console.error(`guild-sync: failed to ${action}: ${err.message}`);

// Run once the client is ready (guild cache already populated), so the
// guild_ids set in Redis reflects reality even if guildCreate/guildDelete
// events were missed while the bot was offline.
const syncGuilds = async (client: Client<true>, cache: Cache): Promise<void> => {
    const joinedGuildIds = getJoinedGuildIds(client);
    const result = await cache.syncGuildIds(joinedGuildIds);
    result.mapErr((err) => logError("sync guild ids", err));
};

const onGuildJoin =
    (cache: Cache) =>
    async (guild: Guild): Promise<void> => {
        const result = await cache.addGuild(guild.id);
        result.mapErr((err) => logError(`add guild ${guild.id}`, err));
    };

const onGuildLeave =
    (cache: Cache) =>
    async (guild: Guild): Promise<void> => {
        const result = await cache.removeGuild(guild.id);
        result.mapErr((err) => logError(`remove guild ${guild.id}`, err));
    };

export default {
    syncGuilds,
    onGuildJoin,
    onGuildLeave,
};
