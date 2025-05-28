import { Database } from "lib/database";
import { Client } from "discord.js";
import { AppConfig } from "/lib/config";

const getJoinedGuildIds = (client: Client) => client.guilds.cache.map(g => g.id);

const update = (client: Client, config: AppConfig, database: Database) => {
    const { defaultJoinSuffix, defaultLeaveSuffix, ttsDefaultVoiceModule } = config;
    const guildIds = getJoinedGuildIds(client);
    database.setAppInfo({
        defaultJoinSuffix,
        defaultLeaveSuffix,
        defaultVoiceModule: ttsDefaultVoiceModule,
        guildIds,
        id: "0"
    });
}


export default {
    update,
}