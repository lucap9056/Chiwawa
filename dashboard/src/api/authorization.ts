import { buildResultAsync, Err, Ok, type Result } from "resultant.js/rustify";
import { ErrorCode } from "#/errors";
import { getLoginUrl as getLoginUrlFn, login as loginFn, logout as logoutFn } from "#/server/authorization";
import { fetchFn } from "./lib";

const base64urlEncode = (arrayBuffer: ArrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return base64urlEncode(digest);
};

type DiscordLoginResultSuccess = { success: true; code: string };
type DiscordLoginResultFailed = { success: false; error: string };
export type DiscordLoginResult = { name: string; state: string } & (
    | DiscordLoginResultSuccess
    | DiscordLoginResultFailed
);

const popAuthWindow = (url: string, state: string): Promise<Result<string, ErrorCode>> => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const windowName = `authWindow_${randomSuffix}`;
    const authWindow = window.open(url, windowName, "width=460,height=620");
    if (!authWindow) {
        return Promise.resolve(Err(ErrorCode.AUTH_POPUP_BLOCKED));
    }

    const resolvers = Promise.withResolvers<Result<string, ErrorCode>>();
    const promise: Promise<Result<string, ErrorCode>> = resolvers.promise;
    const resolve: (ok: Result<string, ErrorCode>) => void = resolvers.resolve;

    const checkWindowClosed = setInterval(() => {
        if (authWindow.closed) {
            clearInterval(checkWindowClosed);
            resolve(Err(ErrorCode.AUTH_LOGIN_CANCELLED));
        }
    }, 500);

    const handler = async (e: MessageEvent<DiscordLoginResult>) => {
        if (e.source !== authWindow || e.origin !== window.location.origin) return;

        if (e.data.name !== windowName || e.data.state !== state) return;

        clearInterval(checkWindowClosed);

        if (e.data.success) {
            resolve(Ok(e.data.code));
        } else {
            resolve(Err(ErrorCode.AUTH_DISCORD_LOGIN_FAILED));
        }
    };

    promise.finally(() => {
        window.removeEventListener("message", handler);
        clearInterval(checkWindowClosed);
        authWindow.close();
    });

    window.addEventListener("message", handler);
    return promise;
};

const generateCodeVerifier = () =>
    crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: "base64url" }).replace(/=$/, "");

const generateCodeChallengePair = async (): Promise<{ codeVerifier: string; codeChallenge: string }> => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
};

export const login = async (): Promise<Result<boolean, ErrorCode>> => {
    const codeGenResult = await buildResultAsync(generateCodeChallengePair);

    return codeGenResult
        .mapErr<ErrorCode>(() => ErrorCode.AUTH_CHALLENGE_GENERATION_FAILED)
        .andThenAsync(async ({ codeVerifier, codeChallenge }) => {
            const getUrlResult = await fetchFn(getLoginUrlFn({ data: { codeChallenge } }));

            return getUrlResult.andThenAsync(async ({ oauth2Url, oauth2State }) => {
                const popResult = await popAuthWindow(oauth2Url, oauth2State);
                return popResult.andThenAsync(async (oauth2Code) => {
                    return await fetchFn(loginFn({ data: { oauth2Code, oauth2State, codeVerifier } }));
                });
            });
        });
};

export const logout = async (): Promise<Result<boolean, ErrorCode>> => fetchFn(logoutFn());
