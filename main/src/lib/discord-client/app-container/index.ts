import { Client } from "discord.js";
import { AppConfig } from "structs/app-config";
import { Database } from "lib/database";
import { Connection } from "lib/discord-client/voice-connection";
import { MicrosoftTTS } from "lib/microsoft-tts";
import { Option } from "resultant.js/rustify";

export type Connections = Map<string, Connection>

export interface Container {
    config: AppConfig,
    client: Client<true>
    tts: MicrosoftTTS
    database: Option<Database>
    connections: Connections
}

const createContainer = (config: AppConfig, client: Client<true>, tts: MicrosoftTTS, database: Option<Database>, connections: Connections): Container => {
    return { config, client, tts, database, connections }
}

export default {
    createContainer
}