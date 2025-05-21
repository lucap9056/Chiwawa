import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

import App from "/app";
import ApplicationConfig, { TTSEngineConfig, DiscordBotConfig, DiscordOAuth2Config, APIServiceConfig, DatabaseConnectionConfig, DefaultMessages } from "lib/config";


function IsTTSEngineConfig(config: any): config is TTSEngineConfig {
    return typeof config.region === 'string' &&
        typeof config.token === 'string' &&
        typeof config.defaultLanguage === 'string';
}


function IsDefaultMessages(config: any): config is DefaultMessages {
    return typeof config.joinSuffix === 'string' &&
        typeof config.leaveSuffix === 'string';
}


function IsDiscordBotConfig(config: any): config is DiscordBotConfig {
    return typeof config.token === 'string' &&
        IsTTSEngineConfig(config.tts) &&
        IsDefaultMessages(config.defaultMessages);
}


function IsDiscordOAuth2Config(config: any): config is DiscordOAuth2Config {
    return typeof config.clientId === 'string' &&
        typeof config.clientSecret === 'string';
}


function IsAPIServiceConfig(config: any): config is APIServiceConfig {
    return typeof config.port === 'string' &&
        typeof config.redirectUri === 'string' &&
        typeof config.sessionSecret === 'string' &&
        IsDiscordOAuth2Config(config.oauth2);
}


function IsDatabaseConnectionConfig(config: any): config is DatabaseConnectionConfig {
    return typeof config.uri === 'string';
}


function IsApplicationConfig(config: any): config is ApplicationConfig {
    return Array.isArray(config.adminIds) &&
        config.adminIds.every((id: any) => typeof id === 'string') &&
        IsDiscordBotConfig(config.discord) &&
        IsDatabaseConnectionConfig(config.database) &&
        IsAPIServiceConfig(config.api);
}

export default async function POST_ROOT(req: Request, res: Response) {

    const { userId } = req.session;

    if (!userId) {
        return res.sendStatus(HttpStatusCode.Unauthorized);
    }

    const { config } = req.chiwawa;

    const newConfig = req.body;

    if (config.adminIds.includes(userId) && IsApplicationConfig(newConfig)) {

        config.Update(newConfig);

        return res.sendStatus(HttpStatusCode.Ok);
    }

    res.sendStatus(HttpStatusCode.Forbidden);
}
