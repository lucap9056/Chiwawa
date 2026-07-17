import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { serverStateMiddleware, sessionMiddleware } from "#/server/middlware";
import { getLoginUrlHandler, loginHandler, logoutHandler } from "./handlers";

export const getLoginUrl = createServerFn()
    .middleware([serverStateMiddleware])
    .validator(z.object({ codeChallenge: z.string() }))
    .handler(getLoginUrlHandler);

export const generateCodeVerifier = () =>
    crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: "base64url" }).replace(/=$/, "");

export const login = createServerFn()
    .middleware([serverStateMiddleware])
    .validator(z.object({ oauth2Code: z.string(), oauth2State: z.string(), codeVerifier: z.string() }))
    .handler(loginHandler);

export const logout = createServerFn().middleware([sessionMiddleware]).handler(logoutHandler);
