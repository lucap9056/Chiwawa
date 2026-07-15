import { Err, None, Ok, Some } from "resultant.js/rustify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "#/errors";
import { createFakeState, fakeDiscordUser, fakeOAuth2Token, fakeSession } from "#/server/test/fakes";
import type { OAuth2Token } from "#/services/oauth2-provider";
import type { Session } from "#/services/sessions";

const { cookies } = vi.hoisted(() => ({ cookies: new Map<string, string>() }));

vi.mock("@tanstack/react-start/server", () => ({
    getCookie: vi.fn((name: string) => cookies.get(name)),
    setCookie: vi.fn((name: string, value: string, _opts?: unknown) => {
        cookies.set(name, value);
    }),
    deleteCookie: vi.fn((name: string) => {
        cookies.delete(name);
    }),
}));

import { deleteCookie, setCookie } from "@tanstack/react-start/server";
import { checkSession, createSession, delSession, getOAuth2State, getSession, setOAuth2State } from "./index";

describe("server/sessions", () => {
    beforeEach(() => {
        cookies.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createSession", () => {
        it("stores the session and sets the session_id cookie with a matching expiry", async () => {
            const state = createFakeState();
            const user = fakeDiscordUser({ id: "42" });
            const token = fakeOAuth2Token({ expires_in: 3600 });

            const result = await createSession(state, true, user, token);

            expect(result.isOk()).toBe(true);
            expect(state.sessions.create).toHaveBeenCalledWith(true, user, token);
            expect(vi.mocked(setCookie)).toHaveBeenCalledTimes(1);
            const [name, value, opts] = vi.mocked(setCookie).mock.calls[0];
            expect(name).toBe("session_id");
            expect(value).toBe("fake-session-id");
            expect((opts as { expires: Date }).expires).toBeInstanceOf(Date);
        });

        it("returns Err(SESSION_CREATE_FAILED) without setting a cookie when the store write fails", async () => {
            const state = createFakeState();
            vi.mocked(state.sessions.create).mockResolvedValueOnce(Err<Session, Error>(new Error("db down")));

            const result = await createSession(state, false, fakeDiscordUser(), fakeOAuth2Token());

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_CREATE_FAILED);
            expect(setCookie).not.toHaveBeenCalled();
        });

        it("returns Err(SESSION_COOKIE_SET_FAILED) when writing the cookie throws", async () => {
            const state = createFakeState();
            vi.mocked(setCookie).mockImplementationOnce(() => {
                throw new Error("cookie jar full");
            });

            const result = await createSession(state, false, fakeDiscordUser(), fakeOAuth2Token());

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_COOKIE_SET_FAILED);
        });
    });

    describe("getSession", () => {
        it("returns Err(SESSION_COOKIE_MISSING) when there is no session_id cookie", async () => {
            const state = createFakeState();

            const result = await getSession(state);

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_COOKIE_MISSING);
            expect(state.sessions.get).not.toHaveBeenCalled();
        });

        it("returns Ok(None) when the cookie is present but the store has no matching session", async () => {
            cookies.set("session_id", "abc");
            const state = createFakeState();

            const result = await getSession(state);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap().isNone()).toBe(true);
        });

        it("returns Ok(Some(session)) when the store has a matching session", async () => {
            cookies.set("session_id", "abc");
            const session = fakeSession({ sessionId: "abc" });
            const state = createFakeState();
            vi.mocked(state.sessions.get).mockResolvedValueOnce(Ok(Some(session)));

            const result = await getSession(state);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap().unwrap()).toEqual(session);
        });
    });

    describe("delSession", () => {
        it("deletes the store entry and the cookie on success", async () => {
            cookies.set("session_id", "abc");
            const state = createFakeState();

            const result = await delSession(state);

            expect(result.isOk()).toBe(true);
            expect(state.sessions.del).toHaveBeenCalledWith("abc");
            expect(deleteCookie).toHaveBeenCalledWith("session_id");
        });

        it("returns Err(SESSION_COOKIE_MISSING) without touching the store when there is no cookie", async () => {
            const state = createFakeState();

            const result = await delSession(state);

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_COOKIE_MISSING);
            expect(state.sessions.del).not.toHaveBeenCalled();
        });

        it("returns Err(SESSION_DELETE_FAILED) and leaves the cookie in place when the store delete fails", async () => {
            cookies.set("session_id", "abc");
            const state = createFakeState();
            vi.mocked(state.sessions.del).mockResolvedValueOnce(Err<void, Error>(new Error("redis down")));

            const result = await delSession(state);

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_DELETE_FAILED);
            expect(deleteCookie).not.toHaveBeenCalled();
            expect(cookies.get("session_id")).toBe("abc");
        });
    });

    describe("checkSession", () => {
        it("passes a non-expired session through unchanged", async () => {
            const state = createFakeState();
            const session = fakeSession({ expireAt: new Date(Date.now() + 60_000) });

            const result = await checkSession(state, Ok(Some(session)));

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual(session);
            expect(state.oauth2Provider.refresh).not.toHaveBeenCalled();
        });

        it("propagates an upstream Err(sessionResult) unchanged", async () => {
            const state = createFakeState();

            const result = await checkSession(state, Err(ErrorCode.SESSION_COOKIE_MISSING));

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_COOKIE_MISSING);
        });

        it("returns Err(SESSION_NOT_FOUND) when there is no session to check", async () => {
            const state = createFakeState();

            const result = await checkSession(state, Ok(None()));

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_NOT_FOUND);
        });

        it("refreshes an expired session and persists the new token/expiry", async () => {
            const state = createFakeState();
            const expired = fakeSession({ expireAt: new Date(Date.now() - 1000) });
            const newToken = fakeOAuth2Token({ access_token: "new-access", expires_in: 100 });
            vi.mocked(state.oauth2Provider.refresh).mockResolvedValueOnce(Ok(newToken));

            const result = await checkSession(state, Ok(Some(expired)));

            expect(result.isOk()).toBe(true);
            const refreshed = result.unwrap();
            expect(refreshed.userToken).toEqual(newToken);
            expect(state.sessions.update).toHaveBeenCalledWith(refreshed);
            expect(setCookie).toHaveBeenCalledWith("session_id", expired.sessionId, expect.anything());
        });

        it("deletes the session and returns Err(SESSION_EXPIRED) when refresh fails but cleanup succeeds", async () => {
            const state = createFakeState();
            const expired = fakeSession({ expireAt: new Date(Date.now() - 1000) });
            vi.mocked(state.oauth2Provider.refresh).mockResolvedValueOnce(
                Err<OAuth2Token, Error>(new Error("discord down")),
            );

            const result = await checkSession(state, Ok(Some(expired)));

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_EXPIRED);
            expect(state.sessions.del).toHaveBeenCalledWith(expired.sessionId);
            expect(deleteCookie).toHaveBeenCalledWith("session_id");
        });

        it("returns the delete-failure code instead of SESSION_EXPIRED when cleanup also fails", async () => {
            const state = createFakeState();
            const expired = fakeSession({ expireAt: new Date(Date.now() - 1000) });
            vi.mocked(state.oauth2Provider.refresh).mockResolvedValueOnce(
                Err<OAuth2Token, Error>(new Error("discord down")),
            );
            vi.mocked(state.sessions.del).mockResolvedValueOnce(Err<void, Error>(new Error("redis down")));

            const result = await checkSession(state, Ok(Some(expired)));

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr()).toBe(ErrorCode.SESSION_DELETE_FAILED);
        });
    });

    describe("setOAuth2State / getOAuth2State", () => {
        it("round-trips the state value through the state cookie", () => {
            const setResult = setOAuth2State("state-123");
            expect(setResult.isOk()).toBe(true);
            expect(setCookie).toHaveBeenCalledWith("state", "state-123", expect.objectContaining({ maxAge: 300 }));

            const getResult = getOAuth2State();
            expect(getResult.isOk()).toBe(true);
            expect(getResult.unwrap().unwrap()).toBe("state-123");
        });

        it("getOAuth2State returns None when there is no state cookie", () => {
            const result = getOAuth2State();

            expect(result.isOk()).toBe(true);
            expect(result.unwrap().isNone()).toBe(true);
        });
    });
});
