import { Err, Ok } from "resultant.js/rustify";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ErrorCode } from "#/errors";

vi.mock("#/services", () => ({ state: {} }));

import { resultHandler, validateDetails } from "./index";

describe("resultHandler", () => {
    it("maps Ok(undefined) to a success envelope carrying the value", async () => {
        const handler = resultHandler(async () => Ok<undefined, ErrorCode>(undefined));

        const message = await handler(undefined);

        expect(message).toEqual({ success: true, result: undefined });
        expect("result" in message).toBe(true);
    });

    it("maps Ok(null) to a success envelope carrying the value", async () => {
        const handler = resultHandler(async () => Ok<null, ErrorCode>(null));

        const message = await handler(undefined);

        expect(message).toEqual({ success: true, result: null });
    });

    it("maps Ok(value) to a success envelope carrying the value", async () => {
        const handler = resultHandler(async () => Ok<{ id: number }, ErrorCode>({ id: 42 }));

        const message = await handler(undefined);

        expect(message).toEqual({ success: true, result: { id: 42 } });
    });

    it("maps Err(code) to an error envelope", async () => {
        const handler = resultHandler(async () => Err<void, ErrorCode>(ErrorCode.SESSION_NOT_FOUND));

        const message = await handler(undefined);

        expect(message).toEqual({ success: false, error: ErrorCode.SESSION_NOT_FOUND });
    });
});

describe("validateDetails", () => {
    const schema = z.string().length(3, "must be exactly 3 characters");

    it("returns Ok with the parsed value when the schema is satisfied", () => {
        const result = validateDetails(schema, "abc");

        expect(result).toEqual(Ok("abc"));
    });

    it("returns Err(VALIDATION_FAILED) when the schema rejects the value", () => {
        const result = validateDetails(schema, "too-long");

        expect(result).toEqual(Err(ErrorCode.VALIDATION_FAILED));
    });
});
