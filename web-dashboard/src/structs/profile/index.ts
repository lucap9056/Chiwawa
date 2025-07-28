import { AdminAppConfig, AppConfig, createEmptyUserAppConfig, rebuildUserAppConfig } from "structs/app-config";
import { DiscordGuild, DiscordUser } from "structs/discord";
import { OAuth2Token } from "structs/discord-oauth2";
import { createEmptyIssueToken, IssueToken } from "structs/microsoft-tts";
import { UserConfig } from "structs/user-config";

const isAdmin = (userId: string, config: AppConfig): config is AdminAppConfig => "admins" in config ? config.admins.includes(userId) : false;

export interface AppInfo {
    config: AppConfig
    ttsAccessToken: IssueToken
}

export const createEmptyAppInfo = (): AppInfo =>
({
    config: createEmptyUserAppConfig(),
    ttsAccessToken: createEmptyIssueToken(),
});

export const rebuildAppInfo = (userId: string, { config, ttsAccessToken }: AppInfo): AppInfo =>
({
    config: isAdmin(userId, config) ? config : rebuildUserAppConfig(config),
    ttsAccessToken,
});

export interface UserInfo {
    user: DiscordUser,
    guilds: DiscordGuild[]
    config: UserConfig
    token: OAuth2Token
}

export const createUserInfo = (user: DiscordUser, guilds: DiscordGuild[], config: UserConfig, token: OAuth2Token): UserInfo =>
    ({ user, guilds, config, token });

export interface Profile {
    appInfo: AppInfo
    userInfo: UserInfo
}