import { Request, Response } from "express";
import { HttpStatusCode } from "axios";

import { User, OAuth2 } from "@src/api/discordAPI";
import AppManager from "@src/components/appManager";

import { AdminChiwawaData, UserChiwawaData } from "./userData";


export default async function POST_LOGIN(req: Request, res: Response) {

    const code = req.body.code || "";

    if (code === "") {
        return res.status(HttpStatusCode.BadRequest).end();
    }

    const oauth2: OAuth2 | undefined = req.oauth2;

    const { config, bot }: AppManager = req.appManager;

    const joinedGuilds = bot.joinedGuildIds;
    const ttsToken = await bot.tts.Token;

    if (oauth2) {

        const userToken = await oauth2.Base(code);

        if (!userToken) {
            return res.status(HttpStatusCode.Forbidden).end();
        }

        const user = await User.Init(userToken.access_token);

        if (!user) {
            return res.status(HttpStatusCode.InternalServerError).end();
        }

        req.session.userId = user.id;
        req.session.userToken = userToken;
        req.session.cookie.maxAge = userToken.expires_in * 1000;

        if (config.adminIds.includes(user.id)) {
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
                config
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

        return res
            .setHeader("Content-Type", "application/json")
            .status(HttpStatusCode.Ok)
            .end(JSON.stringify(data));
    }



    const auth = bot.auths.Authorize(code);

    if (!auth) {
        return res.status(HttpStatusCode.Forbidden).end();
    }

    req.session.userId = auth.user.id;

    if (config.adminIds) {
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
            },
            config
        };

        return res.status(HttpStatusCode.Ok).json(data);
    }
}