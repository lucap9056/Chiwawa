import type { Client, GuildChannel, GuildMember, VoiceBasedChannel, VoiceState } from "discord.js";
import type { State } from "lib/appstate";
import { Connection, type Connections } from "lib/discord-client/voice-connection";
import { generateMessages } from "lib/discord-client/voice-message";
import { match, Option } from "resultant.js/rustify";

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
    const connection = new Connection(channel);
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

// Generates the message for member/join, then speaks it on an already-joined
// connection — a no-op if there's no TTS client or the member is muted.
const announce = async (
    ctx: VoiceStateUpdateContext,
    connection: Connection,
    member: GuildMember,
    join: boolean = false,
): Promise<void> => {
    const message = await generateMessages(ctx.appState, member, join);
    await message.map(async (msg) => {
        await ctx.appState.tts.map(async (tts) => {
            const speech = await tts.fetchSpeech(msg);
            connection.queue(speech);
        });
    });
};

const joinVoiceChannel = async (ctx: VoiceStateUpdateContext, channel: VoiceBasedChannel, member: GuildMember) => {
    match(getVoiceConnection(ctx.connections, channel.guildId), {
        async Some(voiceConnection) {
            if (voiceConnection.channel.id !== channel.id || getHumanMemberCount(channel) <= 1) return;

            await announce(ctx, voiceConnection, member, true);
        },

        async None() {
            if (getHumanMemberCount(channel) > 1) {
                const message = await generateMessages(ctx.appState, member, true);

                await message.map(async (value) => {
                    await ctx.appState.tts.map(async (tts) => {
                        const speech = await tts.fetchSpeech(value);
                        const connection = appendVoiceConnection(ctx.connections, channel);
                        connection.queue(speech);
                    });
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
                await announce(ctx, connection, member, true);
            }

            if (isSelfInVoiceChannel(ctx, leaveChannel)) {
                if (getHumanMemberCount(leaveChannel) === 0) {
                    removeVoiceConnection(ctx.connections, guildId);

                    if (getHumanMemberCount(joinChannel) > 1) {
                        const message = await generateMessages(ctx.appState, member, true);

                        await message.map(async (value) => {
                            await ctx.appState.tts.map(async (tts) => {
                                const speech = await tts.fetchSpeech(value);
                                const connection = appendVoiceConnection(ctx.connections, joinChannel);
                                connection.queue(speech);
                            });
                        });

                        return;
                    } else {
                        appendVoiceConnection(ctx.connections, joinChannel);
                    }
                } else {
                    await announce(ctx, connection, member);
                    return;
                }

                return;
            }
        },
        async None() {
            const joinChannel = ctx.newState.channel;
            if (joinChannel) {
                if (getHumanMemberCount(joinChannel) > 1) {
                    const message = await generateMessages(ctx.appState, member, true);

                    await message.map(async (value) => {
                        await ctx.appState.tts.map(async (tts) => {
                            const speech = await tts.fetchSpeech(value);
                            const connection = appendVoiceConnection(ctx.connections, joinChannel);
                            connection.queue(speech);
                        });
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
                await announce(ctx, connection, member);
            } else {
                removeVoiceConnection(ctx.connections, guildId);
            }
        },

        async None() {
            if (hasHumanMembers(channel)) {
                const message = await generateMessages(ctx.appState, member);

                await message.map(async (value) => {
                    await ctx.appState.tts.map(async (tts) => {
                        const speech = await tts.fetchSpeech(value);
                        const connection = appendVoiceConnection(ctx.connections, channel);
                        connection.queue(speech);
                    });
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
