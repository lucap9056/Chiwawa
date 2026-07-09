import { Client } from "discord.js";
import { Database } from "lib/database";

const getJoinedGuildIds = (client: Client) => client.guilds.cache.map(g => g.id);

const update = (client: Client, database: Database) => {
    const guildIds = getJoinedGuildIds(client);
    database.setGuildIds(guildIds);
};


export default {
    update,
};