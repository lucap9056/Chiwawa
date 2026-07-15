import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { buildResult, Err, None, Ok, type Option, type Result, Some } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import type { State } from "#/services";
import type { DiscordUser, OAuth2Token } from "#/services/oauth2-provider";
import type { Session } from "#/services/sessions";

enum COOKIES {
    SESSION_ID = "session_id",
    STATE = "state",
}

const setSessionIdCookie = (id: string, expireAt: Date): Result<void, ErrorCode> =>
    buildResult(() =>
        setCookie(COOKIES.SESSION_ID, id, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            expires: expireAt,
        }),
    ).mapErr<ErrorCode>(() => ErrorCode.SESSION_COOKIE_SET_FAILED);

const getSessionIdCookie = (): Result<string, ErrorCode> =>
    buildResult(() => getCookie(COOKIES.SESSION_ID))
        .mapErr<ErrorCode>(() => ErrorCode.SESSION_COOKIE_READ_FAILED)
        .andThen((sessionId) =>
            sessionId ? Ok<string, ErrorCode>(sessionId) : Err<string, ErrorCode>(ErrorCode.SESSION_COOKIE_MISSING),
        );

const deleteSessionIdCookie = (): Result<void, ErrorCode> =>
    buildResult(() => deleteCookie(COOKIES.SESSION_ID)).mapErr<ErrorCode>(() => ErrorCode.SESSION_COOKIE_DELETE_FAILED);

export const createSession = async (
    { sessions }: State,
    isAdmin: boolean,
    user: DiscordUser,
    oauthToken: OAuth2Token,
): Promise<Result<void, ErrorCode>> => {
    const sessionResult = await sessions.create(isAdmin, user, oauthToken);
    return sessionResult
        .mapErr<ErrorCode>(() => ErrorCode.SESSION_CREATE_FAILED)
        .andThen((session) => setSessionIdCookie(session.sessionId, session.expireAt));
};

export const getSession = ({ sessions }: State): Promise<Result<Option<Session>, ErrorCode>> =>
    getSessionIdCookie().andThenAsync((sessionId) =>
        sessions.get(sessionId).then((r) => r.mapErr<ErrorCode>(() => ErrorCode.SESSION_STORE_READ_FAILED)),
    );

export const delSession = ({ sessions }: State): Promise<Result<void, ErrorCode>> =>
    getSessionIdCookie()
        .andThenAsync((sessionId) =>
            sessions.del(sessionId).then((r) => r.mapErr<ErrorCode>(() => ErrorCode.SESSION_DELETE_FAILED)),
        )
        .then((r) => r.andThen(deleteSessionIdCookie));

const isSessionExpired = (session: Session): boolean => session.expireAt.getTime() <= Date.now();

const refreshSession = ({ sessions, oauth2Provider }: State, session: Session): Promise<Result<Session, ErrorCode>> =>
    oauth2Provider
        .refresh(session.userToken)
        .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.DISCORD_OAUTH_REFRESH_FAILED))
        .then((tokenResult) =>
            tokenResult.andThenAsync(async (userToken) => {
                const refreshed: Session = {
                    ...session,
                    userToken,
                    expireAt: new Date(Date.now() + userToken.expires_in * 1000),
                };
                return sessions
                    .update(refreshed)
                    .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.SESSION_UPDATE_FAILED))
                    .then((r) => r.andThen(() => setSessionIdCookie(refreshed.sessionId, refreshed.expireAt)))
                    .then((r) => r.map(() => refreshed));
            }),
        );

export const checkSession = (
    state: State,
    sessionResult: Result<Option<Session>, ErrorCode>,
): Promise<Result<Session, ErrorCode>> =>
    sessionResult
        .andThen((opt) => opt.okOr<ErrorCode>(ErrorCode.SESSION_NOT_FOUND))
        .andThenAsync(async (session) => {
            if (!isSessionExpired(session)) {
                return Ok<Session, ErrorCode>(session);
            }

            const refreshed = await refreshSession(state, session);
            if (refreshed.isOk()) {
                return refreshed;
            }

            const { sessions } = state;
            const delResult = await sessions
                .del(session.sessionId)
                .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.SESSION_DELETE_FAILED));

            // On successful cleanup, still report the session as expired — that's
            // the actual outcome; a delete failure reports its own code instead.
            return delResult
                .andThen(deleteSessionIdCookie)
                .andThen(() => Err<Session, ErrorCode>(ErrorCode.SESSION_EXPIRED));
        });

export const setOAuth2State = (state: string): Result<void, ErrorCode> =>
    buildResult(() =>
        setCookie(COOKIES.STATE, state, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 300,
        }),
    ).mapErr<ErrorCode>(() => ErrorCode.AUTH_STATE_COOKIE_SET_FAILED);

export const getOAuth2State = (): Result<Option<string>, ErrorCode> =>
    buildResult(() => {
        const oauth2State = getCookie(COOKIES.STATE);
        return oauth2State ? Some(oauth2State) : None<string>();
    }).mapErr<ErrorCode>(() => ErrorCode.AUTH_STATE_COOKIE_READ_FAILED);
