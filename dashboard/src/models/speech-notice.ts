import { Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import { validateMessageTemplate } from "./message-template";
import type { MessageTemplate, SpeechNotice } from "./models";

const validateOptionalMessageTemplate = (data: unknown): Result<MessageTemplate | undefined, ErrorCode> =>
    data === undefined ? Ok(undefined) : validateMessageTemplate(data);

export const validateSpeechNotice = (data: unknown): Result<SpeechNotice, ErrorCode> => {
    if (typeof data !== "object" || data === null) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }
    const { inheritGlobal, muted, joinMessage, leaveMessage } = data as Record<string, unknown>;

    if (typeof inheritGlobal !== "boolean" || typeof muted !== "boolean") {
        return Err(ErrorCode.VALIDATION_FAILED);
    }

    return validateOptionalMessageTemplate(joinMessage).andThen((join) =>
        validateOptionalMessageTemplate(leaveMessage).map((leave) => ({
            inheritGlobal,
            muted,
            joinMessage: join,
            leaveMessage: leave,
        })),
    );
};
