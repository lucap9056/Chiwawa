import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

import AppManager from "@src/components/appManager";

import OAuth2, { User } from "@src/api/discordAPI";

import { UserChiwawaData, AdminChiwawaData } from "./userData";


export default async function GET_INFO(req: Request, res: Response) {
    const { userId, userToken } = req.session;

    if (!userId) {
        return res.status(HttpStatusCode.Unauthorized).end();
    }

    const { config, bot }: AppManager = req.appManager;

    const joinedGuilds = bot.joinedGuildIds;
    const ttsToken = await bot.tts.Token;

    if (userToken) {
        const newToken = await OAuth2.Refresh(userToken);
        if (newToken) {
            Object.assign(userToken, newToken);
            req.session.userToken = userToken;
            req.session.cookie.maxAge = userToken.expires_in * 1000;
        }
    }

    if (config.adminIds.includes(userId)) {
        const data: AdminChiwawaData = {
            discord: {
                joinedGuilds,
                tts: {
                    token: ttsToken,
                    region: config.discord.tts.region,
                    language: config.discord.tts.defaultLanguage,
                    defaultMessages: {
                        joinSuffix: config.discord.defaultMessages.joinSuffix,
                        leaveSuffix: config.discord.defaultMessages.leaveSuffix
                    }
                },
                userToken: Object.assign({}, userToken, { refresh_token: "" }),
            },
            config: Object.assign({}, config, { configPath: undefined })
        };

        return res.status(HttpStatusCode.Ok).json(data);
    }

    const data: UserChiwawaData = {
        discord: {
            joinedGuilds,
            tts: {
                token: ttsToken,
                region: config.discord.tts.region,
                language: config.discord.tts.defaultLanguage,
                defaultMessages: {
                    joinSuffix: config.discord.defaultMessages.joinSuffix,
                    leaveSuffix: config.discord.defaultMessages.leaveSuffix
                }
            },
            userToken: Object.assign({}, userToken, { refresh_token: "" })
        }
    }

    return res.status(HttpStatusCode.Ok).json(data)
}