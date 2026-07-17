import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type AppConfig, appConfigSchema, speechNoticeSchema } from "#/models";
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
    .validator(z.object({ guildId: z.string().optional() }))
    .handler(getUserSpeechNoticeHandler);

export const updateUserSpeechNotice = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ speechNotice: speechNoticeSchema, guildId: z.string().optional() }))
    .handler(updateUserSpeechNoticeHandler);

export const updateAppConfig = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ appConfig: appConfigSchema }))
    .handler(updateAppConfigHandler);

export const getGuildMember = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ guildId: z.string() }))
    .handler(getGuildMemberHandler);
