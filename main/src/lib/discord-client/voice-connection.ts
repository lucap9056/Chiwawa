import { Readable } from "node:stream";
import {
    type AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    type VoiceConnection,
} from "@discordjs/voice";
import type { GuildChannel } from "discord.js";
import { Option } from "resultant.js/rustify";

export interface Connection {
    readonly channel: GuildChannel;
    queue: (fileBuffer: Buffer) => void;
    disconnect: () => void;
    destory: () => void;
}

export type Connections = Map<string, Connection>;


const createVoiceAudioPlayer = (connection: VoiceConnection, playbackCompletedHandler: () => void): AudioPlayer => {
    const audioPlayer = createAudioPlayer();

    connection.subscribe(audioPlayer);

    audioPlayer.on("stateChange", (oldState, newState) => {
        switch (oldState.status + newState.status) {
            case AudioPlayerStatus.Playing + AudioPlayerStatus.Idle:
                playbackCompletedHandler();
                break;
        }
    });

    return audioPlayer;
};

export const newConnection = (channel: GuildChannel): Connection => {
    const queues: Buffer[] = [];

    const voiceConnection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // playNext is only invoked after audioPlayer below is assigned (either via the
    // stateChange listener or from queue()), so referencing it here ahead of its
    // declaration is safe despite the apparent temporal ordering.
    const playNext = (): void => {
        const fileBuffer = new Option(queues.shift());

        fileBuffer
            .map(Readable.from)
            .map(createAudioResource)
            .map((audioResource) => {
                audioPlayer.play(audioResource);
            });
    };

    const audioPlayer = createVoiceAudioPlayer(voiceConnection, playNext);

    return {
        channel,
        queue: (fileBuffer: Buffer): void => {
            queues.push(fileBuffer);

            if (audioPlayer.state.status === AudioPlayerStatus.Idle) {
                playNext();
            }
        },
        disconnect: (): void => {
            audioPlayer.stop();
            voiceConnection.disconnect();
        },
        destory: (): void => {
            audioPlayer.stop();
            voiceConnection.destroy();
        },
    };
};
