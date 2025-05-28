import { GuildChannel, GuildMember, VoiceBasedChannel, VoiceState } from "discord.js";
import { Container, Connections } from "lib/discord-client/app-container";
import { Connection } from "lib/discord-client/voice-connection";
import { generateMessages } from "lib/discord-client/voice-message";

const isEventFromSelf = (ctx: Context, member: GuildMember): boolean => ctx.client.user.id === member.user.id;

const getHumanMemberCount = (targetChannel: GuildChannel): number => {
    const humanMembers = targetChannel.members.filter(member => !member.user.bot);
    return humanMembers.size;
}

const hasHumanMembers = (targetChannel: GuildChannel) => getHumanMemberCount(targetChannel) > 0;

const isChannelMoved = (ctx: Context):
    ctx is Context & {
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
}

const getVoiceConnection = (connections: Connections, guildId: string): Connection | undefined => connections.get(guildId);

const removeVoiceConnection = (connections: Connections, guildId: string): void => {
    const conneciton = getVoiceConnection(connections, guildId);
    if (conneciton) {
        conneciton.destory();
        connections.delete(guildId);
    }
}

const isSelfInVoiceChannel = (ctx: Context, channel: GuildChannel) => channel.members.has(ctx.client.user.id);

const joinVoiceChannel = async (ctx: Context, channel: VoiceBasedChannel, member: GuildMember) => {
    const guildId = channel.guildId;
    const voiceConnection = getVoiceConnection(ctx.connections, guildId);

    if (voiceConnection) {
        if (voiceConnection.channel.id !== channel.id || getHumanMemberCount(channel) <= 1) return;

        const message = await generateMessages(ctx, member, true);
        if (!message) return;
        const speech = await ctx.tts.fetchSpeech(message);
        voiceConnection.push(speech);
    } else {

        if (getHumanMemberCount(channel) > 1) {
            const message = await generateMessages(ctx, member, true);

            if (!message) return;

            const speech = await ctx.tts.fetchSpeech(message);
            const connection = appendVoiceConnection(ctx.connections, channel);
            connection.push(speech);

        } else {
            appendVoiceConnection(ctx.connections, channel);
        }

    }


}

const moveVoiceChannel = async (ctx: Context, joinChannel: VoiceBasedChannel, leaveChannel: VoiceBasedChannel, member: GuildMember) => {
    const guildId = member.guild.id;
    const voiceConnection = getVoiceConnection(ctx.connections, guildId);

    if (voiceConnection) {

        if (isSelfInVoiceChannel(ctx, joinChannel) && getHumanMemberCount(joinChannel) > 1) {

            const message = await generateMessages(ctx, member, true);
            if (!message) return;

            const speech = await ctx.tts.fetchSpeech(message);
            voiceConnection.push(speech);
            return;

        }

        if (isSelfInVoiceChannel(ctx, leaveChannel)) {

            if (getHumanMemberCount(leaveChannel) === 0) {

                removeVoiceConnection(ctx.connections, guildId);

                if (getHumanMemberCount(joinChannel) > 1) {
                    const message = await generateMessages(ctx, member, true);
                    if (!message) return;

                    const speech = await ctx.tts.fetchSpeech(message);
                    const connection = appendVoiceConnection(ctx.connections, joinChannel);
                    connection.push(speech);
                    return;
                } else {
                    appendVoiceConnection(ctx.connections, joinChannel);
                }

            } else {

                const message = await generateMessages(ctx, member);
                if (!message) return;

                const speech = await ctx.tts.fetchSpeech(message);
                voiceConnection.push(speech);
                return;

            }

            return;
        }

    } else {

        const joinChannel = ctx.newState.channel;

        if (joinChannel) {

            if (getHumanMemberCount(joinChannel) > 1) {
                const message = await generateMessages(ctx, member, true);
                if (!message) return;

                const speech = await ctx.tts.fetchSpeech(message);
                const connection = appendVoiceConnection(ctx.connections, joinChannel);
                connection.push(speech);
            } else {
                appendVoiceConnection(ctx.connections, joinChannel);
            }

        }

    }
}

const leaveVoiceChannel = async (ctx: Context, channel: VoiceBasedChannel, member: GuildMember) => {
    const guildId = member.guild.id;
    const voiceConnection = getVoiceConnection(ctx.connections, guildId);

    if (voiceConnection) {

        if (voiceConnection.channel !== channel) return;

        if (hasHumanMembers(channel)) {

            const message = await generateMessages(ctx, member);
            if (!message) return;

            const speech = await ctx.tts.fetchSpeech(message);
            voiceConnection.push(speech);
        }
        else {
            removeVoiceConnection(ctx.connections, guildId);
        }

    } else {

        if (hasHumanMembers(channel)) {

            const message = await generateMessages(ctx, member);
            if (!message) return;

            const speech = await ctx.tts.fetchSpeech(message);
            const connection = appendVoiceConnection(ctx.connections, channel);
            connection.push(speech);
        }

    }

}

const getMember = ({ oldState, newState }: Context): GuildMember | null => newState.member || oldState.member;

const getGuild = ({ newState }: Context) => newState.guild;

const isEventFromBot = (member: GuildMember) => member.user.bot;

const handler = (ctx: Context) => {

    const member = getMember(ctx);
    const guild = getGuild(ctx);

    if (!member) return;

    if (isEventFromSelf(ctx, member)) {

        const { connections } = ctx;

        const voiceConnection = getVoiceConnection(connections, guild.id);

        if (isChannelMoved(ctx) && voiceConnection) {

            const channel = ctx.newState.channel;

            if (hasHumanMembers(channel)) appendVoiceConnection(connections, channel);
            else removeVoiceConnection(connections, guild.id);
        }

    }

    if (isEventFromBot(member)) return;

    /*
    const voiceConnection = getVoiceConnection(ctx.connections, guild.id);

    if (voiceConnection) {

        const voiceChannel = voiceConnection.channel;

        if (voiceChannel && isSelfInVoiceChannel(ctx, voiceChannel)) {
            removeVoiceConnection(ctx.connections, guild.id);

            if (hasHumanMembers(voiceChannel)) {
                appendVoiceConnection(ctx.connections, voiceChannel);
            }
        }
    }
    //*/

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

}

interface Context extends Container {
    oldState: VoiceState,
    newState: VoiceState
}

const createContext = (container: Container, oldState: VoiceState, newState: VoiceState): Context => {
    return { ...container, oldState, newState }
};

export default {
    createContext,
    handler
}