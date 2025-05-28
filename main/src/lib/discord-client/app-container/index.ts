import { Client } from "discord.js";
import { AppConfig } from "lib/config";
import { Database } from "lib/database";
import { Connection } from "lib/discord-client/voice-connection";
import { MicrosoftTTS } from "lib/microsoft-tts";

export type Connections = Map<string, Connection>

export interface Container {
    config: AppConfig,
    client: Client<true>
    tts: MicrosoftTTS
    database?: Database
    connections: Connections
}

const createContainer = (config: AppConfig, client: Client<true>, tts: MicrosoftTTS, database?: Database) => {
    const connections: Connections = new Map();
    return { config, client, tts, database, connections }
}

export default {
    createContainer
}