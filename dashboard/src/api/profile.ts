import type { AppConfig, SpeechNotice } from "#/models";
import {
    getGuildMember as getGuildMemberFn,
    getUserSpeechNotice as getUserSpeechNoticeFn,
    retrieveProfile as retrieveProfileFn,
    updateAppConfig as updateAppConfigFn,
    updateUserSpeechNotice as updateUserSpeechNoticeFn,
} from "#/server/profile";
import { fetchFn } from "./lib";

export const retrieveProfile = () => {
    return fetchFn(retrieveProfileFn());
};

export const getUserSpeechNotice = (guildId?: string) => {
    return fetchFn(getUserSpeechNoticeFn({ data: { guildId } }));
};

export const updateUserSpeechNotice = (speechNotice: SpeechNotice, guildId?: string) => {
    return fetchFn(updateUserSpeechNoticeFn({ data: { speechNotice, guildId } }));
};

export const updateAppConfig = (appConfig: AppConfig) => {
    return fetchFn(updateAppConfigFn({ data: { appConfig } }));
};

export const getGuildMember = (guildId: string) => {
    return fetchFn(getGuildMemberFn({ data: { guildId } }));
};
