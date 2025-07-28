import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import { GuildChannel } from "discord.js";
import { match, None, Option, Some } from "resultant.js/rustify";
import { Readable } from "stream";

export class Connection {

    private static createAudioPlayer(connection: VoiceConnection, playbackCompletedHandler: () => void): AudioPlayer {
        const audioPlayer = createAudioPlayer();

        connection.subscribe(audioPlayer);

        audioPlayer.on('stateChange', (oldState, newState) => {

            switch (oldState.status + newState.status) {
                case AudioPlayerStatus.Playing + AudioPlayerStatus.Idle:
                    playbackCompletedHandler();
                    break;
            }
        });

        return audioPlayer;
    }

    private queues: Buffer[] = [];
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
        this.audioPlayer = Connection.createAudioPlayer(connection, () => this.playNext());
    }

    public destory(): void {
        this.audioPlayer.stop();
        this.connection.destroy();
    }

    public disconnect(): void {
        this.audioPlayer.stop();
        this.connection.disconnect();
    }

    public queue(fileBuffer: Buffer) {
        const { queues } = this;

        queues.push(fileBuffer);

        const { state } = this.audioPlayer;

        if (state.status === AudioPlayerStatus.Idle) {
            this.playNext();
        }

    }

    private playNext() {
        const { audioPlayer, queues } = this;

        const fileBuffer = new Option(queues.shift());

        fileBuffer.map(Readable.from)
            .map(createAudioResource)
            .map((audioResource) => {
                audioPlayer.play(audioResource);
            });

    }

}