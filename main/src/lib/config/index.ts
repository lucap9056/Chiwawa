export interface AppConfig {
    discordToken: string;
    defaultJoinSuffix: string;
    defaultLeaveSuffix: string;
    ttsRegin: string;
    ttsToken: string;
    ttsDefaultVoiceModule: string;
    databaseUrl: string;
}

const newConfig = (): AppConfig => {
    return {
        discordToken: process.env["APP_DISCORD_TOKEN"] || "",
        defaultJoinSuffix: process.env["DEFAULT_JOIN_SUFFUX"] || "",
        defaultLeaveSuffix: process.env["DEFAULT_LEAVE_SUFFIX"] || "",
        ttsRegin: process.env["TTS_REGIN"] || "",
        ttsToken: process.env["TTS_TOKEN"] || "",
        ttsDefaultVoiceModule: process.env["TTS_DEFAULT_VOICE_MODULE"] || "",
        databaseUrl: process.env["DATABASE_URL"] || "",
    };
}

export default {
    newConfig
};