import { describe, expect, it } from "vitest";
import { asRedisClient, createFakeRedisClient, fakeDiscordUser, fakeOAuth2Token } from "#/server/test/fakes";
import sessions, { type Session } from "./redis";

const sessionKey = (sessionId: string) => `dashboard:v1:session:${sessionId}`;

describe("services/sessions/redis", () => {
    it("create() writes a session keyed by a fresh id, EXAT'd to the token's expiry", async () => {
        const fake = createFakeRedisClient();
        const store = sessions.newSessions(asRedisClient(fake));
        const user = fakeDiscordUser({ id: "42" });
        const token = fakeOAuth2Token({ expires_in: 100 });

        const before = Date.now();
        const result = await store.create(true, user, token);
        const after = Date.now();

        expect(result.isOk()).toBe(true);
        const session = result.unwrap();
        expect(session.isAdmin).toBe(true);
        expect(session.userId).toBe("42");
        expect(session.userToken).toEqual(token);
        expect(session.guildIds).toEqual([]);
        expect(session.expireAt.getTime()).toBeGreaterThanOrEqual(before + 100 * 1000);
        expect(session.expireAt.getTime()).toBeLessThanOrEqual(after + 100 * 1000);

        expect(fake.set).toHaveBeenCalledTimes(1);
        const [key, value, mode, exat] = fake.set.mock.calls[0] as [string, string, string, number];
        expect(key).toBe(sessionKey(session.sessionId));
        expect(JSON.parse(value)).toMatchObject({ sessionId: session.sessionId, userId: "42" });
        expect(mode).toBe("EXAT");
        expect(exat).toBe(Math.floor(session.expireAt.getTime() / 1000));
    });

    it("create() surfaces underlying redis failures as Err", async () => {
        const fake = createFakeRedisClient();
        fake.set.mockRejectedValueOnce(new Error("redis down"));
        const store = sessions.newSessions(asRedisClient(fake));

        const result = await store.create(false, fakeDiscordUser(), fakeOAuth2Token());

        expect(result.isErr()).toBe(true);
    });

    it("get() returns None when the key is missing", async () => {
        const fake = createFakeRedisClient();
        const store = sessions.newSessions(asRedisClient(fake));

        const result = await store.get("missing-session-id");

        expect(result.isOk()).toBe(true);
        expect(result.unwrap().isNone()).toBe(true);
    });

    it("get() rehydrates expireAt as a Date when the key is present", async () => {
        const fake = createFakeRedisClient();
        const session: Session = {
            isAdmin: false,
            sessionId: "abc",
            userId: "42",
            userToken: fakeOAuth2Token(),
            expireAt: new Date("2026-01-01T00:00:00.000Z"),
            guildIds: ["1", "2"],
        };
        fake.store.set(sessionKey("abc"), JSON.stringify(session));
        const store = sessions.newSessions(asRedisClient(fake));

        const result = await store.get("abc");

        expect(result.isOk()).toBe(true);
        const opt = result.unwrap();
        expect(opt.isSome()).toBe(true);
        const found = opt.unwrap();
        expect(found.expireAt).toBeInstanceOf(Date);
        expect(found.expireAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
        expect(found.guildIds).toEqual(["1", "2"]);
    });

    it("del() removes the session key", async () => {
        const fake = createFakeRedisClient();
        fake.store.set(sessionKey("abc"), "{}");
        const store = sessions.newSessions(asRedisClient(fake));

        const result = await store.del("abc");

        expect(result.isOk()).toBe(true);
        expect(fake.del).toHaveBeenCalledWith(sessionKey("abc"));
        expect(fake.store.has(sessionKey("abc"))).toBe(false);
    });

    it("del() surfaces underlying redis failures as Err", async () => {
        const fake = createFakeRedisClient();
        fake.del.mockRejectedValueOnce(new Error("redis down"));
        const store = sessions.newSessions(asRedisClient(fake));

        const result = await store.del("abc");

        expect(result.isErr()).toBe(true);
    });

    it("update() rewrites the session with its (possibly new) expireAt", async () => {
        const fake = createFakeRedisClient();
        const store = sessions.newSessions(asRedisClient(fake));
        const session: Session = {
            isAdmin: true,
            sessionId: "abc",
            userId: "42",
            userToken: fakeOAuth2Token(),
            expireAt: new Date(Date.now() + 60_000),
            guildIds: ["1"],
        };

        const result = await store.update(session);

        expect(result.isOk()).toBe(true);
        const [key, value, mode, exat] = fake.set.mock.calls[0] as [string, string, string, number];
        expect(key).toBe(sessionKey("abc"));
        expect(JSON.parse(value).guildIds).toEqual(["1"]);
        expect(mode).toBe("EXAT");
        expect(exat).toBe(Math.floor(session.expireAt.getTime() / 1000));
    });
});
