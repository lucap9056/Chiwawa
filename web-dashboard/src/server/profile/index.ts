"use server";

import { getSession } from "server/profile/funcs";
import oauth2 from "services/discord-oauth2";
import { useMongo } from "services/mongo";

import { createEmptySpeechNotice, UserConfig } from "structs/user-config";
import { AppInfo, Profile } from "structs/profile";
import { DiscordGuild, DiscordGuildMember, DiscordUser } from "structs/discord";
import { goify } from "structs/goify";
import { GetIssueToken } from "services/microsoft-tts";
import { Result, RsResult } from "structs/rs-result";


export const RetrieveProfile = async (): Promise<RsResult<Profile | undefined>> => Result(async (Ok, Err) => {

    const { userId, userToken } = await getSession();

    const getUser = oauth2.getUser(userToken);
    const getGuilds = oauth2.getGuilds(userToken);


    const [result, err] = await useMongo<{
        appInfo: AppInfo,
        user: DiscordUser,
        guilds: DiscordGuild[],
        userConfig: UserConfig,
    }>(async (db) => {

        const getApp = db.getAppInfo();
        const getUserConfig = db.getUserConfig(userId);
        const getIssueToken = GetIssueToken();

        const [app, user, guilds, userConfig, ttsAccessToken] = await Promise.all(
            [getApp, getUser, getGuilds, getUserConfig, getIssueToken]
        );

        const appInfo: AppInfo = { ...app, ttsAccessToken }

        for (const guildId of app.guildIds) {

            if (guilds.find((g) => g.id === guildId)) {
                if (!userConfig.guilds[guildId]) {
                    userConfig.guilds[guildId] = createEmptySpeechNotice();
                }
            } else {
                if (!!userConfig.guilds[guildId]) {
                    delete userConfig.guilds[guildId];
                }
            }

        }

        return { appInfo, user, guilds, userConfig };
    });

    if (err) {
        return Err(err.message);
    }

    const { appInfo, user, guilds, userConfig } = result;

    const { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModule, ttsAccessToken } = appInfo;

    const config = userConfig;
    const token = userToken;

    Ok({
        appInfo: { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModule, ttsAccessToken },
        userInfo: { user, guilds, config, token }
    });

});

export const UpdateUserConfig = async (userConfig: UserConfig): Promise<RsResult<void>> => Result(async (Ok) => {

    const { userId } = await getSession();

    const [_, err] = await useMongo((db) => db.updateUserConfig({ ...userConfig, id: userId }));
    if (err) throw err;

    Ok();
});

export const GetGuildMember = async (guildId: string): Promise<RsResult<DiscordGuildMember>> => Result(async (Ok) => {

    const { userToken } = await getSession();

    const [guildMember, error] = await goify(() => oauth2.getGuildMember(userToken, guildId));
    if (error) {
        throw new Error("get guild member failed");
    }

    Ok(guildMember);

});