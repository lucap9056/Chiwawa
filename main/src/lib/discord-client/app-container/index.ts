import type { Client } from "discord.js";
import type { AppConfigStore } from "lib/config";
import type { Database } from "lib/database";
import type { Connection } from "lib/discord-client/voice-connection";
import type { MicrosoftTTS } from "lib/microsoft-tts";
import type { Option } from "resultant.js/rustify";

export type Connections = Map<string, Connection>;

export interface Container {
    config: AppConfigStore;
    client: Client<true>;
    tts: MicrosoftTTS;
    database: Option<Database>;
    connections: Connections;
}

const createContainer = (
    config: AppConfigStore,
    client: Client<true>,
    tts: MicrosoftTTS,
    database: Option<Database>,
    connections: Connections,
): Container => {
    return { config, client, tts, database, connections };
};

export default {
    createContainer,
};
