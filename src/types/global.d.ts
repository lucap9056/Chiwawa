import 'express';
import 'express-session';

import App from "/app";

import { OAuth2, OAuthToken } from "api/discord-api";

declare global {
    namespace Express {
        interface Request {
            chiwawa: App
            oauth2?: OAuth2
        }
    }
}

declare module 'express-session' {
    interface SessionData {
        userId: string
        userToken: OAuthToken
        expiredTime: number
    }
}