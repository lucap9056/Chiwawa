import type { AppConfig } from "models";

export interface Suffix {
    join: string;
    leave: string;
}

export interface AppConfigStore {
    snapshot: () => AppConfig;
    set: (config: AppConfig) => void;
    defaultSuffix: () => Suffix;
    tts: () => { region: string; apiKey: string; defaultVoiceModel: string };
    admins: () => string[];
}

const copyAppConfig = (config: AppConfig): AppConfig => ({ ...config, admins: [...config.admins] });

const createAppConfigStore = (initial: AppConfig): AppConfigStore => {
    let current: AppConfig = copyAppConfig(initial);
    return {
        snapshot: (): AppConfig => copyAppConfig(current),
        set: (config: AppConfig): void => {
            current = copyAppConfig(config);
        },
        defaultSuffix: (): Suffix => ({
            join: current.defaultJoinSuffix,
            leave: current.defaultLeaveSuffix,
        }),
        tts: (): { region: string; apiKey: string; defaultVoiceModel: string } => ({
            region: current.ttsRegion || "",
            apiKey: current.ttsApiKey || "",
            defaultVoiceModel: current.defaultVoiceModel,
        }),
        admins: (): string[] => [...current.admins],
    };
};

export const createEmptyAppConfig = (): AppConfig => ({
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModel: "",
    ttsRegion: "",
    ttsApiKey: "",
    admins: (process.env.ADMINS || "").split(/,/),
});

export interface RuntimeConfig {
    appConfig: AppConfigStore;
    discordToken: string;
    databaseUrl: string;
    redisUrl: string;
}

const loadConfig = (): RuntimeConfig => {
    return {
        appConfig: createAppConfigStore({
            defaultJoinSuffix: process.env.DEFAULT_JOIN_SUFFIX || "",
            defaultLeaveSuffix: process.env.DEFAULT_LEAVE_SUFFIX || "",
            defaultVoiceModel: process.env.DEFAULT_VOICE_MODEL || "",
            ttsRegion: process.env.TTS_REGION || "",
            ttsApiKey: process.env.TTS_API_KEY || "",
            admins: (process.env.ADMINS || "").split(/,/),
        }),
        //
        discordToken: process.env.APP_DISCORD_TOKEN || "",
        databaseUrl: process.env.DATABASE_URL || "",
        redisUrl: process.env.REDIS_URL || "",
    };
};

export default {
    loadConfig,
};
