export interface AppInfo {
    id: "0"
    defaultJoinSuffix: string
    defaultLeaveSuffix: string
    defaultVoiceModule: string
    guildIds: string[]
}

export const createEmptyAppInfo = (): AppInfo => ({
    id: "0",
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModule: "",
    guildIds: []
});

export interface MessageTemplate {
    prefix: string;
    content: string;
    suffix?: string;
    language?: string;
    voice?: string;
}

export const createEmptyMessage = (): MessageTemplate => ({
    prefix: "",
    content: "",
});

export interface SpeechNotice {
    inheritGlobal: boolean;
    muted: boolean;
    joinMessage: MessageTemplate;
    leaveMessage: MessageTemplate;
}

export const createEmptySpeechNotice = (inheritGlobal: boolean = true): SpeechNotice => ({
    inheritGlobal,
    muted: false,
    joinMessage: createEmptyMessage(),
    leaveMessage: createEmptyMessage()
});

export interface UserConfig {
    id: string;
    global: SpeechNotice;
    guilds: { [guildId: string]: SpeechNotice };
}

export const createEmptyUserConfig = (userId: string): UserConfig => ({
    id: userId,
    global: createEmptySpeechNotice(),
    guilds: {}
});