import { createServerFn } from "@tanstack/react-start";
import { Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import { resultHandler, sessionMiddleware } from "#/server/middlware";
import type { State } from "#/services";
import type { IssueToken } from "#/services/microsoft-tts";
import type { Session } from "#/services/sessions";

interface GetAccessTokenCtx {
    context: { state: State; session: Result<Session, ErrorCode> };
}

export const getAccessTokenHandler = resultHandler(
    ({ context: { state, session: sessionResult } }: GetAccessTokenCtx) =>
        sessionResult.andThenAsync(async (session) => {
            if (session.guildIds.length === 0) {
                return Err(ErrorCode.TTS_NO_GUILD_ACCESS);
            }
            return Ok<IssueToken, ErrorCode>(await state.tts.getIssueToken());
        }),
);

export const getAccessToken = createServerFn().middleware([sessionMiddleware]).handler(getAccessTokenHandler);
