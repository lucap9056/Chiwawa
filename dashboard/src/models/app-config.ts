import { Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import type { AppConfig } from "./models";

const isOptionalString = (value: unknown): value is string | undefined =>
    value === undefined || typeof value === "string";

const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((v) => typeof v === "string");

export const validateAppConfig = (data: unknown): Result<AppConfig, ErrorCode> => {
    if (typeof data !== "object" || data === null) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }
    const { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModel, ttsRegion, ttsApiKey, admins } = data as Record<
        string,
        unknown
    >;

    if (
        typeof defaultJoinSuffix !== "string" ||
        typeof defaultLeaveSuffix !== "string" ||
        typeof defaultVoiceModel !== "string" ||
        !isOptionalString(ttsRegion) ||
        !isOptionalString(ttsApiKey) ||
        !isStringArray(admins)
    ) {
        return Err(ErrorCode.VALIDATION_FAILED);
    }

    return Ok({ defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModel, ttsRegion, ttsApiKey, admins });
};
