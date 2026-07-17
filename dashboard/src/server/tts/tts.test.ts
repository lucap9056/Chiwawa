import { Ok } from "resultant.js/rustify";
import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "#/errors";
import { createFakeState, fakeSession } from "#/server/test/fakes";

vi.mock("#/services", () => ({ state: {} }));

import { getAccessTokenHandler } from "./handlers";

describe("getAccessTokenHandler", () => {
    it("returns TTS_NO_GUILD_ACCESS when the session has no guilds", async () => {
        const state = createFakeState();
        const session = fakeSession({ guildIds: [] });

        const message = await getAccessTokenHandler({ context: { state, session: Ok(session) } });

        expect(message).toEqual({ success: false, error: ErrorCode.TTS_NO_GUILD_ACCESS });
        expect(state.tts.getIssueToken).not.toHaveBeenCalled();
    });

    it("returns the issued token when the session has at least one guild", async () => {
        const state = createFakeState();
        const session = fakeSession({ guildIds: ["100"] });

        const message = await getAccessTokenHandler({ context: { state, session: Ok(session) } });

        expect(message.success).toBe(true);
        expect(state.tts.getIssueToken).toHaveBeenCalledTimes(1);
    });
});
