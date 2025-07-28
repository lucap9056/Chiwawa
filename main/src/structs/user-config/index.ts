export interface MessageTemplate {
    prefix: string;
    content: string;
    suffix?: string;
    language?: string;
    voiceModel?: string;
}

export interface SpeechNotice {
    inheritGlobal: boolean;
    muted: boolean;
    joinMessage: MessageTemplate;
    leaveMessage: MessageTemplate;
}

export interface UserConfig {
    id: string;
    global: SpeechNotice;
    guilds: { [guildId: string]: SpeechNotice };
}