import { Client, GatewayIntentBits, Partials, type VoiceState } from "discord.js";
import type { State } from "lib/appstate";
import appContainer, { type Container } from "lib/discord-client/app-container";
import voiceStateUpdate from "lib/discord-client/voice-state-update";
import type { Connection } from "./voice-connection";

const createClient = (token: string): Promise<Client<true>> => {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
        partials: [Partials.Channel],
    });

    return new Promise((resolve, reject) => {
        const loginTimeout = setTimeout(() => {
            reject(new Error("Discord client login timed out after 5 seconds."));
        }, 5000);

        client.once("clientReady", (readyClient) => {
            console.log(`discord-client: bot ready at ${new Date().toLocaleString()}`);
            clearTimeout(loginTimeout);
            resolve(readyClient);
        });

        client.login(token).catch((error: unknown) => {
            clearTimeout(loginTimeout);
            const errorMessage = error instanceof Error ? error.message : "";
            reject(new Error(`Failed to log in to Discord: ${errorMessage}`));
        });
    });
};

const listenVoiceStateUpdate = (container: Container) => {
    container.client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
        const ctx = voiceStateUpdate.createContext(container, oldState, newState);
        voiceStateUpdate.handler(ctx);
    });
};

export interface DiscordClient {
    destroy: () => Promise<void>;
}

const newClient = async (token: string, state: State) => {
    const client = await createClient(token);

    const connections = new Map<string, Connection>();

    client.on("error", (err) => console.error(`discord-client: ${err.message}`));

    if (state.tts.isSome()) {
        const container = appContainer.createContainer(client, state, connections);
        listenVoiceStateUpdate(container);
    }

    return {
        destroy: async (): Promise<void> => {
            for (const connection of connections.values()) {
                connection.destory();
            }
            await client.destroy();
        },
    };
};

export default {
    newClient,
};
