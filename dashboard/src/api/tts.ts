import { getAccessToken as getAccessTokenFn } from "#/server/tts";
import { fetchFn } from "./lib";

export const getAccessToken = () => {
    return fetchFn(getAccessTokenFn());
};
