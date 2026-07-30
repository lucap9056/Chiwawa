import { createServerFn } from "@tanstack/react-start";
import { serverStateMiddleware, sessionMiddleware } from "#/server/middlware";
import { getLoginUrlHandler, loginHandler, logoutHandler } from "./handlers";

export const getLoginUrl = createServerFn()
    .middleware([serverStateMiddleware])
    .validator((data: { codeChallenge: string }) => data)
    .handler(getLoginUrlHandler);

export const generateCodeVerifier = () =>
    crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: "base64url" }).replace(/=$/, "");

export const login = createServerFn()
    .middleware([serverStateMiddleware])
    .validator((data: { oauth2Code: string; oauth2State: string; codeVerifier: string }) => data)
    .handler(loginHandler);

export const logout = createServerFn().middleware([sessionMiddleware]).handler(logoutHandler);
