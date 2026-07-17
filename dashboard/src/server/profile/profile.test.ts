import { Err, None, Ok, Some } from "resultant.js/rustify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "#/errors";
import type { AppConfig } from "#/models";
import {
    createFakeState,
    fakeAppConfig,
    fakeDiscordGuild,
    fakeDiscordUser,
    fakeSession,
    fakeSpeechNotice,
} from "#/server/test/fakes";
import { NotFoundError } from "#/services/database";
import type { DiscordGuild } from "#/services/oauth2-provider";

vi.mock("#/services", () => ({ state: {} }));

import {
    getGuildMemberHandler,
    getUserSpeechNoticeHandler,
    retrieveProfileHandler,
    updateAppConfigHandler,
    updateUserSpeechNoticeHandler,
} from "./handlers";

afterEach(() => {
    vi.restoreAllMocks();
});

interface ProfileResult {
    isAdmin: boolean;
    appConfig: { admins: string[]; ttsApiKey?: string };
    guilds: unknown[];
}

const expectProfile = (message: { success: boolean; result?: unknown }): ProfileResult => {
    if (!message.success) {
        throw new Error(`expected a successful result, got ${JSON.stringify(message)}`);
    }
    return message.result as ProfileResult;
};

describe("retrieveProfileHandler", () => {
    it("returns AUTH_USER_FETCH_FAILED when fetching the Discord user fails", async () => {
        const state = createFakeState();
        vi.mocked(state.oauth2Provider.getUser).mockResolvedValueOnce(Err(new Error("discord down")));

        const message = await retrieveProfileHandler({ context: { state, session: Ok(fakeSession()) } });

        expect(message).toEqual({ success: false, error: ErrorCode.AUTH_USER_FETCH_FAILED });
    });

    it("returns DISCORD_API_ERROR when fetching guilds fails", async () => {
        const state = createFakeState();
        vi.mocked(state.oauth2Provider.getGuilds).mockResolvedValueOnce(Err(new Error("discord down")));

        const message = await retrieveProfileHandler({ context: { state, session: Ok(fakeSession()) } });

        expect(message).toEqual({ success: false, error: ErrorCode.DISCORD_API_ERROR });
    });

    it("returns DATABASE_QUERY_FAILED when loading the app config fails", async () => {
        const state = createFakeState();
        vi.mocked(state.db.getAppConfig).mockResolvedValueOnce(Err(new Error("db down")));

        const message = await retrieveProfileHandler({ context: { state, session: Ok(fakeSession()) } });

        expect(message).toEqual({ success: false, error: ErrorCode.DATABASE_QUERY_FAILED });
    });

    it("falls back to an empty app config when none exists yet", async () => {
        const state = createFakeState();
        vi.mocked(state.db.getAppConfig).mockResolvedValueOnce(Ok(None<AppConfig>()));
        const user = fakeDiscordUser({ id: "1" });
        vi.mocked(state.oauth2Provider.getUser).mockResolvedValueOnce(Ok(user));

        const message = await retrieveProfileHandler({ context: { state, session: Ok(fakeSession()) } });

        const profile = expectProfile(message);
        expect(profile.appConfig.admins).toEqual([]);
        expect(profile.isAdmin).toBe(false);
    });

    it("computes isAdmin from the app config admins list and hides ttsApiKey/admins from non-admins", async () => {
        const state = createFakeState();
        const user = fakeDiscordUser({ id: "1" });
        vi.mocked(state.oauth2Provider.getUser).mockResolvedValueOnce(Ok(user));
        vi.mocked(state.db.getAppConfig).mockResolvedValueOnce(
            Ok(Some(fakeAppConfig({ admins: ["2"], ttsApiKey: "super-secret" }))),
        );

        const message = await retrieveProfileHandler({ context: { state, session: Ok(fakeSession()) } });

        const profile = expectProfile(message);
        expect(profile.isAdmin).toBe(false);
        expect(profile.appConfig.admins).toEqual([]);
        expect(Object.hasOwn(profile.appConfig, "ttsApiKey")).toBe(false);
    });

    it("does not hide ttsApiKey/admins when the caller is an admin", async () => {
        const state = createFakeState();
        const user = fakeDiscordUser({ id: "1" });
        vi.mocked(state.oauth2Provider.getUser).mockResolvedValueOnce(Ok(user));
        vi.mocked(state.db.getAppConfig).mockResolvedValueOnce(
            Ok(Some(fakeAppConfig({ admins: ["1"], ttsApiKey: "super-secret" }))),
        );

        const message = await retrieveProfileHandler({ context: { state, session: Ok(fakeSession()) } });

        const profile = expectProfile(message);
        expect(profile.isAdmin).toBe(true);
        expect(profile.appConfig.ttsApiKey).toBe("super-secret");
    });

    it("filters guilds down to the intersection reported by the cache, and updates the session", async () => {
        const state = createFakeState();
        const guilds: DiscordGuild[] = [fakeDiscordGuild({ id: "10" }), fakeDiscordGuild({ id: "20" })];
        vi.mocked(state.oauth2Provider.getGuilds).mockResolvedValueOnce(Ok(guilds));
        vi.mocked(state.cache.intersectGuildIds).mockResolvedValueOnce(Ok(["10"]));
        const session = fakeSession({ userId: "1" });

        const message = await retrieveProfileHandler({ context: { state, session: Ok(session) } });

        const profile = expectProfile(message);
        expect(profile.guilds).toEqual([guilds[0]]);
        expect(state.sessions.update).toHaveBeenCalledWith(expect.objectContaining({ guildIds: ["10"] }));
    });
});

describe("getUserSpeechNoticeHandler", () => {
    it("maps a NotFoundError to DATABASE_NOT_FOUND", async () => {
        const state = createFakeState();
        vi.mocked(state.db.getUserSpeechNotice).mockResolvedValueOnce(Err(new NotFoundError("user config")));

        const message = await getUserSpeechNoticeHandler({
            context: { state, session: Ok(fakeSession()) },
            data: {},
        });

        expect(message).toEqual({ success: false, error: ErrorCode.DATABASE_NOT_FOUND });
    });

    it("maps any other db error to PROFILE_SPEECH_NOTICE_FETCH_FAILED", async () => {
        const state = createFakeState();
        vi.mocked(state.db.getUserSpeechNotice).mockResolvedValueOnce(Err(new Error("db down")));

        const message = await getUserSpeechNoticeHandler({
            context: { state, session: Ok(fakeSession()) },
            data: {},
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_SPEECH_NOTICE_FETCH_FAILED });
    });

    it("returns the notice on success", async () => {
        const state = createFakeState();
        const notice = fakeSpeechNotice({ muted: true });
        vi.mocked(state.db.getUserSpeechNotice).mockResolvedValueOnce(Ok(notice));

        const message = await getUserSpeechNoticeHandler({
            context: { state, session: Ok(fakeSession()) },
            data: {},
        });

        expect(message).toEqual({ success: true, result: notice });
    });
});

describe("updateUserSpeechNoticeHandler", () => {
    it("returns PROFILE_GUILD_NOT_JOINED when the guildId isn't in the session's guildIds", async () => {
        const state = createFakeState();
        const session = fakeSession({ guildIds: ["1"] });

        const message = await updateUserSpeechNoticeHandler({
            context: { state, session: Ok(session) },
            data: { speechNotice: fakeSpeechNotice(), guildId: "999" },
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_GUILD_NOT_JOINED });
        expect(state.db.setUserSpeechNotice).not.toHaveBeenCalled();
    });

    it("invalidates the speech cache after a successful guild-scoped update", async () => {
        const state = createFakeState();
        const session = fakeSession({ userId: "1", guildIds: ["100"] });

        const message = await updateUserSpeechNoticeHandler({
            context: { state, session: Ok(session) },
            data: { speechNotice: fakeSpeechNotice(), guildId: "100" },
        });

        expect(message.success).toBe(true);
        expect(state.cache.delSpeech).toHaveBeenCalledWith("1", ["100"]);
    });

    it("invalidates the speech cache for every guild inheriting the global notice on a global (no guildId) update", async () => {
        const state = createFakeState();
        const session = fakeSession({ userId: "1", guildIds: ["100", "200"] });
        vi.mocked(state.db.getUserInheritGlobalGuildIds).mockResolvedValueOnce(Ok(["100", "200"]));

        const message = await updateUserSpeechNoticeHandler({
            context: { state, session: Ok(session) },
            data: { speechNotice: fakeSpeechNotice() },
        });

        expect(message.success).toBe(true);
        expect(state.db.getUserInheritGlobalGuildIds).toHaveBeenCalledWith("1");
        await vi.waitFor(() => {
            expect(state.cache.delSpeech).toHaveBeenCalledWith("1", ["100", "200"]);
        });
    });

    it("returns PROFILE_SPEECH_NOTICE_UPDATE_FAILED when the db write fails", async () => {
        const state = createFakeState();
        vi.mocked(state.db.setUserSpeechNotice).mockResolvedValueOnce(Err(new Error("db down")));

        const message = await updateUserSpeechNoticeHandler({
            context: { state, session: Ok(fakeSession()) },
            data: { speechNotice: fakeSpeechNotice() },
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_SPEECH_NOTICE_UPDATE_FAILED });
    });
});

describe("updateAppConfigHandler", () => {
    it("returns PROFILE_ADMIN_REQUIRED without writing when the caller isn't an admin", async () => {
        const state = createFakeState();
        const session = fakeSession({ isAdmin: false });

        const message = await updateAppConfigHandler({
            context: { state, session: Ok(session) },
            data: { appConfig: fakeAppConfig() },
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_ADMIN_REQUIRED });
        expect(state.db.setAppConfig).not.toHaveBeenCalled();
    });

    it("writes the config and fires off TTS/cache sync when the caller is an admin", async () => {
        const state = createFakeState();
        const session = fakeSession({ isAdmin: true, userId: "1" });
        const appConfig = fakeAppConfig({ ttsRegion: "eastus", ttsApiKey: "key" });

        const message = await updateAppConfigHandler({ context: { state, session: Ok(session) }, data: { appConfig } });

        expect(message.success).toBe(true);
        expect(state.db.setAppConfig).toHaveBeenCalledWith(appConfig);
        expect(state.updateTTS).toHaveBeenCalledWith("eastus", "key");
        expect(state.cache.saveConfig).toHaveBeenCalledWith(appConfig);
    });

    it("returns PROFILE_APP_CONFIG_UPDATE_FAILED when the db write fails", async () => {
        const state = createFakeState();
        const session = fakeSession({ isAdmin: true });
        vi.mocked(state.db.setAppConfig).mockResolvedValueOnce(Err(new Error("db down")));

        const message = await updateAppConfigHandler({
            context: { state, session: Ok(session) },
            data: { appConfig: fakeAppConfig() },
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_APP_CONFIG_UPDATE_FAILED });
        expect(state.updateTTS).not.toHaveBeenCalled();
    });
});

describe("getGuildMemberHandler", () => {
    it("returns PROFILE_GUILD_NOT_JOINED when the guild isn't in the session's guildIds", async () => {
        const state = createFakeState();
        const session = fakeSession({ guildIds: ["1"] });

        const message = await getGuildMemberHandler({
            context: { state, session: Ok(session) },
            data: { guildId: "999" },
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_GUILD_NOT_JOINED });
        expect(state.oauth2Provider.getGuildMember).not.toHaveBeenCalled();
    });

    it("passes through the oauth2Provider result on success", async () => {
        const state = createFakeState();
        const session = fakeSession({ guildIds: ["100"] });

        const message = await getGuildMemberHandler({
            context: { state, session: Ok(session) },
            data: { guildId: "100" },
        });

        expect(message.success).toBe(true);
        expect(state.oauth2Provider.getGuildMember).toHaveBeenCalledWith(session.userToken, "100");
    });

    it("returns PROFILE_GUILD_MEMBER_FETCH_FAILED when the fetch fails", async () => {
        const state = createFakeState();
        const session = fakeSession({ guildIds: ["100"] });
        vi.mocked(state.oauth2Provider.getGuildMember).mockResolvedValueOnce(Err(new Error("discord down")));

        const message = await getGuildMemberHandler({
            context: { state, session: Ok(session) },
            data: { guildId: "100" },
        });

        expect(message).toEqual({ success: false, error: ErrorCode.PROFILE_GUILD_MEMBER_FETCH_FAILED });
    });
});
