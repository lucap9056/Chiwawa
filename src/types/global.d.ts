import 'express';
import 'express-session';

import AppManager from "@components/appManager";

import { OAuth2, OAuthToken } from "@src/api/discordAPI";

declare global {
    namespace Express {
        interface Request {
            appManager: AppManager
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