import type { Client } from "discord.js";
import type { State } from "lib/appstate";
import type { Connection } from "lib/discord-client/voice-connection";

export type Connections = Map<string, Connection>;

export interface Container {
    client: Client<true>;
    state: State;
    connections: Connections;
}

const createContainer = (client: Client<true>, state: State, connections: Connections): Container => ({
    client,
    state,
    connections,
});

export default {
    createContainer,
};
