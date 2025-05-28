type GoifyResult<T, E = Error> = [T, null] | [null, E];

/**
 * Executes an asynchronous operation and returns its result or any caught error.
 * This function mimics the Go-style error handling, returning a tuple where the first element
 * is the successful result and the second element is an error object if the operation fails.
 *
 * @template T The expected type of the successful result from the operation.
 * @param {function(): Promise<T>} operation The asynchronous function to be executed.
 * @returns {Promise<GoifyResult<T, E>>} A promise that resolves to an GoifyResult tuple.
 * If the operation succeeds, the first element is the result and the second is null.
 * If the operation fails, the first element is null and the second is an Error object.
 */
export const goify = async <T, E = Error>(operation: () => Promise<T> | T): Promise<GoifyResult<T, E>> => {
    try {
        const result = await operation();
        return [result, null];
    } catch (caughtError: unknown) {
        return [null, caughtError as E];
    }
};