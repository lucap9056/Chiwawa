import { describe, expect, it } from "vitest";
import { asSql, createFakeSql, fakeAppConfig } from "#/server/test/fakes";
import database, { isNotFound } from "./postgres";

describe("services/database/postgres", () => {
    describe("getAppConfig", () => {
        it("maps a found row, defaulting null tts_region/tts_api_key/admins", async () => {
            const fake = createFakeSql();
            fake.queueResponse([
                {
                    default_join_suffix: "j",
                    default_leave_suffix: "l",
                    default_voice_model: "v",
                    tts_region: null,
                    tts_api_key: "key",
                    admins: null,
                },
            ]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.getAppConfig();

            expect(result.isOk()).toBe(true);
            const opt = result.unwrap();
            expect(opt.isSome()).toBe(true);
            expect(opt.unwrap()).toEqual({
                defaultJoinSuffix: "j",
                defaultLeaveSuffix: "l",
                defaultVoiceModel: "v",
                ttsRegion: undefined,
                ttsApiKey: "key",
                admins: [],
            });
        });

        it("returns None when no row exists yet", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.getAppConfig();

            expect(result.isOk()).toBe(true);
            expect(result.unwrap().isNone()).toBe(true);
        });
    });

    describe("setAppConfig", () => {
        it("upserts unconditionally in a single query", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.setAppConfig(fakeAppConfig({ admins: ["1", "2"] }));

            expect(result.isOk()).toBe(true);
            expect(fake.calls).toHaveLength(1);
            expect(fake.calls[0].text).toContain("ON CONFLICT (id)");
            expect(fake.calls[0].text).not.toContain("WHERE");
        });
    });

    describe("getUserSpeechNotice", () => {
        it("maps the global notice row when no guildId is given", async () => {
            const fake = createFakeSql();
            fake.queueResponse([
                {
                    inherit_global: false,
                    muted: true,
                    join_message: JSON.stringify({ prefix: "a", content: "b" }),
                    leave_message: null,
                },
            ]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.getUserSpeechNotice("42");

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual({
                inheritGlobal: false,
                muted: true,
                joinMessage: { prefix: "a", content: "b" },
                leaveMessage: undefined,
            });
        });

        it("maps the guild-specific notice row when a guildId is given", async () => {
            const fake = createFakeSql();
            fake.queueResponse([{ inherit_global: true, muted: false, join_message: null, leave_message: null }]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.getUserSpeechNotice("42", "100");

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual({
                inheritGlobal: true,
                muted: false,
                joinMessage: undefined,
                leaveMessage: undefined,
            });
        });

        it("returns a NotFoundError (isNotFound) when there is no user_configs row", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.getUserSpeechNotice("42");

            expect(result.isErr()).toBe(true);
            expect(isNotFound(result.unwrapErr())).toBe(true);
        });

        it("returns Err (not a thrown exception) for a non-numeric userId", async () => {
            const fake = createFakeSql();
            const db = database.newDatabase(asSql(fake));

            const result = await db.getUserSpeechNotice("not-a-snowflake");

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr().message).toContain("invalid user id");
        });
    });

    describe("getUserInheritGlobalGuildIds", () => {
        it("returns the guild ids whose guild-specific notice inherits the global one", async () => {
            const fake = createFakeSql();
            fake.queueResponse([{ guild_id: "100" }, { guild_id: "200" }]);
            const db = database.newDatabase(asSql(fake));

            const result = await db.getUserInheritGlobalGuildIds("42");

            expect(result.isOk()).toBe(true);
            expect(result.unwrap()).toEqual(["100", "200"]);
            expect(fake.calls[0].text).toContain("inherit_global = true");
        });

        it("returns Err (not a thrown exception) for a non-numeric userId", async () => {
            const fake = createFakeSql();
            const db = database.newDatabase(asSql(fake));

            const result = await db.getUserInheritGlobalGuildIds("not-a-snowflake");

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr().message).toContain("invalid user id");
        });
    });

    describe("setUserSpeechNotice", () => {
        it("global notice: inserts a new speech_notices row when the user has none yet", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]); // INSERT INTO user_configs
            fake.queueResponse([{ global_speech_notice_id: null }]); // SELECT ... FOR UPDATE
            fake.queueResponse([{ id: 7 }]); // INSERT INTO speech_notices RETURNING id
            fake.queueResponse([]); // UPDATE user_configs SET global_speech_notice_id
            const db = database.newDatabase(asSql(fake));

            const result = await db.setUserSpeechNotice("42", {
                inheritGlobal: false,
                muted: false,
                joinMessage: undefined,
                leaveMessage: undefined,
            });

            expect(result.isOk()).toBe(true);
            expect(fake.calls).toHaveLength(4);
            expect(fake.calls[2].text).toContain("INSERT INTO speech_notices");
            expect(fake.calls[3].text).toContain("UPDATE user_configs");
        });

        it("global notice: updates the existing speech_notices row when one is already linked", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]); // INSERT INTO user_configs
            fake.queueResponse([{ global_speech_notice_id: 5 }]); // SELECT ... FOR UPDATE
            fake.queueResponse([]); // UPDATE speech_notices
            const db = database.newDatabase(asSql(fake));

            const result = await db.setUserSpeechNotice("42", {
                inheritGlobal: false,
                muted: true,
                joinMessage: undefined,
                leaveMessage: undefined,
            });

            expect(result.isOk()).toBe(true);
            expect(fake.calls).toHaveLength(3);
            expect(fake.calls[2].text).toContain("UPDATE speech_notices");
        });

        it("guild notice: inserts a new speech_notices row and links it when none exists for that guild", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]); // INSERT INTO user_configs
            fake.queueResponse([{ global_speech_notice_id: null }]); // SELECT ... FOR UPDATE (unused for guild path)
            fake.queueResponse([]); // SELECT speech_notice_id FROM user_guild_notices -> none
            fake.queueResponse([{ id: 9 }]); // INSERT INTO speech_notices RETURNING id
            fake.queueResponse([]); // INSERT INTO user_guild_notices
            const db = database.newDatabase(asSql(fake));

            const result = await db.setUserSpeechNotice(
                "42",
                { inheritGlobal: true, muted: false, joinMessage: undefined, leaveMessage: undefined },
                "100",
            );

            expect(result.isOk()).toBe(true);
            expect(fake.calls).toHaveLength(5);
            expect(fake.calls[3].text).toContain("INSERT INTO speech_notices");
            expect(fake.calls[4].text).toContain("INSERT INTO user_guild_notices");
        });

        it("guild notice: updates the existing speech_notices row when one is already linked for that guild", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]); // INSERT INTO user_configs
            fake.queueResponse([{ global_speech_notice_id: null }]); // SELECT ... FOR UPDATE (unused for guild path)
            fake.queueResponse([{ speech_notice_id: 3 }]); // SELECT speech_notice_id FROM user_guild_notices
            fake.queueResponse([]); // UPDATE speech_notices
            const db = database.newDatabase(asSql(fake));

            const result = await db.setUserSpeechNotice(
                "42",
                { inheritGlobal: false, muted: true, joinMessage: undefined, leaveMessage: undefined },
                "100",
            );

            expect(result.isOk()).toBe(true);
            expect(fake.calls).toHaveLength(4);
            expect(fake.calls[3].text).toContain("UPDATE speech_notices");
        });

        it("returns Err (not a thrown exception) for a non-numeric guildId", async () => {
            const fake = createFakeSql();
            fake.queueResponse([]); // INSERT INTO user_configs
            fake.queueResponse([{ global_speech_notice_id: null }]); // SELECT ... FOR UPDATE
            const db = database.newDatabase(asSql(fake));

            const result = await db.setUserSpeechNotice(
                "42",
                { inheritGlobal: false, muted: false, joinMessage: undefined, leaveMessage: undefined },
                "not-a-snowflake",
            );

            expect(result.isErr()).toBe(true);
            expect(result.unwrapErr().message).toContain("invalid guild id");
        });
    });
});
