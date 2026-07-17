import type { AppConfig } from "models";

export interface RuntimeConfig {
    appConfig: AppConfig;
    discordToken: string;
    databaseUrl: string;
    redisUrl: string;
}

const loadConfig = (): RuntimeConfig => {
    return {
        appConfig: {
            defaultJoinSuffix: process.env.DEFAULT_JOIN_SUFFIX || "",
            defaultLeaveSuffix: process.env.DEFAULT_LEAVE_SUFFIX || "",
            defaultVoiceModel: process.env.DEFAULT_VOICE_MODEL || "",
            ttsRegion: process.env.TTS_REGION || "",
            ttsApiKey: process.env.TTS_APIKEY || "",
            admins: (process.env.ADMINS || "").split(/,/),
        },
        //
        discordToken: process.env.APP_DISCORD_TOKEN || "",
        databaseUrl: process.env.DATABASE_URL || "",
        redisUrl: process.env.REDIS_URL || "",
    };
};

export default {
    loadConfig,
};
