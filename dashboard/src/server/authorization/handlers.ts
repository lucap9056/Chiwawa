import { Err, Ok, type Result } from "resultant.js/rustify";
import { z } from "zod";
import { ErrorCode } from "#/errors";
import { resultHandler, validateDetails } from "#/server/middlware";
import { createSession, delSession, getOAuth2State, setOAuth2State } from "#/server/sessions";
import type { State } from "#/services";
import type { Session } from "#/services/sessions";

export const codeChallengeSchema = z
    .string()
    .length(43, "code_challenge must be exactly 43 characters long")
    .regex(/^[A-Za-z0-9\-_]+$/, "code_challenge must be valid Base64URL characters (letters, digits, - and _ only)");

interface GetLoginUrlCtx {
    context: { state: State };
    data: { codeChallenge: string };
}

export const getLoginUrlHandler = resultHandler(async ({ context: { state }, data }: GetLoginUrlCtx) =>
    validateDetails(codeChallengeSchema, data.codeChallenge).andThen((codeChallenge) => {
        const oauth2State = Bun.randomUUIDv7("base64url");
        return setOAuth2State(oauth2State).map(() => {
            const oauth2Url = state.oauth2Provider.getAuthorizeUrl(oauth2State, codeChallenge);
            return { oauth2Url, oauth2State };
        });
    }),
);

const loginDataSchema = z.object({
    oauth2Code: z.string().min(16, "code must be at least 16 characters long"),
    oauth2State: z.string().length(22, "state must be exactly 22 characters long"),
    codeVerifier: z
        .string()
        .min(43, "code_verifier must be at least 43 characters long")
        .max(128, "code_verifier must be at most 128 characters long")
        .regex(
            /^[A-Za-z0-9._~-]+$/,
            "code_verifier may only contain letters, digits, underscore (_), period (.), hyphen (-), and tilde (~)",
        ),
});

interface LoginCtx {
    context: { state: State };
    data: { oauth2Code: string; oauth2State: string; codeVerifier: string };
}

export const loginHandler = resultHandler(({ context: { state }, data }: LoginCtx) =>
    validateDetails(loginDataSchema, data).andThenAsync(async ({ oauth2Code, oauth2State, codeVerifier }) =>
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
