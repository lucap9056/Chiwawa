import { createServerFn } from "@tanstack/react-start";
import type { AppConfig, SpeechNotice } from "#/models";
import { sessionMiddleware } from "#/server/middlware";
import type { DiscordGuild, DiscordUser } from "#/services/oauth2-provider";
import {
    getGuildMemberHandler,
    getUserSpeechNoticeHandler,
    retrieveProfileHandler,
    updateAppConfigHandler,
    updateUserSpeechNoticeHandler,
} from "./handlers";

export interface Profile {
    isAdmin: boolean;
    user: DiscordUser;
    guilds: DiscordGuild[];
    appConfig: AppConfig;
}

export const retrieveProfile = createServerFn().middleware([sessionMiddleware]).handler(retrieveProfileHandler);

export const getUserSpeechNotice = createServerFn()
    .middleware([sessionMiddleware])
    .validator((data: { guildId?: string }) => data)
    .handler(getUserSpeechNoticeHandler);

export const updateUserSpeechNotice = createServerFn()
    .middleware([sessionMiddleware])
    .validator((data: { speechNotice: SpeechNotice; guildId?: string }) => data)
    .handler(updateUserSpeechNoticeHandler);

export const updateAppConfig = createServerFn()
    .middleware([sessionMiddleware])
    .validator((data: { appConfig: AppConfig }) => data)
    .handler(updateAppConfigHandler);

export const getGuildMember = createServerFn()
    .middleware([sessionMiddleware])
    .validator((data: { guildId: string }) => data)
    .handler(getGuildMemberHandler);
