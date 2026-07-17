import { getAccessToken as getAccessTokenFn, getVoiceModels as getVoiceModelsFn } from "#/server/tts";
import { fetchFn } from "./lib";

export const getAccessToken = () => {
    return fetchFn(getAccessTokenFn());
};

export const getVoiceModels = () => {
    return fetchFn(getVoiceModelsFn());
};
