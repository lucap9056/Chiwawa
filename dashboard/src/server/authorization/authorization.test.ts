import { Err, Ok } from "resultant.js/rustify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "#/errors";
import { createFakeState, fakeDiscordUser, fakeOAuth2Token, fakeSession } from "#/server/test/fakes";
import type { OAuth2Token } from "#/services/oauth2-provider";
import type { Session } from "#/services/sessions";

const { cookies } = vi.hoisted(() => ({ cookies: new Map<string, string>() }));

vi.mock("@tanstack/react-start/server", () => ({
    getCookie: vi.fn((name: string) => cookies.get(name)),
    setCookie: vi.fn((name: string, value: string) => {
        cookies.set(name, value);
    }),
    deleteCookie: vi.fn((name: string) => {
        cookies.delete(name);
    }),
}));

vi.mock("#/services", () => ({ state: {} }));

import { getLoginUrlHandler, loginHandler, logoutHandler, validateCodeChallenge } from "./handlers";

const VALID_CODE_CHALLENGE = "a".repeat(43);
const VALID_STATE = "b".repeat(22);
const VALID_CODE_VERIFIER = "c".repeat(43);

describe("server/authorization", () => {
    beforeEach(() => {
        cookies.clear();
        vi.stubGlobal("Bun", { randomUUIDv7: () => "fake-oauth2-state" });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("validateCodeChallenge (detail validation, checked inside the handler)", () => {
        it("rejects a code_challenge of the wrong length or charset", () => {
            expect(validateCodeChallenge(VALID_CODE_CHALLENGE).isOk()).toBe(true);
            expect(validateCodeChallenge("too-short").isOk()).toBe(false);
            expect(validateCodeChallenge(`!${"a".repeat(42)}`).isOk()).toBe(false);
        });
    });

    describe("getLoginUrlHandler", () => {
        it("writes the oauth2 state cookie and builds the authorize URL from it", async () => {
            const state = createFakeState();

            const message = await getLoginUrlHandler({
                context: { state },
                data: { codeChallenge: VALID_CODE_CHALLENGE },
            });

            expect(message.success).toBe(true);
            expect(cookies.has("state")).toBe(true);
            const oauth2State = cookies.get("state") as string;
            expect(state.oauth2Provider.getAuthorizeUrl).toHaveBeenCalledWith(oauth2State, VALID_CODE_CHALLENGE);
        });

        it("returns VALIDATION_FAILED for a type-valid but out-of-spec codeChallenge", async () => {
            const state = createFakeState();

            const message = await getLoginUrlHandler({
                context: { state },
                data: { codeChallenge: "too-short" },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.VALIDATION_FAILED });
            expect(state.oauth2Provider.getAuthorizeUrl).not.toHaveBeenCalled();
        });
    });

    describe("loginHandler", () => {
        it("returns VALIDATION_FAILED for a type-valid but out-of-spec codeVerifier", async () => {
            cookies.set("state", VALID_STATE);
            const state = createFakeState();

            const message = await loginHandler({
                context: { state },
                data: { oauth2Code: "auth-code-1234567", oauth2State: VALID_STATE, codeVerifier: "too-short" },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.VALIDATION_FAILED });
            expect(state.oauth2Provider.base).not.toHaveBeenCalled();
        });

        it("returns AUTH_STATE_COOKIE_MISSING when there is no state cookie", async () => {
            const state = createFakeState();

            const message = await loginHandler({
                context: { state },
                data: { oauth2Code: "auth-code-1234567", oauth2State: VALID_STATE, codeVerifier: VALID_CODE_VERIFIER },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.AUTH_STATE_COOKIE_MISSING });
        });

        it("returns AUTH_STATE_MISMATCH when the state cookie doesn't match the callback state", async () => {
            cookies.set("state", "stored-state-value-xxxxxxxxxxxxxxxx");
            const state = createFakeState();

            const message = await loginHandler({
                context: { state },
                data: { oauth2Code: "auth-code-1234567", oauth2State: VALID_STATE, codeVerifier: VALID_CODE_VERIFIER },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.AUTH_STATE_MISMATCH });
        });

        it("returns AUTH_TOKEN_EXCHANGE_FAILED when the code exchange fails", async () => {
            cookies.set("state", VALID_STATE);
            const state = createFakeState();
            vi.mocked(state.oauth2Provider.base).mockResolvedValueOnce(Err<OAuth2Token, Error>(new Error("bad code")));

            const message = await loginHandler({
                context: { state },
                data: { oauth2Code: "auth-code-1234567", oauth2State: VALID_STATE, codeVerifier: VALID_CODE_VERIFIER },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.AUTH_TOKEN_EXCHANGE_FAILED });
        });

        it("returns AUTH_USER_FETCH_FAILED when fetching the user profile fails", async () => {
            cookies.set("state", VALID_STATE);
            const state = createFakeState();
            vi.mocked(state.oauth2Provider.getUser).mockResolvedValueOnce(Err(new Error("discord 500")));

            const message = await loginHandler({
                context: { state },
                data: { oauth2Code: "auth-code-1234567", oauth2State: VALID_STATE, codeVerifier: VALID_CODE_VERIFIER },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.AUTH_USER_FETCH_FAILED });
        });

        it("creates a session from the exchanged token and fetched user on success", async () => {
            cookies.set("state", VALID_STATE);
            const state = createFakeState();
            const token = fakeOAuth2Token({ access_token: "exchanged" });
            const user = fakeDiscordUser({ id: "77" });
            vi.mocked(state.oauth2Provider.base).mockResolvedValueOnce(Ok(token));
            vi.mocked(state.oauth2Provider.getUser).mockResolvedValueOnce(Ok(user));

            const message = await loginHandler({
                context: { state },
                data: { oauth2Code: "auth-code-1234567", oauth2State: VALID_STATE, codeVerifier: VALID_CODE_VERIFIER },
            });

            expect(message.success).toBe(true);
            expect(state.sessions.create).toHaveBeenCalledWith(false, user, token);
        });
    });

    describe("logoutHandler", () => {
        it("returns SESSION_NOT_FOUND when there is no session", async () => {
            const state = createFakeState();

            const message = await logoutHandler({
                context: { state, session: Err(ErrorCode.SESSION_NOT_FOUND) },
            });

            expect(message).toEqual({ success: false, error: ErrorCode.SESSION_NOT_FOUND });
        });

        it("returns AUTH_LOGOUT_FAILED when revoking the Discord token fails", async () => {
            const state = createFakeState();
            const session = fakeSession();
            vi.mocked(state.oauth2Provider.revoke).mockResolvedValueOnce(Err<void, Error>(new Error("discord down")));

            const message = await logoutHandler({ context: { state, session: Ok<Session, ErrorCode>(session) } });

            expect(message).toEqual({ success: false, error: ErrorCode.AUTH_LOGOUT_FAILED });
        });

        it("revokes the token and deletes the session on success", async () => {
            cookies.set("session_id", "abc");
            const state = createFakeState();
            const session = fakeSession({ userToken: fakeOAuth2Token({ refresh_token: "rt-1" }) });

            const message = await logoutHandler({ context: { state, session: Ok<Session, ErrorCode>(session) } });

            expect(message.success).toBe(true);
            expect(state.oauth2Provider.revoke).toHaveBeenCalledWith("rt-1");
            expect(state.sessions.del).toHaveBeenCalledWith("abc");
        });
    });
});
