import { Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import { resultHandler } from "#/server/middlware";
import { createSession, delSession, getOAuth2State, setOAuth2State } from "#/server/sessions";
import type { State } from "#/services";
import type { Session } from "#/services/sessions";

const isCodeChallenge = (value: unknown): value is string =>
    typeof value === "string" && value.length === 43 && /^[A-Za-z0-9\-_]+$/.test(value);

export const validateCodeChallenge = (data: unknown): Result<string, ErrorCode> =>
    isCodeChallenge(data) ? Ok(data) : Err(ErrorCode.VALIDATION_FAILED);

interface GetLoginUrlCtx {
    context: { state: State };
    data: { codeChallenge: string };
}

export const getLoginUrlHandler = resultHandler(async ({ context: { state }, data }: GetLoginUrlCtx) =>
    validateCodeChallenge(data.codeChallenge).andThen((codeChallenge) => {
        const oauth2State = Bun.randomUUIDv7("base64url");
        return setOAuth2State(oauth2State).map(() => {
            const oauth2Url = state.oauth2Provider.getAuthorizeUrl(oauth2State, codeChallenge);
            return { oauth2Url, oauth2State };
        });
    }),
);

const isCodeVerifier = (value: unknown): value is string =>
    typeof value === "string" && value.length >= 43 && value.length <= 128 && /^[A-Za-z0-9._~-]+$/.test(value);

interface LoginData {
    oauth2Code: string;
    oauth2State: string;
    codeVerifier: string;
}

const validateLoginData = (data: unknown): Result<LoginData, ErrorCode> => {
    if (typeof data !== "object" || data === null) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }
    const { oauth2Code, oauth2State, codeVerifier } = data as Record<string, unknown>;

    if (
        typeof oauth2Code !== "string" ||
        oauth2Code.length < 16 ||
        typeof oauth2State !== "string" ||
        oauth2State.length !== 22 ||
        !isCodeVerifier(codeVerifier)
    ) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }

    return Ok({ oauth2Code, oauth2State, codeVerifier });
};

interface LoginCtx {
    context: { state: State };
    data: { oauth2Code: string; oauth2State: string; codeVerifier: string };
}

export const loginHandler = resultHandler(({ context: { state }, data }: LoginCtx) =>
    validateLoginData(data).andThenAsync(async ({ oauth2Code, oauth2State, codeVerifier }) =>
        getOAuth2State()
            .andThen((r) => r.okOr<ErrorCode>(ErrorCode.AUTH_STATE_COOKIE_MISSING))
            .andThen((storedState) =>
                storedState === oauth2State
                    ? Ok<void, ErrorCode>(undefined)
                    : Err<void, ErrorCode>(ErrorCode.AUTH_STATE_MISMATCH),
            )
            .andThenAsync(async () => {
                const tokenResult = await state.oauth2Provider
                    .base(oauth2Code, codeVerifier)
                    .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_TOKEN_EXCHANGE_FAILED));

                return tokenResult.andThenAsync(async (token) => {
                    const userResult = await state.oauth2Provider
                        .getUser(token)
                        .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_USER_FETCH_FAILED));

                    return userResult
                        .andThenAsync((user) => createSession(state, false, user, token))
                        .then((r) => r.map(() => true));
                });
            }),
    ),
);

interface LogoutCtx {
    context: { state: State; session: Result<Session, ErrorCode> };
}

export const logoutHandler = resultHandler(({ context: { state, session: sessionResult } }: LogoutCtx) =>
    sessionResult.andThenAsync(async (session) => {
        const revoked = await state.oauth2Provider
            .revoke(session.userToken.refresh_token)
            .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_LOGOUT_FAILED));

        return revoked.andThenAsync(() => delSession(state)).then((r) => r.map(() => true));
    }),
);
