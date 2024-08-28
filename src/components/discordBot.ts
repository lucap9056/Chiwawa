import { AudioPlayer, VoiceConnection, createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } from "@discordjs/voice";
import { ActivityType, Client, GatewayIntentBits, GuildChannel, GuildMember, Message, Partials, User, VoiceState } from "discord.js";
import { Readable } from "stream";

import MicrosiftTTS, { TTSMessage } from "@components/microsoftTTS";
import MongoDB, { MessageTemplate } from "@components/database";
import Config from "@components/config";

interface TTSMessages {
    join: TTSMessage
    leave: TTSMessage
}

interface BotAuth {
    code: string
    user: User
    message: Message
    expired_in: number
}

class BotAuth {
    constructor(code: string, user: User, message: Message) {
        this.code = code;
        this.user = user;
        this.message = message;
        const currentTime = new Date().getTime();
        this.expired_in = currentTime + 30 * 1000;
    }
}

class BotAuths {
    private auths: Map<string, BotAuth> = new Map();

    constructor() {
        setInterval(() => {
            const currentTime = new Date().getTime();
            this.auths.forEach((auth, code, auths) => {
                if (currentTime > auth.expired_in) {
                    auth.message.delete();
                    auths.delete(code);
                }
            });
        }, 5000);
    }

    public Add(code: string, user: User, message: Message): void {
        const auth = new BotAuth(code, user, message);

        this.auths.set(code, auth);
    }

    public Authorize(code: string): BotAuth | undefined {
        const auth = this.auths.get(code);
        if (auth) {
            auth.message.delete();
            this.auths.delete(code);
            return auth;
        }
        return;
    }
}

class Bot extends Client {

    public static ChannelHumanCount(channel: GuildChannel): number {
        const humans = channel.members.filter(member => !member.user.bot);
        return humans.size;
    }

    public readonly tts: MicrosiftTTS;
    public readonly auths: BotAuths;
    private config: Config;
    private mongoDB?: MongoDB;

    constructor(config: Config, mongoDB?: MongoDB) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages
            ],
            partials: [
                Partials.Channel
            ]
        });

        this.auths = new BotAuths();
        this.config = config;
        this.mongoDB = mongoDB;

        this.on("ready", async () => {
            console.log("Bot Ready");
            await this.guilds.fetch();
        });

        this.on("error", (err) => {
            console.log(err);
        });

        this.tts = new MicrosiftTTS(config.discord.tts);

        if (config.api.isEnabled && !config.api.oauth2.isEnabled) {
            this.on("messageCreate", async (message) => {

                const { content } = message;
                const { user } = this;

                if (!user || content.trim().replace(/\!/g, '') !== `<@${user.id}>`) {
                    return;
                }

                const code = crypto.randomUUID();

                const redirectUrl = this.config.api.redirectUri + `?code=${code}`;
                message.channel.send(redirectUrl).then((msg) => {

                    this.auths.Add(code, message.author, msg);

                });

            });
        }

        if (config.discord.tts.region && config.discord.tts.token) {
            this.on('voiceStateUpdate', this.VoiceStateUpdate);
        }

        this.login(config.discord.token);
    }

    private async VoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {

        const member = newState.member || oldState.member;

        if (!member) return;

        if (this.user && this.user.id === member.user.id) {

            const guildId = newState.guild.id;
            const voiceConnect = this.connections.get(guildId);

            if (newState.channel && oldState.channel && voiceConnect) {
                const channel = newState.channel;

                this.RemoveConnection(guildId);

                if (Bot.ChannelHumanCount(channel) > 0) {
                    const connection = new Connection(channel);
                    this.connections.set(guildId, connection);
                }
            }

        }

        if (member.user.bot) return;

        this.RejoinDisconnectedChannel(newState.guild.id);

        if (newState.channel && oldState.channel) {
            if (newState.channel.id === oldState.channel.id) {
                return;
            }
            this.MoveChannel(newState.channel, oldState.channel, member);
            return;
        }

        if (newState.channel) {
            this.JoinChannel(newState.channel, member);
            return;
        }

        if (oldState.channel) {
            this.LeaveChannel(oldState.channel, member);
            return;
        }
    }

    private RejoinDisconnectedChannel(guildId: string) {

        const { user, connections } = this;
        const voiceConnect = connections.get(guildId);
        if (voiceConnect) {
            const channel = voiceConnect.Channel;
            if (!channel.members.has(user!.id)) {

                this.RemoveConnection(guildId);

                if (Bot.ChannelHumanCount(channel) > 0) {
                    this.AddConnection(channel);
                }
            }
        }
    }

    public get joinedGuildIds(): string[] {
        return this.guilds.cache.map(guild => guild.id);
    }

    private async GenerateMessages(member: GuildMember): Promise<TTSMessages | undefined> {

        const { mongoDB, tts, config } = this;

        const guildId = member.guild.id;
        const memberName = member.nickname || member.user.globalName || member.user.displayName;
        const defaultSuffix = config.discord.defaultMessages;

        if (mongoDB) {
            const user = await mongoDB.user.Get(member.user.id);

            if (user) {

                const guildNotification = user.guildSettings[guildId];

                const notification = (!guildNotification || guildNotification.inheritGlobal) ?
                    user.globalSettings : guildNotification;

                if (notification.muted) {
                    return;
                }

                const joinMessage = new MessageTemplate(notification.joinMessage)
                    .ToString(memberName, defaultSuffix.joinSuffix);

                const leaveMessage = new MessageTemplate(notification.leaveMessage)
                    .ToString(memberName, defaultSuffix.leaveSuffix, notification.joinMessage);

                return {
                    join: joinMessage,
                    leave: leaveMessage
                }
            }
        }
        //*/

        const content = memberName.replace(/:.*/, "");

        const voice = memberName.replace(/.*:|\.$/g, '');

        const language = voice.replace(/[0-9a-zA-Z]*$/, "").replace(/-$/, "");
        const voiceActor = voice.replace(/.*-/g, "");

        const suffix = !/\.$/.test(memberName);

        const message = { content, language, voiceActor };

        const messages: TTSMessages = {
            join: Object.assign({}, message),
            leave: Object.assign({}, message)
        }

        if (suffix) {
            messages.join.content += defaultSuffix.joinSuffix;
            messages.leave.content += defaultSuffix.leaveSuffix;
        }

        return messages;

    }

    private connections: Map<string, Connection> = new Map();

    private RemoveConnection(guildId: string): void {
        const connection = this.connections.get(guildId);

        if (connection) {
            connection.Destory();
            this.connections.delete(guildId);
        }
    }

    private AddConnection(channel: GuildChannel): Connection {
        const connection = new Connection(channel);
        this.connections.set(channel.guildId, connection);
        return connection;
    }

    private async JoinChannel(channel: GuildChannel, member: GuildMember): Promise<void> {

        const guildId = channel.guild.id;

        const connection = this.connections.get(guildId);

        if (connection) {
            if (connection.Channel.id !== channel.id) return;

            if (Bot.ChannelHumanCount(channel) > 1) {
                const messages = await this.GenerateMessages(member);
                if (!messages) {
                    return;
                }
                const speech = await this.tts.fetch(messages.join);
                connection.Push(speech);
            }
        } else {

            if (Bot.ChannelHumanCount(channel) > 1) {
                const messages = await this.GenerateMessages(member);
                if (!messages) {
                    return;
                }
                const speech = await this.tts.fetch(messages.join);
                this.AddConnection(channel).Push(speech);
            } else {
                this.AddConnection(channel);
            }

        }
    }

    private async LeaveChannel(channel: GuildChannel, member: GuildMember): Promise<void> {

        const guildId = channel.guild.id;

        const connection = this.connections.get(channel.guild.id)

        if (connection) {
            if (connection.Channel !== channel) return;

            if (Bot.ChannelHumanCount(channel) > 0) {
                const messages = await this.GenerateMessages(member);
                if (!messages) {
                    return;
                }
                const speech = await this.tts.fetch(messages.leave);
                connection.Push(speech);
            }
            else {
                this.RemoveConnection(guildId);
            }
        } else {
            if (Bot.ChannelHumanCount(channel) > 0) {
                const messages = await this.GenerateMessages(member);
                if (!messages) {
                    return;
                }
                const speech = await this.tts.fetch(messages.leave);
                this.AddConnection(channel).Push(speech);
            }
        }

    }

    private async MoveChannel(newChannel: GuildChannel, oldChannel: GuildChannel, member: GuildMember): Promise<void> {
        const guildId = newChannel.guildId;
        const connection = this.connections.get(guildId);

        if (connection) {

            if (connection.Channel.id === newChannel.id && Bot.ChannelHumanCount(newChannel) > 0) {

                const messages = await this.GenerateMessages(member);
                if (!messages) {
                    return;
                }
                const speech = await this.tts.fetch(messages.join);
                connection.Push(speech);
                return;
            }

            if (connection.Channel.id === oldChannel.id) {
                if (Bot.ChannelHumanCount(oldChannel) === 0) {
                    this.RemoveConnection(guildId);

                    if (Bot.ChannelHumanCount(newChannel) > 1) {
                        const messages = await this.GenerateMessages(member);
                        if (!messages) {
                            return;
                        }
                        const speech = await this.tts.fetch(messages.join);
                        this.AddConnection(newChannel).Push(speech);
                    } else {
                        this.AddConnection(newChannel);
                    }

                } else {
                    const messages = await this.GenerateMessages(member);
                    if (!messages) {
                        return;
                    }
                    const speech = await this.tts.fetch(messages.leave);
                    connection.Push(speech);
                }
                return;
            }


        } else {

            if (Bot.ChannelHumanCount(newChannel) > 1) {
                const messages = await this.GenerateMessages(member);
                if (!messages) {
                    return;
                }
                const speech = await this.tts.fetch(messages.join);
                this.AddConnection(newChannel).Push(speech);
            }
            else {
                this.AddConnection(newChannel);
            }

        }
    }

    public Destroy(): Promise<void> {
        return this.destroy();
    }
}

class Connection {
    private files: Buffer[] = [];
    private channel: GuildChannel;
    private audioPlayer: AudioPlayer;
    private connection: VoiceConnection;

    constructor(channel: GuildChannel) {
        this.channel = channel;
        const guildId = channel.guild.id;

        const connection = joinVoiceChannel({
            channelId: this.channel.id,
            guildId: guildId,
            adapterCreator: this.channel.guild.voiceAdapterCreator
        });

        this.connection = connection;
        this.audioPlayer = this.SetAudioPlayer(connection);
    }

    private SetAudioPlayer(connection: VoiceConnection): AudioPlayer {
        const audioPlayer = createAudioPlayer();

        connection.subscribe(audioPlayer);

        audioPlayer.on('stateChange', (oldState, newState) => {

            switch (oldState.status + newState.status) {
                case AudioPlayerStatus.Playing + AudioPlayerStatus.Idle:
                    this.PlayNext();
                    break;
            }
        });

        return audioPlayer;
    }

    public Destory(): void {
        this.connection.destroy();
    }

    public Disconnect(): void {
        this.connection.disconnect();
    }

    public Push(fileBuffer: Buffer): void {

        this.files.push(fileBuffer);
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
            this.PlayNext();
        }
    }

    private PlayNext(): void {
        const file = this.files.shift();

        if (file === undefined) return;
        const stream = Readable.from(file);
        const resource = createAudioResource(stream);

        this.audioPlayer.play(resource);

    }

    public get Channel(): GuildChannel {
        return this.channel;
    }
}

export default Bot;

export {
    Connection
}