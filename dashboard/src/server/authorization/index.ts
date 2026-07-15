import { createServerFn } from "@tanstack/react-start";
import { Err, Ok, type Result } from "resultant.js/rustify";
import { z } from "zod";
import { ErrorCode } from "#/errors";
import { resultHandler, serverStateMiddleware, sessionMiddleware } from "#/server/middlware";
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

export const getLoginUrlHandler = resultHandler(
    async ({ context: { state }, data: { codeChallenge } }: GetLoginUrlCtx) => {
        const oauth2State = Bun.randomUUIDv7("base64url");
        return setOAuth2State(oauth2State).map(() => state.oauth2Provider.getAuthorizeUrl(oauth2State, codeChallenge));
    },
);

export const getLoginUrl = createServerFn()
    .middleware([serverStateMiddleware])
    .validator(z.object({ codeChallenge: codeChallengeSchema }))
    .handler(getLoginUrlHandler);

export const generateCodeVerifier = () =>
    crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: "base64url" }).replace(/=$/, "");

const oauth2CodeSchema = z.string().min(16, "code must be at least 16 characters long");
const oauth2StateSchema = z.string().length(36, "state must be exactly 36 characters long");
const codeVerifierSchema = z
    .string()
    .min(43, "code_verifier must be at least 43 characters long")
    .max(128, "code_verifier must be at most 128 characters long")
    .regex(
        /^[A-Za-z0-9._~-]+$/,
        "code_verifier may only contain letters, digits, underscore (_), period (.), hyphen (-), and tilde (~)",
    );

interface LoginCtx {
    context: { state: State };
    data: { code: string; state: string; codeVerifier: string };
}

export const loginHandler = resultHandler(({ context: { state }, data }: LoginCtx) =>
    getOAuth2State()
        .andThen((r) => r.okOr<ErrorCode>(ErrorCode.AUTH_STATE_COOKIE_MISSING))
        .andThen((oauth2State) =>
            oauth2State === data.state
                ? Ok<void, ErrorCode>(undefined)
                : Err<void, ErrorCode>(ErrorCode.AUTH_STATE_MISMATCH),
        )
        .andThenAsync(async () => {
            const tokenResult = await state.oauth2Provider
                .base(data.code, data.codeVerifier)
                .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_TOKEN_EXCHANGE_FAILED));

            return tokenResult.andThenAsync(async (token) => {
                const userResult = await state.oauth2Provider
                    .getUser(token)
                    .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_USER_FETCH_FAILED));

                return userResult.andThenAsync((user) => createSession(state, false, user, token));
            });
        }),
);

export const login = createServerFn()
    .middleware([serverStateMiddleware])
    .validator(z.object({ code: oauth2CodeSchema, state: oauth2StateSchema, codeVerifier: codeVerifierSchema }))
    .handler(loginHandler);

interface LogoutCtx {
    context: { state: State; session: Result<Session, ErrorCode> };
}

export const logoutHandler = resultHandler(({ context: { state, session: sessionResult } }: LogoutCtx) =>
    sessionResult.andThenAsync(async (session) => {
        const revoked = await state.oauth2Provider
            .revoke(session.userToken.refresh_token)
            .then((r) => r.mapErr<ErrorCode>(() => ErrorCode.AUTH_LOGOUT_FAILED));

        return revoked.andThenAsync(() => delSession(state));
    }),
);

export const logout = createServerFn().middleware([sessionMiddleware]).handler(logoutHandler);
