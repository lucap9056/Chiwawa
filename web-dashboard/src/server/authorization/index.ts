"use server";
import oauth2 from "services/discord-oauth2";
import { goify } from "resultant.js/goify";
import sessions from "services/sessions";
import { buildSerializableOutcome, SerializableOutcome } from "resultant.js/rustify";

export const GetDiscordLoginUrl = async (): Promise<SerializableOutcome<string>> => buildSerializableOutcome(() => oauth2.getAuthorizeUrl());

export const Login = async (code: string): Promise<SerializableOutcome<void>> => buildSerializableOutcome<void>(async () => {

    const [token, tokenError] = await goify(() => oauth2.base(code));
    if (tokenError) {
        throw "Failed to obtain Discord access token. Please try again.";
    }

    const [user, userError] = await goify(() => oauth2.getUser(token));
    if (userError) {
        throw "Failed to retrieve Discord user profile. Please try again.";
    }

    await sessions.create(user, token);
});

export const Logout = async (): Promise<SerializableOutcome<void>> => buildSerializableOutcome<void>(async () => {

    const session = await sessions.get();

    if (session) {
        sessions.del();
        oauth2.revoke(session.userToken);
    }
});