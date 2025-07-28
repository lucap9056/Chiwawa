"use client";
import { RetrieveProfile, UpdateAppConfig, UpdateUserSpeechNotice } from "server/profile";
import { GetDiscordLoginUrl, Login, Logout } from "server/authorization";
import { buildResult, Result } from "resultant.js/rustify";
import { SpeechNotice } from "structs/user-config";
import { AdminAppConfig } from "structs/app-config";

const ExternalPromise = <T>(): Promise<{
    resolve: (arg0: T) => void
    reject: (err: Error) => void
    promise: Promise<T>
}> => {
    return new Promise((res) => {
        let resolveFn: (arg0: T) => void;
        let rejectFn: (err: Error) => void;

        const promise = new Promise<T>((resolve, reject) => {
            resolveFn = resolve;
            rejectFn = reject;
        });

        res({
            resolve: resolveFn!,
            reject: rejectFn!,
            promise: promise
        });
    });
}

type DiscordLoginSuccess = {
    success: true
    code: string
}

type DiscordLoginFalied = {
    success: false
    error: Error
}

export type DiscordLoginResult = DiscordLoginSuccess | DiscordLoginFalied;

const AuthWindow = async (): Promise<void> => {
    const externalPromise = ExternalPromise<void>();

    const getDiscordLoginUrl = await Result.From(GetDiscordLoginUrl());
    if (getDiscordLoginUrl.isErr()) {
        throw getDiscordLoginUrl.unwrapErr();
    }

    const url = getDiscordLoginUrl.unwrap();

    const authWindow = window.open(url, "authWindow", "width=460,height=620");

    if (!authWindow) throw new Error();

    const { resolve, reject, promise } = await externalPromise;

    const checkWindowClosed = setInterval(() => {
        if (authWindow.closed) {
            clearInterval(checkWindowClosed);
            window.removeEventListener("message", handler);
            reject(new Error("User closed the authentication window."));
        }
    }, 500);

    const handler = async (e: MessageEvent<DiscordLoginResult>) => {
        if (e.source !== authWindow || e.origin != authWindow.origin) return;

        const result = e.data;

        if (result.success) {
            Login(result.code).then(() => {
                resolve();
            }).catch(reject);
        } else {
            reject(result.error);
        }

        clearInterval(checkWindowClosed);
        window.removeEventListener("message", handler);
    }

    window.addEventListener("message", handler);

    return promise;
}

const login = (): Promise<Result<void, Error>> => buildResult(AuthWindow);

const logout = () => Result.From(Logout());

const retrieveProfile = () => Result.From(RetrieveProfile());

const updateUserSpeechNotice = (updatedSpeechNotice: SpeechNotice, guildId: string = "") =>
    Result.From(UpdateUserSpeechNotice(updatedSpeechNotice, guildId));

const updateAppConfig = (config: AdminAppConfig) => Result.From(UpdateAppConfig(config));

export default {
    login,
    logout,
    retrieveProfile,
    updateUserSpeechNotice,
    updateAppConfig,
}