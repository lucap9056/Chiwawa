import { Client, GatewayIntentBits, Partials, VoiceState } from "discord.js";
import { AppRuntimeConfig } from "lib/config";
import { Database } from "lib/database";
import voiceStateUpdate from "lib/discord-client/voice-state-update";
import appContainer, { Container } from "lib/discord-client/app-container";
import appInfoUpdate from "lib/discord-client/app-info-update"
import { MicrosoftTTS } from "lib/microsoft-tts";
import { Option } from "resultant.js/rustify";
import { Connection } from "./voice-connection";


const createClient = (token: string): Promise<Client<true>> => {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildVoiceStates,
        ],
        partials: [
            Partials.Channel
        ]
    });

    return new Promise(async (resolve, reject) => {

        const loginTimeout = setTimeout(() => {
            reject(new Error("Discord client login timed out after 5 seconds."));
        }, 5000);

        client.once("ready", (readyClient) => {
            console.log(new Date().toLocaleString(), "Bot Ready");
            clearTimeout(loginTimeout);
            resolve(readyClient);
        });

        try {
            await client.login(token);
        }
        catch (error) {
            clearTimeout(loginTimeout);
            reject(new Error(`Failed to log in to Discord: ${(error as Error).message}`));
        }

    });
}

const listenJoinedGuildsUpdate = async (client: Client, database: Database): Promise<void> => {
    await client.guilds.fetch();
    const update = () => appInfoUpdate.update(client, database);
    client.on("guildCreate", update);
    client.on("guildDelete", update);
    update();
}

const listenVoiceStateUpdate = (container: Container) => {
    container.client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
        const ctx = voiceStateUpdate.createContext(container, oldState, newState);
        voiceStateUpdate.handler(ctx);
    });
}

export interface DiscordClient {
    destroy: () => Promise<void>
}

const newClient = async (config: AppRuntimeConfig, tts: Option<MicrosoftTTS>, database: Option<Database>) => {

    const client = await createClient(config.discordToken);

    const connections = new Map<string, Connection>();

    client.on("error", (err) => console.log(err));

    database.map((db) => {
        listenJoinedGuildsUpdate(client, db);
    });

    tts.map((t) => {
        const container = appContainer.createContainer(config, client, t, database, connections);
        listenVoiceStateUpdate(container);
    });

    return {
        destroy: async (): Promise<void> => {
            for (const connection of connections.values()) {
                connection.destory();
            }
            await client.destroy();
        }
    }
}

export default {
    newClient
}