export interface AppInfo {
    id: "0"
    defaultJoinSuffix: string
    defaultLeaveSuffix: string
    defaultVoiceModule: string
    guildIds: string[]
}

export interface MessageTemplate {
    prefix: string;
    content: string;
    suffix?: string;
    language?: string;
    voice?: string;
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