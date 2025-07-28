export interface MessageTemplate {
    prefix: string;
    content: string;
    suffix?: string;
    language?: string;
    voiceModel?: string;
}

export const createEmptyMessage = (): MessageTemplate => ({
    prefix: "",
    content: "",
    suffix: ""
});

export interface SpeechNotice {
    inheritGlobal: boolean;
    muted: boolean;
    joinMessage: MessageTemplate;
    leaveMessage: MessageTemplate;
}

export const createEmptySpeechNotice = (inheritGlobal: boolean): SpeechNotice => ({
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
    global: createEmptySpeechNotice(false),
    guilds: {}
});