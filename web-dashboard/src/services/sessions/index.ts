import { useMongo } from "services/mongo";
import { cookies as Cookies } from 'next/headers';
import { goify } from "structs/goify";
import { OAuth2Token } from "structs/discord-oauth2";
import { DiscordUser } from "structs/discord";
import { Session } from "structs/sessions";

const enum CookieNames {
    SESSION_ID = "session_id"
}

const create = async (user: DiscordUser, oauthToken: OAuth2Token): Promise<void> => {
    const sessionMaxAge = 604800;

    const [sessionId, sessionCreationError] = await useMongo((db) => {
        return db.createSession(user.id, oauthToken, sessionMaxAge);
    });
    if (sessionCreationError) {
        console.log("Failed to create session in database:", sessionCreationError);
        throw new Error("Failed to create user session.");
    }

    const [_, cookieSetError] = await goify(async () => {
        const cookies = await Cookies();
        cookies.set(CookieNames.SESSION_ID, sessionId, { maxAge: sessionMaxAge, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    });
    if (cookieSetError) {
        console.error("Failed to set session cookie:", cookieSetError);
        throw new Error("Failed to set session cookie.");
    }
}

const get = async (): Promise<Session | null> => {
    const cookies = await Cookies();
    const sessionIdCookie = cookies.get(CookieNames.SESSION_ID);

    if (!sessionIdCookie) {
        return null;
    }

    const [session, sessionRetrievalError] = await useMongo((db) => db.getSession(sessionIdCookie.value));
    if (sessionRetrievalError) {
        console.log("Failed to retrieve session from database:", sessionRetrievalError);
        throw new Error("Failed to retrieve user session.");
    }

    return session;
}

const del = async (): Promise<void> => {
    const cookies = await Cookies();
    const sessionIdCookie = cookies.get(CookieNames.SESSION_ID);

    if (!sessionIdCookie) {
        return;
    }

    const [_, sessionDeletionError] = await useMongo((db) => db.deleteSession(sessionIdCookie.value));
    if (sessionDeletionError) {
        console.log("Failed to delete session from database:", sessionDeletionError);
        throw new Error("Failed to delete user session.");
    }

    cookies.delete(CookieNames.SESSION_ID);
}

const update = async (session: Session): Promise<void> => {
    const [_, sessionUpdateError] = await useMongo((db) => db.updateSession(session));
    if (sessionUpdateError) {
        throw sessionUpdateError;
    }
}

export default {
    create,
    get,
    del,
    update
}