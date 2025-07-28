const ADMINS = process.env["ADMINS"] || "";

export interface AppConfig {
    defaultJoinSuffix: string;
    defaultLeaveSuffix: string;
    defaultVoiceModel: string;
    ttsRegion: string;
    ttsApiKey: string;
    admins: string[]
}

export const createEmptyAppConfig = (): AppConfig => ({
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModel: "",
    ttsRegion: "",
    ttsApiKey: "",
    admins: ADMINS.split(/,/g)
});

