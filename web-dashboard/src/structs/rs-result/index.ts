type OkResult<T> = { ok: T };
type ErrResult = { error: string };
export type RsResult<T> = OkResult<T> | ErrResult;

type RsOk<T> = (value: T) => void
type RsErr = (err: string) => void

export const Result = async <T>(func: (Ok: RsOk<T>, Err: RsErr) => Promise<void> | void): Promise<RsResult<T>> => {
    return new Promise(async (resolve: (res: RsResult<T>) => void) => {

        const Ok = (ok: T) => resolve({ ok });

        const Err = (error: string) => resolve({ error });

        try {
            await func(Ok, Err);
        }
        catch (err: any) {
            const errorMessage = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'unknown');
            Err(errorMessage);
        }
    });
}

export const match = <T>(result: RsResult<T>, Ok: RsOk<T>, Err: RsErr) => {
    if ('ok' in result) {
        Ok(result.ok);
    }
    else {
        Err(result.error);
    }
}

export const isOk = (result: RsResult<any>) => 'ok' in result;
export const isErr = (result: RsResult<any>) => 'error' in result;

export const getOrThrow = <T>(result: RsResult<T>) => {
    if (isErr(result)) {
        throw new Error(result.error);
    }
    return result.ok;
};

export const getOk = <T>(result: OkResult<T>): T => result.ok;
export const getErr = (result: ErrResult): Error => new Error(result.error);