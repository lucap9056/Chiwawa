import fs from "fs";
import path from "path";

interface TTSEngineConfig {
    region: string
    token: string
    defaultLanguage: string
    isEnabled: boolean
}

class TTSEngineConfig {
    constructor(region: string, token: string, defaultLanguage: string) {

        Object.assign(this, {
            region, token, defaultLanguage,
            isEnabled: (region !== "" && token !== "")
        });

    }

    public get enabled(): boolean {
        return (this.region !== "" && this.token !== "")
    }
}

interface DefaultMessages {
    joinSuffix: string
    leaveSuffix: string
}

interface DiscordBotConfig {
    token: string
    tts: TTSEngineConfig
    defaultMessages: DefaultMessages
}

class DiscordBotConfig {
    constructor(token: string, defaultMessages: DefaultMessages, tts: TTSEngineConfig) {
        Object.assign(this, {
            token, tts, defaultMessages: {
                joinSuffix: defaultMessages.joinSuffix,
                leaveSuffix: defaultMessages.leaveSuffix
            }
        });
    }
}

interface DiscordOAuth2Config {
    clientId: string
    clientSecret: string
    isEnabled: boolean
}

class DiscordOAuth2Config {
    constructor(clientId: string, clientSecret: string) {

        Object.assign(this, {
            clientId, clientSecret,
            isEnabled: (clientId !== "" && clientSecret !== "")
        });

    }

    public get enabled(): boolean {
        return (this.clientId !== "" && this.clientSecret !== "")
    }
}

interface APIServiceConfig {
    port: string
    redirectUri: string
    sessionSecret: string
    oauth2: DiscordOAuth2Config
    isEnabled: boolean
}

class APIServiceConfig {
    constructor(port: string, redirectUri: string, sessionSecret: string, oauth2?: DiscordOAuth2Config) {

        Object.assign(this, {
            port, redirectUri, sessionSecret, oauth2,
            isEnabled: (port !== "" && redirectUri !== "" && sessionSecret !== "")
        });

    }

    public get enabled(): boolean {
        return (this.port !== "" && this.redirectUri !== "" && this.sessionSecret !== "")
    }
}

interface DatabaseConnectionConfig {
    uri: string
    isEnabled: boolean
}

class DatabaseConnectionConfig {
    constructor(uri: string) {

        Object.assign(this, {
            uri,
            isEnabled: uri !== ""
        });

    }

    public get enabled(): boolean {
        return this.uri !== "";
    }
}

interface ApplicationConfig {
    adminIds: string[]
    discord: DiscordBotConfig
    database: DatabaseConnectionConfig
    api: APIServiceConfig
}

class ApplicationConfig {
    private configPath: string;

    constructor() {

        const configPath = process.env.CONFIG || path.join(process.cwd(), "config.json");
        this.configPath = configPath;

        let jsonConfig: ApplicationConfig;;

        try {
            jsonConfig = require(configPath);
        } catch {
            jsonConfig = {} as ApplicationConfig;
        }

        const config = this.LoadConfig(jsonConfig);

        Object.assign(this, config);

        if (!jsonConfig.adminIds) {
            this.WriteConfig();
        }

        this.database.isEnabled = this.database.enabled;

        this.discord.tts.isEnabled = this.discord.tts.enabled;

        this.api.isEnabled = this.api.enabled;

        this.api.oauth2.isEnabled = this.api.oauth2.enabled;

    }

    private LoadConfig(cfg: ApplicationConfig): any {
        return {
            adminIds: cfg.adminIds || (process.env.ADMINS || "").split(/,/),
            discord: new DiscordBotConfig(
                cfg.discord?.token || process.env.DISCORD_TOKEN || "",
                {
                    joinSuffix: cfg.discord?.defaultMessages?.joinSuffix || process.env.JOIN_SUFFIX || "joined the channel",
                    leaveSuffix: cfg.discord?.defaultMessages?.leaveSuffix || process.env.LEAVE_SUFFIX || "leaved the channel"
                },
                new TTSEngineConfig(
                    cfg.discord?.tts?.region || process.env.TTS_REGION || "",
                    cfg.discord?.tts?.token || process.env.TTS_TOKEN || "",
                    cfg.discord?.tts?.defaultLanguage || process.env.TTS_DEFAULT_LANGUAGE || "en-US"
                )
            ),
            database: new DatabaseConnectionConfig(
                cfg.database?.uri || process.env.DATABASE_URI || ""
            ),
            api: new APIServiceConfig(
                cfg.api?.port || process.env.API_PORT || "80",
                cfg.api?.redirectUri || process.env.API_REDIRECT_URI || "",
                cfg.api?.sessionSecret || process.env.API_SECRET || "",
                new DiscordOAuth2Config(
                    cfg.api?.oauth2?.clientId || process.env.APP_ID || "",
                    cfg.api?.oauth2?.clientSecret || process.env.APP_SECRET || ""
                )
            )
        };
    }

    private WriteConfig(): void {
        const replacer = (key: string, value: any) => {
            switch (key) {
                case "configPath":
                case "isEnabled":
                    return undefined;
            }
            return value;
        };

        const configStr = JSON.stringify(this, replacer, 2);
        fs.writeFileSync(this.configPath, configStr);
    }

    public Update(cfg: ApplicationConfig): void {
        const config = this.LoadConfig(cfg);
        Object.assign(this, config);
        this.WriteConfig();

        this.database.isEnabled = this.database.enabled;

        this.discord.tts.isEnabled = this.discord.tts.enabled;

        this.api.isEnabled = this.api.enabled;

        this.api.oauth2.isEnabled = this.api.oauth2.enabled;
    }
}

export default ApplicationConfig;

export {
    DatabaseConnectionConfig,
    APIServiceConfig,
    DiscordOAuth2Config,
    DiscordBotConfig,
    TTSEngineConfig,
    DefaultMessages
}