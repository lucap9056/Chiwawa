import { Err, Ok } from "resultant.js/rustify";
import { describe, expect, it, vi } from "vitest";
import { ErrorCode } from "#/errors";

vi.mock("#/services", () => ({ state: {} }));

import { resultHandler } from "./index";

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
