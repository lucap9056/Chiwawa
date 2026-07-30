import { Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import type { MessageTemplate } from "./models";

const isOptionalString = (value: unknown): value is string | undefined =>
    value === undefined || typeof value === "string";

export const validateMessageTemplate = (data: unknown): Result<MessageTemplate, ErrorCode> => {
    if (typeof data !== "object" || data === null) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }
    const { prefix, content, suffix, language, voiceModel } = data as Record<string, unknown>;

    if (
        typeof prefix !== "string" ||
        typeof content !== "string" ||
        !isOptionalString(suffix) ||
        !isOptionalString(language) ||
        !isOptionalString(voiceModel)
    ) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }

    return Ok({ prefix, content, suffix, language, voiceModel });
};
