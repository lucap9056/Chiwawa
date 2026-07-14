import type { RedisClient } from "bun";
import { buildResult, None, type Option, type Result, Some } from "resultant.js/rustify";
import type { DiscordUser, OAuth2Token } from "#/services/oauth2-provider";

const SESSION_KEY_PREFIX = "dashboard:v1:session:";

export interface Session {
    sessionId: string;
    userId: string;
    userToken: OAuth2Token;
    expireAt: Date;
}

export interface Sessions {
    create: (user: DiscordUser, oauthToken: OAuth2Token) => Promise<Result<string, Error>>;
    get: (sessionId: string) => Promise<Result<Option<Session>, Error>>;
    del: (sessionId: string) => Promise<Result<void, Error>>;
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

const newSessions = (rdb: RedisClient): Sessions => ({
    create: (user: DiscordUser, oauthToken: OAuth2Token) =>
        buildResult(async () => {
            const sessionId = crypto.randomUUID();
            const session: Session = {
                sessionId,
                userId: user.id,
                userToken: oauthToken,
                expireAt: new Date(Date.now() + oauthToken.expires_in * 1000),
            };

            await writeSession(rdb, session);
            return sessionId;
        }),

    get: (sessionId: string) =>
        buildResult(async (): Promise<Option<Session>> => {
            const raw = await rdb.get(sessionKey(sessionId));
            if (!raw) {
                return None();
            }

            const session: Session = JSON.parse(raw);
            session.expireAt = new Date(session.expireAt);
            return Some(session);
        }),
    del: (sessionId: string): Promise<Result<void, Error>> =>
        buildResult(async () => {
            await rdb.del(sessionKey(sessionId));
        }),

    update: (session: Session) =>
        buildResult(async () => {
            await writeSession(rdb, session);
        }),
});

export default {
    newSessions,
};
