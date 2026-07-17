import { Err, Ok, type Result } from "resultant.js/rustify";
import { type ErrorCode, networkError } from "#/errors";
import type { ErrorMessage, ResponseMessage } from "#/server/messages";

export const fetchFn = async <T>(fn: Promise<ResponseMessage<T>>): Promise<Result<T, ErrorCode>> => {
    const resp = await fn.catch((err): ErrorMessage => {
        const error = networkError(err);
        console.error(`Server fn call failed (${error}):`, err);
        return { success: false, error };
    });

    if (resp.success) {
        return Ok(resp.result);
    }
    return Err(resp.error);
};
