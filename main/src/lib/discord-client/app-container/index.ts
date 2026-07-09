import { Client } from "discord.js";
import { AppConfigStore } from "lib/config";
import { Database } from "lib/database";
import { Connection } from "lib/discord-client/voice-connection";
import { MicrosoftTTS } from "lib/microsoft-tts";
import { Option } from "resultant.js/rustify";

export type Connections = Map<string, Connection>;

export interface Container {
    config: AppConfigStore;
    client: Client<true>;
    tts: MicrosoftTTS;
    database: Option<Database>;
    connections: Connections;
}

const createContainer = (config: AppConfigStore, client: Client<true>, tts: MicrosoftTTS, database: Option<Database>, connections: Connections): Container => {
    return { config, client, tts, database, connections };
};

export default {
    createContainer
};