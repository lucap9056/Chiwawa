import { createMiddleware } from "@tanstack/react-start";
import { Err, matchAsync, Ok, type Result } from "resultant.js/rustify";
import type { z } from "zod";
import { ErrorCode } from "#/errors";
import type { ErrorMessage, ResponseMessage, SuccessMessage } from "#/server/messages";
import { checkSession, getSession } from "#/server/sessions";
import { state } from "#/services";

export const serverStateMiddleware = createMiddleware().server(async ({ next }) => next({ context: { state } }));

// `session` is a Result, not a bare Session, so auth failures flow into
// resultHandler's envelope like any other domain error instead of throwing.
export const sessionMiddleware = createMiddleware()
    .middleware([serverStateMiddleware])
    .server(async ({ context: { state }, next }) => {
        const session = await getSession(state).then((s) => checkSession(state, s));
        return next({ context: { session } });
    });

// Second-tier validation: `.validator()` only checks type shape (throws on
// mismatch, treated as "should never happen" from a well-behaved client — see
// project_dashboard_error_boundary). Detail constraints (length, format, ...)
// are re-checked here, inside the handler, so an out-of-spec-but-well-typed
// value comes back as a normal Err(VALIDATION_FAILED) instead of a raw throw.
export const validateDetails = <T>(schema: z.ZodType<T>, data: unknown): Result<T, ErrorCode> => {
    const parsed = schema.safeParse(data);
    return parsed.success ? Ok(parsed.data) : Err(ErrorCode.VALIDATION_FAILED);
};

export const resultHandler = <CTX, V>(handler: (ctx: CTX) => Promise<Result<V, ErrorCode>>) => {
    return async (c: CTX) =>
        matchAsync<V, ErrorCode, ResponseMessage<V>>(handler(c), {
            Ok: (v): SuccessMessage<V> => {
                return { success: true, result: v };
            },
            Err: (err): ErrorMessage => ({ success: false, error: err }),
        });
};
