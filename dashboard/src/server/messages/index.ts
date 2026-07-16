import type { ErrorCode } from "#/errors";

type BaseMessage = {
    success: boolean;
};

export type SuccessMessage<R> = BaseMessage & {
    success: true;
    result: R;
};

export type ErrorMessage = BaseMessage & {
    success: false;
    error: ErrorCode;
};

export type ResponseMessage<R> = SuccessMessage<R> | ErrorMessage;

export const isSuccessMessage = <R>(msg: ResponseMessage<R>): msg is SuccessMessage<R> => {
    return msg.success && "result" in msg;
};

export const isErrorMessage = <R>(msg: ResponseMessage<R>): msg is ErrorMessage => {
    return !msg.success;
};
