import type { ErrorCode } from "#/errors";

type BaseMessage = {
    success: boolean;
};

export type BaseSuccessMessage = BaseMessage & {
    success: true;
};

export type SuccessMessage<R> = BaseSuccessMessage & {
    result: R;
};

export type ErrorMessage = BaseMessage & {
    success: false;
    error: ErrorCode;
};

export type ResponseMessage<R> = BaseSuccessMessage | SuccessMessage<R> | ErrorMessage;
