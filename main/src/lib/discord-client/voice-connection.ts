import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import { GuildChannel } from "discord.js";
import { Readable } from "stream";

export class Connection {
    private files: Buffer[] = [];
    private audioPlayer: AudioPlayer;
    private connection: VoiceConnection;
    public readonly channel: GuildChannel;

    constructor(channel: GuildChannel) {
        this.channel = channel;

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        });

        this.connection = connection;
        this.audioPlayer = this.setAudioPlayer(connection);
    }

    private setAudioPlayer(connection: VoiceConnection): AudioPlayer {
        const audioPlayer = createAudioPlayer();

        connection.subscribe(audioPlayer);

        audioPlayer.on('stateChange', (oldState, newState) => {

            switch (oldState.status + newState.status) {
                case AudioPlayerStatus.Playing + AudioPlayerStatus.Idle:
                    this.playNext();
                    break;
            }
        });

        return audioPlayer;
    }

    public destory(): void {
        this.connection.destroy();
    }

    public disconnect(): void {
        this.connection.disconnect();
    }

    public push(fileBuffer: Buffer): void {

        this.files.push(fileBuffer);
        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
            this.playNext();
        }
    }

    private playNext(): void {
        const file = this.files.shift();

        if (file === undefined) return;
        const stream = Readable.from(file);
        const resource = createAudioResource(stream);

        this.audioPlayer.play(resource);

    }
}