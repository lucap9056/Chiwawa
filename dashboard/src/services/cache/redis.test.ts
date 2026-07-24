import { describe, expect, it } from "vitest";
import { asRedisClient, createFakeRedisClient, fakeAppConfig } from "#/server/test/fakes";
import { CONFIG_UPDATED_CHANNEL, GUILD_IDS_KEY } from "./protocol";
import cache from "./redis";

describe("services/cache/redis", () => {
    describe("intersectGuildIds", () => {
        it("returns [] without calling smismember when given no guild ids", async () => {
            const fake = createFakeRedisClient();
            const store = cache.newCache(asRedisClient(fake));

            const result = await store.intersectGuildIds([]);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual([]);
            expect(fake.smismember).not.toHaveBeenCalled();
        });

        it("filters to only the guild ids the bot is a member of", async () => {
            const fake = createFakeRedisClient();
            fake.sets.set(GUILD_IDS_KEY, new Set(["1", "3"]));
            const store = cache.newCache(asRedisClient(fake));

            const result = await store.intersectGuildIds(["1", "2", "3"]);

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual(["1", "3"]);
            expect(fake.smismember).toHaveBeenCalledWith(GUILD_IDS_KEY, "1", "2", "3");
        });

        it("surfaces underlying redis failures as Err", async () => {
            const fake = createFakeRedisClient();
            fake.smismember.mockRejectedValueOnce(new Error("redis down"));
            const store = cache.newCache(asRedisClient(fake));

            const result = await store.intersectGuildIds(["1"]);

            expect(result.isErr()).toBe(true);
        });
    });

    describe("saveConfig", () => {
        it("publishes the config as JSON on the config-updated channel", async () => {
            const fake = createFakeRedisClient();
            const store = cache.newCache(asRedisClient(fake));
            const config = fakeAppConfig({ defaultJoinSuffix: "hi" });

            const result = await store.saveConfig(config);

            expect(result.isOk()).toBe(true);
            expect(fake.publish).toHaveBeenCalledWith(CONFIG_UPDATED_CHANNEL, JSON.stringify(config));
        });

        it("surfaces underlying redis failures as Err", async () => {
            const fake = createFakeRedisClient();
            fake.publish.mockRejectedValueOnce(new Error("redis down"));
            const store = cache.newCache(asRedisClient(fake));

            const result = await store.saveConfig(fakeAppConfig());

            expect(result.isErr()).toBe(true);
        });
    });
});
