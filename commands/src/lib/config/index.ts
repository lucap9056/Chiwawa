export interface AppConfig {
    discordToken: string;
    databaseUrl: string;
}

const newConfig = (): AppConfig => {
    return {
        discordToken: process.env["APP_DISCORD_TOKEN"] || "",
        databaseUrl: process.env["DATABASE_URL"] || "",
    };
}

export default {
    newConfig
};