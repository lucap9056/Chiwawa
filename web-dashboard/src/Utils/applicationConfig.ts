/**
 * This file contains the structure for application configuration.
 * It defines interfaces and classes to represent the configuration settings for various components of the application,
 * such as the TTS engine, Discord bot, OAuth2 settings, API service, and database connection.
 */

interface TTSEngineConfig {
    region: string
    token: string
    defaultLanguage: string
}

class TTSEngineConfig {
    constructor(region: string, token: string, defaultLanguage: string) {

        Object.assign(this, {
            region, token, defaultLanguage,
            isEnabled: (region !== "" && token !== "")
        });

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
}

class DiscordOAuth2Config {
    constructor(clientId: string, clientSecret: string) {

        Object.assign(this, {
            clientId, clientSecret,
            isEnabled: (clientId !== "" && clientSecret !== "")
        });

    }
}

interface APIServiceConfig {
    port: string
    redirectUri: string
    sessionSecret: string
    oauth2: DiscordOAuth2Config
}

class APIServiceConfig {
    constructor(port: string, redirectUri: string, sessionSecret: string, oauth2?: DiscordOAuth2Config) {

        Object.assign(this, {
            port, redirectUri, sessionSecret, oauth2,
            isEnabled: (port !== "" && redirectUri !== "" && sessionSecret !== "")
        });

    }
}

interface DatabaseConnectionConfig {
    uri: string
}

class DatabaseConnectionConfig {
    constructor(uri: string) {

        Object.assign(this, {
            uri,
            isEnabled: uri !== ""
        });

    }
}

interface ApplicationConfig {
    adminIds: string[]
    discord: DiscordBotConfig
    database: DatabaseConnectionConfig
    api: APIServiceConfig
}

export default ApplicationConfig;

export {
    DatabaseConnectionConfig,
    DiscordOAuth2Config,
    APIServiceConfig,
    DiscordBotConfig,
    TTSEngineConfig
}