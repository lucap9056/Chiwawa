import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import type { RedisClient } from "bun";
import { goify } from "resultant.js/goify";
import { buildResult, type Result } from "resultant.js/rustify";
import type { DiscordUser, OAuth2Token } from "#/services/oauth2-provider";

enum CookieNames {
    SESSION_ID = "session_id",
}

const SESSION_KEY_PREFIX = "dashboard:v1:session:";

const SESSION_MAX_AGE_SECONDS = 604800;

export interface Session {
    sessionId: string;
    userId: string;
    userToken: OAuth2Token;
    expireAt: Date;
}

export interface Sessions {
    create: (user: DiscordUser, oauthToken: OAuth2Token) => Promise<Result<void, Error>>;
    get: () => Promise<Result<Session | null, Error>>;
    del: () => Promise<Result<void, Error>>;
    update: (session: Session) => Promise<Result<void, Error>>;
}

const sessionKey = (sessionId: string): string => `${SESSION_KEY_PREFIX}${sessionId}`;

// EXAT (not EX) so update() can persist a session's own expireAt as the single
// source of truth for its TTL, instead of separately tracking elapsed/remaining time.
const writeSession = (rdb: RedisClient, session: Session): Promise<"OK"> =>
    rdb.set(
        sessionKey(session.sessionId),
        JSON.stringify(session),
        "EXAT",
        Math.floor(session.expireAt.getTime() / 1000),
    );

const newSessions = (rdb: RedisClient) => ({
    create: (user: DiscordUser, oauthToken: OAuth2Token) =>
        buildResult(async () => {
            const session: Session = {
                sessionId: crypto.randomUUID(),
                userId: user.id,
                userToken: oauthToken,
                expireAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
            };

            await writeSession(rdb, session);

            const [, cookieError] = goify(() =>
                setCookie(CookieNames.SESSION_ID, session.sessionId, {
                    maxAge: SESSION_MAX_AGE_SECONDS,
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                }),
            );
            if (cookieError) {
                throw cookieError;
            }
        }),

    get: () =>
        buildResult(async (): Promise<Session | null> => {
            const [sessionId, cookieError] = goify(() => getCookie(CookieNames.SESSION_ID));
            if (cookieError) {
                throw cookieError;
            }
            if (!sessionId) {
                return null;
            }

            const raw = await rdb.get(sessionKey(sessionId));
            if (!raw) {
                return null;
            }

            const session: Session = JSON.parse(raw);
            session.expireAt = new Date(session.expireAt);
            return session;
        }),

    del: () =>
        buildResult(async () => {
            const [sessionId, cookieError] = goify(() => getCookie(CookieNames.SESSION_ID));
            if (cookieError) {
                throw cookieError;
            }
            if (!sessionId) {
                return;
            }

            await rdb.del(sessionKey(sessionId));

            const [, deleteCookieError] = goify(() => deleteCookie(CookieNames.SESSION_ID));
            if (deleteCookieError) {
                throw deleteCookieError;
            }
        }),

    update: (session: Session) =>
        buildResult(async () => {
            await writeSession(rdb, session);
        }),
});

export default {
    newSessions,
};
