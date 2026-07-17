import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: fake Bun client instances tracked for assertions
const { redisInstances, sqlInstances } = vi.hoisted(() => ({ redisInstances: [] as any[], sqlInstances: [] as any[] }));

vi.mock("bun", () => {
    class FakeRedisClient {
        url: string;
        connect = vi.fn(async () => {});
        close = vi.fn(async () => {});
        constructor(url: string) {
            this.url = url;
            redisInstances.push(this);
        }
    }
    class FakeSQL {
        url: string;
        connect = vi.fn(async () => {});
        close = vi.fn(async () => {});
        constructor(url: string) {
            this.url = url;
            sqlInstances.push(this);
        }
    }
    return { RedisClient: FakeRedisClient, SQL: FakeSQL };
});

vi.mock("nitro", () => ({ definePlugin: (fn: unknown) => fn }));

const REQUIRED_ENV_KEYS = [
    "REDIS_URL",
    "DATABASE_URL",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "REDIRECT_URI",
    "ADMINS",
] as const;

const setAllRequiredEnv = () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.DATABASE_URL = "postgres://localhost/db";
    process.env.CLIENT_ID = "client-id";
    process.env.CLIENT_SECRET = "client-secret";
    process.env.REDIRECT_URI = "https://example.com/callback";
    process.env.ADMINS = "1,2";
};

const clearAllRequiredEnv = () => {
    for (const key of REQUIRED_ENV_KEYS) {
        delete process.env[key];
    }
};

describe("server/plugins/init", () => {
    beforeEach(() => {
        vi.resetModules();
        redisInstances.length = 0;
        sqlInstances.length = 0;
        clearAllRequiredEnv();
    });

    afterEach(() => {
        clearAllRequiredEnv();
        vi.unstubAllGlobals();
    });

    it.each(REQUIRED_ENV_KEYS)("throws a descriptive error when %s is missing", async (missingKey) => {
        setAllRequiredEnv();
        delete process.env[missingKey];

        await expect(import("./plugins/init")).rejects.toThrow(missingKey);
    });

    it("connects to redis/postgres and builds state when all required env vars are present", async () => {
        setAllRequiredEnv();

        const mod = await import("./plugins/init");

        expect(mod.state.oauth2Provider).toBeDefined();
        expect(mod.state.db).toBeDefined();
        expect(mod.state.cache).toBeDefined();
        expect(mod.state.sessions).toBeDefined();
        expect(redisInstances).toHaveLength(1);
        expect(sqlInstances).toHaveLength(1);
        expect(redisInstances[0].connect).toHaveBeenCalledTimes(1);
        expect(sqlInstances[0].connect).toHaveBeenCalledTimes(1);
    });

    it("dispose() closes both the redis and postgres clients", async () => {
        setAllRequiredEnv();
        const mod = await import("./plugins/init");

        await mod.state.dispose();

        expect(redisInstances[0].close).toHaveBeenCalledTimes(1);
        expect(sqlInstances[0].close).toHaveBeenCalledTimes(1);
    });

    it("updateTTS() replaces the tts getter's token source on success", async () => {
        setAllRequiredEnv();
        const fetchMock = vi.fn().mockResolvedValue(new Response("new-token"));
        vi.stubGlobal("fetch", fetchMock);
        const mod = await import("./plugins/init");

        const result = await mod.state.updateTTS("eastus", "new-api-key");

        expect(result.isOk()).toBe(true);
        const issued = await mod.state.tts.getIssueToken();
        expect(issued.token).toBe("new-token");
        expect(issued.region).toBe("eastus");
    });

    it("updateTTS() returns Err without disturbing the existing tts source on failure", async () => {
        setAllRequiredEnv();
        const fetchMock = vi.fn().mockRejectedValue(new Error("azure down"));
        vi.stubGlobal("fetch", fetchMock);
        const mod = await import("./plugins/init");

        const result = await mod.state.updateTTS("eastus", "bad-key");

        expect(result.isErr()).toBe(true);
    });
});
