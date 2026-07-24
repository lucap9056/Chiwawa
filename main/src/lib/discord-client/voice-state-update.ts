import type { Client, GuildChannel, GuildMember, VoiceBasedChannel, VoiceState } from "discord.js";
import type { State } from "lib/appstate";
import { type Connection, type Connections, newConnection } from "lib/discord-client/voice-connection";
import { generateMessages } from "lib/discord-client/voice-message";
import { match, matchAsync, None, Option, Some } from "resultant.js/rustify";

export interface VoiceStateUpdateContext {
    client: Client<true>;
    appState: State;
    connections: Connections;
    oldState: VoiceState;
    newState: VoiceState;
}

const isEventFromSelf = (ctx: VoiceStateUpdateContext, member: GuildMember): boolean =>
    ctx.client.user.id === member.user.id;

const getHumanMemberCount = (targetChannel: GuildChannel): number => {
    const humanMembers = targetChannel.members.filter((member) => !member.user.bot);
    return humanMembers.size;
};

const hasHumanMembers = (targetChannel: GuildChannel) => getHumanMemberCount(targetChannel) > 0;

const isChannelMoved = (
    ctx: VoiceStateUpdateContext,
): ctx is VoiceStateUpdateContext & {
    oldState: { channel: VoiceBasedChannel };
    newState: { channel: VoiceBasedChannel };
} => {
    const { oldState, newState } = ctx;
    return !!newState.channel && !!oldState.channel && newState.channel.id !== oldState.channel.id;
};

const appendVoiceConnection = (connections: Connections, channel: GuildChannel): Connection => {
    const connection = newConnection(channel);
    connections.set(channel.guildId, connection);
    return connection;
};

const getVoiceConnection = (connections: Connections, guildId: string): Option<Connection> =>
    new Option(connections.get(guildId));

const removeVoiceConnection = (connections: Connections, guildId: string): void => {
    getVoiceConnection(connections, guildId).map((conneciton) => {
        conneciton.destory();
        connections.delete(guildId);
    });
};

const isSelfInVoiceChannel = (ctx: VoiceStateUpdateContext, channel: GuildChannel) =>
    channel.members.has(ctx.client.user.id);

const resolveSpeech = async (
    ctx: VoiceStateUpdateContext,
    member: GuildMember,
    join: boolean,
): Promise<Option<Uint8Array>> => {
    return matchAsync(generateMessages(ctx.appState, member, join), {
        None: async () => None<Uint8Array>(),
        Some: async (message) => {
            return match(ctx.appState.tts, {
                None: async () => None<Uint8Array>(),
                Some: async (tts) => {
                    return matchAsync(tts.fetchSpeech(message), {
                        Ok: (speech) => Some<Uint8Array>(speech),
                        Err: (err) => {
                            console.error(err);
                            return None<Uint8Array>();
                        },
                    });
                },
            });
        },
    });
};

const joinVoiceChannel = async (ctx: VoiceStateUpdateContext, channel: VoiceBasedChannel, member: GuildMember) => {
    match(getVoiceConnection(ctx.connections, channel.guildId), {
        async Some(voiceConnection) {
            if (voiceConnection.channel.id !== channel.id || getHumanMemberCount(channel) <= 1) return;

            const speech = await resolveSpeech(ctx, member, true);
            speech.map((buf) => voiceConnection.queue(buf));
        },

        async None() {
            if (getHumanMemberCount(channel) > 1) {
                const speech = await resolveSpeech(ctx, member, true);
                speech.map((buf) => {
                    const connection = appendVoiceConnection(ctx.connections, channel);
                    connection.queue(buf);
                });
            } else {
                appendVoiceConnection(ctx.connections, channel);
            }
        },
    });
};

const moveVoiceChannel = async (
    ctx: VoiceStateUpdateContext,
    joinChannel: VoiceBasedChannel,
    leaveChannel: VoiceBasedChannel,
    member: GuildMember,
) => {
    const guildId = member.guild.id;

    match(getVoiceConnection(ctx.connections, guildId), {
        async Some(connection) {
            if (isSelfInVoiceChannel(ctx, joinChannel) && getHumanMemberCount(joinChannel) > 1) {
                const speech = await resolveSpeech(ctx, member, true);
                speech.map((buf) => connection.queue(buf));
            }

            if (isSelfInVoiceChannel(ctx, leaveChannel)) {
                if (getHumanMemberCount(leaveChannel) === 0) {
                    removeVoiceConnection(ctx.connections, guildId);

                    if (getHumanMemberCount(joinChannel) > 1) {
                        const speech = await resolveSpeech(ctx, member, true);
                        speech.map((buf) => {
                            const connection = appendVoiceConnection(ctx.connections, joinChannel);
                            connection.queue(buf);
                        });

                        return;
                    } else {
                        appendVoiceConnection(ctx.connections, joinChannel);
                    }
                } else {
                    const speech = await resolveSpeech(ctx, member, false);
                    speech.map((buf) => connection.queue(buf));
                    return;
                }

                return;
            }
        },
        async None() {
            const joinChannel = ctx.newState.channel;
            if (joinChannel) {
                if (getHumanMemberCount(joinChannel) > 1) {
                    const speech = await resolveSpeech(ctx, member, true);
                    speech.map((buf) => {
                        const connection = appendVoiceConnection(ctx.connections, joinChannel);
                        connection.queue(buf);
                    });
                } else {
                    appendVoiceConnection(ctx.connections, joinChannel);
                }
            }
        },
    });
};

const leaveVoiceChannel = async (ctx: VoiceStateUpdateContext, channel: VoiceBasedChannel, member: GuildMember) => {
    const guildId = member.guild.id;

    match(getVoiceConnection(ctx.connections, guildId), {
        async Some(connection) {
            if (connection.channel !== channel) return;

            if (hasHumanMembers(channel)) {
                const speech = await resolveSpeech(ctx, member, false);
                speech.map((buf) => connection.queue(buf));
            } else {
                removeVoiceConnection(ctx.connections, guildId);
            }
        },

        async None() {
            if (hasHumanMembers(channel)) {
                const speech = await resolveSpeech(ctx, member, false);
                speech.map((buf) => {
                    const connection = appendVoiceConnection(ctx.connections, channel);
                    connection.queue(buf);
                });
            }
        },
    });
};

const getMember = ({ oldState, newState }: VoiceStateUpdateContext): Option<GuildMember> =>
    new Option(newState.member || oldState.member);

const getGuild = ({ newState }: VoiceStateUpdateContext) => newState.guild;

const isEventFromBot = (member: GuildMember) => member.user.bot;

const handler = (ctx: VoiceStateUpdateContext) => {
    const guild = getGuild(ctx);

    match(getMember(ctx), {
        Some(member) {
            if (isEventFromSelf(ctx, member)) {
                const { connections } = ctx;

                const voiceConnection = getVoiceConnection(connections, guild.id);

                if (isChannelMoved(ctx) && voiceConnection) {
                    const channel = ctx.newState.channel;

                    if (hasHumanMembers(channel)) {
                        appendVoiceConnection(connections, channel);
                    } else {
                        removeVoiceConnection(connections, guild.id);
                    }
                }
            }

            if (isEventFromBot(member)) return;
            const { newState, oldState } = ctx;

            if (newState.channel && oldState.channel) {
                if (newState.channel.id === oldState.channel.id) return;
                const joinChannel = newState.channel;
                const leaveChannel = oldState.channel;
                moveVoiceChannel(ctx, joinChannel, leaveChannel, member);
                return;
            }

            if (newState.channel) {
                joinVoiceChannel(ctx, newState.channel, member);
                return;
            }

            if (oldState.channel) {
                leaveVoiceChannel(ctx, oldState.channel, member);
                return;
            }
        },
        None() {},
    });
};

const createContext = (
    client: Client<true>,
    appState: State,
    connections: Connections,
    oldState: VoiceState,
    newState: VoiceState,
): VoiceStateUpdateContext => ({ client, appState, connections, oldState, newState });

export default {
    createContext,
    handler,
};
