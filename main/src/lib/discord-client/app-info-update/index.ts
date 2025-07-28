import { Database } from "lib/database";
import { Client } from "discord.js";

const getJoinedGuildIds = (client: Client) => client.guilds.cache.map(g => g.id);

const update = (client: Client, database: Database) => {
    const guildIds = getJoinedGuildIds(client);
    database.setGuildIds(guildIds);
}


export default {
    update,
}