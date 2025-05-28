import { DiscordGuild, DiscordUser } from "structs/discord";
import { OAuth2Token } from "structs/discord-oauth2";
import { IssueToken } from "structs/microsoft-tts";
import { UserConfig } from "structs/user-config";

const defaultVoiceModule = process.env["TTS_DEFAULT_VOICE_MODULE"] || "";

export interface AppInfo {
    defaultJoinSuffix: string
    defaultLeaveSuffix: string
    defaultVoiceModule: string
    ttsAccessToken: IssueToken
}

export const createEmptyAppInfo = (): AppInfo => ({
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModule,
    ttsAccessToken: { token: "", expiresAt: 0, region: "" },
});

export interface UserInfo {
    user: DiscordUser,
    guilds: DiscordGuild[]
    config: UserConfig
    token: OAuth2Token
}

export interface Profile {
    appInfo: AppInfo
    userInfo: UserInfo
}