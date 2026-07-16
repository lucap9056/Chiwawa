import { createServerFn } from "@tanstack/react-start";
import { Err, type Result } from "resultant.js/rustify";
import { z } from "zod";
import { ErrorCode } from "#/errors";
import { type AppConfig, appConfigSchema, type SpeechNotice, speechNoticeSchema } from "#/models";
import { resultHandler, sessionMiddleware } from "#/server/middlware";
import type { State } from "#/services";
import { isNotFound } from "#/services/database";
import type { DiscordGuild, DiscordUser } from "#/services/oauth2-provider";
import type { Session } from "#/services/sessions";

const createEmptyAppConfig = (): AppConfig => ({
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModel: "",
    ttsRegion: undefined,
    ttsApiKey: undefined,
    admins: [],
});

export interface Profile {
    isAdmin: boolean;
    user: DiscordUser;
    guilds: DiscordGuild[];
    appConfig: AppConfig;
}

const safeAppConfig = (appConfig: AppConfig, isAdmin: boolean): AppConfig => {
    if (isAdmin) {
        return appConfig;
    }
    const { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModel, ttsRegion } = appConfig;
    const admins: string[] = [];
    return { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModel, ttsRegion, admins };
};

interface SessionCtx {
    context: { state: State; session: Result<Session, ErrorCode> };
}

export const retrieveProfileHandler = resultHandler(({ context: { state, session: sessionResult } }: SessionCtx) =>
    sessionResult.andThenAsync(async (session) => {
        const [userResult, guildsResult, appConfigResult] = await Promise.all([
            state.oauth2Provider
                .getUser(session.userToken)
                .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_USER_FETCH_FAILED)),
            state.oauth2Provider
                .getGuilds(session.userToken)
                .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.DISCORD_API_ERROR)),
            state.db
                .getAppConfig()
                .then((r) => r.map((config) => config.unwrapOrElse(createEmptyAppConfig)))
                .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.DATABASE_QUERY_FAILED)),
        ]);

        return userResult
            .andThen((user) =>
                guildsResult.andThen((userGuilds) =>
                    appConfigResult.map((appConfig) => [user, userGuilds, appConfig] as const),
                ),
            )
            .andThenAsync(async ([user, userGuilds, appConfig]) => {
                const joinedGuildsResult = await state.cache
                    .intersectGuildIds(userGuilds.map((g) => g.id))
                    .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.CACHE_OPERATION_FAILED));

                return joinedGuildsResult.andThenAsync(async (joinedGuilds) => {
                    const guilds = userGuilds.filter((g) => joinedGuilds.includes(g.id));
                    const isAdmin = appConfig.admins.includes(user.id);

                    const updateResult = await state.sessions
                        .update({ ...session, isAdmin, guildIds: joinedGuilds })
                        .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.PROFILE_SESSION_UPDATE_FAILED));

                    return updateResult.map(
                        (): Profile => ({
                            isAdmin,
                            user,
                            guilds,
                            appConfig: safeAppConfig(appConfig, isAdmin),
                        }),
                    );
                });
            });
    }),
);

export const retrieveProfile = createServerFn().middleware([sessionMiddleware]).handler(retrieveProfileHandler);

interface GetUserSpeechNoticeCtx extends SessionCtx {
    data: { guildId?: string };
}

export const getUserSpeechNoticeHandler = resultHandler(
    ({ context: { state, session: sessionResult }, data: { guildId } }: GetUserSpeechNoticeCtx) =>
        sessionResult.andThenAsync(async (session) => {
            const { userId } = session;
            return state.db
                .getUserSpeechNotice(userId, guildId)
                .then((r) =>
                    r.mapErr((err) =>
                        isNotFound(err) ? ErrorCode.DATABASE_NOT_FOUND : ErrorCode.PROFILE_SPEECH_NOTICE_FETCH_FAILED,
                    ),
                );
        }),
);

export const getUserSpeechNotice = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ guildId: z.string().optional() }))
    .handler(getUserSpeechNoticeHandler);

interface UpdateUserSpeechNoticeCtx extends SessionCtx {
    data: { speechNotice: SpeechNotice; guildId?: string };
}

export const updateUserSpeechNoticeHandler = resultHandler(
    ({ context: { state, session: sessionResult }, data: { speechNotice, guildId } }: UpdateUserSpeechNoticeCtx) =>
        sessionResult.andThenAsync(async (session) => {
            const { userId } = session;
            if (guildId && !session.guildIds.includes(guildId)) {
                return Err<boolean, ErrorCode>(ErrorCode.PROFILE_GUILD_NOT_JOINED);
            }

            const updateResult = await state.db
                .setUserSpeechNotice(userId, speechNotice, guildId)
                .then((r) => r.map(() => true).mapErr(() => ErrorCode.PROFILE_SPEECH_NOTICE_UPDATE_FAILED));
            if (updateResult.isErr()) {
                return updateResult;
            }

            if (guildId) {
                state.cache.delSpeech(userId, guildId);
            }

            return updateResult;
        }),
);

export const updateUserSpeechNotice = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ speechNotice: speechNoticeSchema, guildId: z.string().optional() }))
    .handler(updateUserSpeechNoticeHandler);

interface UpdateAppConfigCtx extends SessionCtx {
    data: { appConfig: AppConfig };
}

export const updateAppConfigHandler = resultHandler(
    ({ context: { state, session: sessionResult }, data: { appConfig } }: UpdateAppConfigCtx) =>
        sessionResult.andThenAsync(async (session) => {
            const { isAdmin, userId } = session;
            if (!isAdmin) {
                return Err<boolean, ErrorCode>(ErrorCode.PROFILE_ADMIN_REQUIRED);
            }

            const res = await state.db.setAppConfig(appConfig, userId);

            if (res.isOk()) {
                Promise.all([
                    state.updateTTS(appConfig.ttsRegion || "", appConfig.ttsApiKey || ""),
                    state.cache.saveConfig(appConfig),
                ]).then(([ttsRes, cfgRes]) => {
                    ttsRes.mapErr((err) => console.error(err));
                    cfgRes.mapErr((err) => console.error(err));
                });
            }

            return res.map(() => true).mapErr(() => ErrorCode.PROFILE_APP_CONFIG_UPDATE_FAILED);
        }),
);

export const updateAppConfig = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ appConfig: appConfigSchema }))
    .handler(updateAppConfigHandler);

interface GetGuildMemberCtx extends SessionCtx {
    data: { guildId: string };
}

export const getGuildMemberHandler = resultHandler(
    ({ context: { state, session: sessionResult }, data: { guildId } }: GetGuildMemberCtx) =>
        sessionResult.andThenAsync(async (session) => {
            if (!session.guildIds.includes(guildId)) {
                return Err<boolean, ErrorCode>(ErrorCode.PROFILE_GUILD_NOT_JOINED);
            }
            return state.oauth2Provider
                .getGuildMember(session.userToken, guildId)
                .then((r) => r.map(() => true).mapErr(() => ErrorCode.PROFILE_GUILD_MEMBER_FETCH_FAILED));
        }),
);

export const getGuildMember = createServerFn()
    .middleware([sessionMiddleware])
    .validator(z.object({ guildId: z.string() }))
    .handler(getGuildMemberHandler);
