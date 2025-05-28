import oauth2 from "services/discord-oauth2";
import sessions from "services/sessions";
import { goify } from "structs/goify";
import { Session } from "structs/sessions";

const isExpriedToken = (session: Session): boolean => session.userToken.expires_in * 1000 > new Date().getTime();

const refreshToken = async (session: Session): Promise<Session> => {

    const [refreshedToken, refreshTokenError] = await goify(() => oauth2.refresh(session.userToken));
    if (refreshTokenError) {
        throw new Error('Failed to refresh authentication token. Please try logging in again.');
    }

    return {
        ...session,
        userToken: refreshedToken
    }
}

export const getSession = async (): Promise<Session> => {
    const userSession = await sessions.get();
    if (!userSession) {
        throw new Error("Authentication Error: User session not found. Please log in.");
    }

    return isExpriedToken(userSession) ? await refreshToken(userSession) : userSession;
}