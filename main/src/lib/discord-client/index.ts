import { Client, GatewayIntentBits, Partials, type VoiceState } from "discord.js";
import type { State } from "lib/appstate";
import type { Cache } from "lib/cache";
import guildSync from "lib/discord-client/guild-sync";
import voiceStateUpdate from "lib/discord-client/voice-state-update";
import type { Connection, Connections } from "./voice-connection";

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

const listenGuildSync = (client: Client<true>, cache: Cache) => {
    client.on("guildCreate", guildSync.onGuildJoin(cache));
    client.on("guildDelete", guildSync.onGuildLeave(cache));
};

const listenVoiceStateUpdate = (client: Client<true>, state: State, connections: Connections) => {
    client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
        const ctx = voiceStateUpdate.createContext(client, state, connections, oldState, newState);
        voiceStateUpdate.handler(ctx);
    });
};

export interface DiscordClient {
    destroy: () => Promise<void>;
}

const newClient = async (token: string, state: State) => {
    const client = await createClient(token);

    const connections: Connections = new Map<string, Connection>();

    client.on("error", (err) => console.error(`discord-client: ${err.message}`));

    if (state.tts.isSome()) {
        listenVoiceStateUpdate(client, state, connections);
    }

    state.cache.map(async (cache) => {
        listenGuildSync(client, cache);
        await guildSync.syncGuilds(client, cache);
    });

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
