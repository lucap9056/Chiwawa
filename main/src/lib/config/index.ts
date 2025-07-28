import { AppConfig } from "structs/app-config";

export interface AppRuntimeConfig extends AppConfig {
    discordToken: string;
    databaseUrl: string;
}

const loadConfig = (): AppRuntimeConfig => {
    return {
        defaultJoinSuffix: process.env["DEFAULT_JOIN_SUFFUX"] || "",
        defaultLeaveSuffix: process.env["DEFAULT_LEAVE_SUFFIX"] || "",
        defaultVoiceModel: process.env["DEFAULT_VOICE_MODEL"] || "",
        ttsRegion: process.env["TTS_REGION"] || "",
        ttsApiKey: process.env["TTS_API_KEY"] || "",
        admins: (process.env["ADMINS"] || "").split(/,/),
        //
        discordToken: process.env["APP_DISCORD_TOKEN"] || "",
        databaseUrl: process.env["DATABASE_URL"] || "",
    };
}

export default {
    loadConfig
};