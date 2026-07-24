import { Err, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import type { AppConfig, SpeechNotice } from "#/models";
import { resultHandler } from "#/server/middlware";
import type { State } from "#/services";
import { isNotFound } from "#/services/database";
import type { DiscordGuildMember } from "#/services/oauth2-provider";
import type { Session } from "#/services/sessions";
import type { Profile } from "./index";

const createEmptyAppConfig = (state: State): AppConfig => {
    const { region, apiKey } = state.tts.getCredentials();
    return {
        defaultJoinSuffix: "",
        defaultLeaveSuffix: "",
        defaultVoiceModel: "",
        ttsRegion: region,
        ttsApiKey: apiKey,
        admins: state.defaultAdmins,
    };
};

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
                .then((r) => r.map((config) => config.unwrapOrElse(() => createEmptyAppConfig(state))))
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

            return state.db
                .setUserSpeechNotice(userId, speechNotice, guildId)
                .then((r) => r.map(() => true).mapErr(() => ErrorCode.PROFILE_SPEECH_NOTICE_UPDATE_FAILED));
        }),
);

interface UpdateAppConfigCtx extends SessionCtx {
    data: { appConfig: AppConfig };
}

export const updateAppConfigHandler = resultHandler(
    ({ context: { state, session: sessionResult }, data: { appConfig } }: UpdateAppConfigCtx) =>
        sessionResult.andThenAsync(async (session) => {
            const { isAdmin } = session;
            if (!isAdmin) {
                return Err<boolean, ErrorCode>(ErrorCode.PROFILE_ADMIN_REQUIRED);
            }
            const res = await state.db.setAppConfig(appConfig);

            if (res.isOk()) {
                Promise.all([
                    state.updateTTS(appConfig.ttsRegion || "", appConfig.ttsApiKey || ""),
                    state.cache.saveConfig(appConfig),
                ]).then(([ttsRes, cfgRes]) => {
                    ttsRes.mapErr((err) => console.error("Failed to update TTS credentials:", err));
                    cfgRes.mapErr((err) => console.error("Failed to publish app config to cache:", err));
                });
            }

            return res.map(() => true).mapErr(() => ErrorCode.PROFILE_APP_CONFIG_UPDATE_FAILED);
        }),
);

interface GetGuildMemberCtx extends SessionCtx {
    data: { guildId: string };
}

export const getGuildMemberHandler = resultHandler(
    ({ context: { state, session: sessionResult }, data: { guildId } }: GetGuildMemberCtx) =>
        sessionResult.andThenAsync(async (session) => {
            if (!session.guildIds.includes(guildId)) {
                return Err<DiscordGuildMember, ErrorCode>(ErrorCode.PROFILE_GUILD_NOT_JOINED);
            }
            return state.oauth2Provider
                .getGuildMember(session.userToken, guildId)
                .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.PROFILE_GUILD_MEMBER_FETCH_FAILED));
        }),
);
