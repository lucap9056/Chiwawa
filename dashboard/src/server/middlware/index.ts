import { createMiddleware } from "@tanstack/react-start";
import { matchAsync, type Result } from "resultant.js/rustify";
import type { ErrorCode } from "#/errors";
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

export const resultHandler = <CTX, V>(handler: (ctx: CTX) => Promise<Result<V, ErrorCode>>) => {
    return async (c: CTX) =>
        matchAsync<V, ErrorCode, ResponseMessage<V>>(handler(c), {
            Ok: (v): SuccessMessage<V> => {
                return { success: true, result: v };
            },
            Err: (err): ErrorMessage => ({ success: false, error: err }),
        });
};
