"use server";

import { getSession } from "server/profile/funcs";
import oauth2 from "services/discord-oauth2";
import { useMongo } from "services/mongo";

import { createEmptySpeechNotice, SpeechNotice, UserConfig } from "structs/user-config";
import { AppInfo, rebuildAppInfo, createUserInfo, Profile } from "structs/profile";
import { DiscordGuild, DiscordGuildMember, DiscordUser } from "structs/discord";
import { goify } from "resultant.js/goify";
import { SerializableOutcome, buildSerializableOutcome } from "resultant.js/rustify";
import { GetIssueToken } from "services/microsoft-tts";
import { AdminAppConfig, getDefaultAdmins } from "structs/app-config";

export const RetrieveProfile = async (): Promise<SerializableOutcome<Profile>> => buildSerializableOutcome<Profile>(async () => {

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

        const [app, user, guilds, userConfig] = await Promise.all(
            [getApp, getUser, getGuilds, getUserConfig]
        );

        const { ttsRegion, ttsApiKey } = app.config;
        const ttsAccessToken = await GetIssueToken(ttsRegion, ttsApiKey);

        const appInfo: AppInfo = { config: app.config, ttsAccessToken }

        for (const appJoinedGuildId of app.guildIds) {

            if (guilds.find((g) => g.id === appJoinedGuildId)) {
                if (!userConfig.guilds[appJoinedGuildId]) {
                    const updatedGuilds = {
                        ...userConfig.guilds,
                        [appJoinedGuildId]: createEmptySpeechNotice(true)
                    }
                    userConfig.guilds = updatedGuilds;
                }
            } else {
                if (userConfig.guilds[appJoinedGuildId]) {
                    const { [appJoinedGuildId]: _, ...updatedGuilds } = userConfig.guilds;
                    userConfig.guilds = updatedGuilds;
                }
            }

        }

        return { appInfo, user, guilds, userConfig };
    });

    if (err) {
        throw err;
    }

    const { appInfo, user, guilds, userConfig } = result;

    return {
        appInfo: rebuildAppInfo(user.id, appInfo),
        userInfo: createUserInfo(user, guilds, userConfig, userToken)
    };
});

export const UpdateUserSpeechNotice = async (speechNotice: SpeechNotice, guildId: string = ""): Promise<SerializableOutcome<void>> => buildSerializableOutcome<void>(async () => {

    const { userId } = await getSession();

    const [_, err] = await useMongo((db) => db.updateUserSpeechNotice(userId, guildId, speechNotice));
    if (err) throw err;
});

export const UpdateAppConfig = async (appConfig: AdminAppConfig): Promise<SerializableOutcome<void>> => buildSerializableOutcome<void>(async () => {

    const { userId } = await getSession();

    for (const admin of getDefaultAdmins()) {
        if (!appConfig.admins.includes(admin)) {
            appConfig.admins.unshift(admin);
        }
    }

    const [_, err] = await useMongo((db) => db.updateAppConfig(userId, appConfig));
    if (err) throw err;
});

export const GetGuildMember = async (guildId: string): Promise<SerializableOutcome<DiscordGuildMember>> => buildSerializableOutcome<DiscordGuildMember>(async () => {

    const { userToken } = await getSession();

    const [guildMember, error] = await goify(() => oauth2.getGuildMember(userToken, guildId));
    if (error) {
        throw new Error("get guild member failed");
    }

    return guildMember;
});