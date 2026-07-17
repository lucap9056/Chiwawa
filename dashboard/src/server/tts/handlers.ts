import { Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import { resultHandler } from "#/server/middlware";
import type { State } from "#/services";
import type { IssueToken, Languages } from "#/services/microsoft-tts";
import type { Session } from "#/services/sessions";

interface GetAccessTokenCtx {
    context: { state: State; session: Result<Session, ErrorCode> };
}

export const getAccessTokenHandler = resultHandler(
    ({ context: { state, session: sessionResult } }: GetAccessTokenCtx) =>
        sessionResult.andThenAsync(async (session) => {
            if (session.guildIds.length === 0 && !session.isAdmin) {
                return Err<IssueToken, ErrorCode>(ErrorCode.TTS_NO_GUILD_ACCESS);
            }
            return Ok<IssueToken, ErrorCode>(await state.tts.getIssueToken());
        }),
);

interface GetVoiceModelsCtx {
    context: { state: State; session: Result<Session, ErrorCode> };
}

// Reads the server's cached catalog (see initializeTTS) — only the first caller after a
// (re)start pays for the network round-trip, everyone after gets the cached copy. Unlike
// getAccessTokenHandler there's no need to gate this behind guild access; it's static
// metadata, not a usable Microsoft credential.
export const getVoiceModelsHandler = resultHandler(
    ({ context: { state, session: sessionResult } }: GetVoiceModelsCtx) =>
        sessionResult.andThenAsync(async () => Ok<Languages, ErrorCode>(await state.tts.getLanguages())),
);
