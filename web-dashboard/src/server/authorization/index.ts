"use server";
import oauth2 from "services/discord-oauth2";
import { goify } from "structs/goify";
import sessions from "services/sessions";
import { Result } from "structs/rs-result";

export const GetDiscordLoginUrl = async () => Result<string>((Ok) => Ok(oauth2.getAuthorizeUrl()));

export const Login = async (code: string) => Result<void>(async (Ok, Err) => {

    const [token, tokenError] = await goify(() => oauth2.base(code));
    if (tokenError) {
        return Err("Failed to obtain Discord access token. Please try again.");
    }

    const [user, userError] = await goify(() => oauth2.getUser(token));
    if (userError) {
        return Err("Failed to retrieve Discord user profile. Please try again.");
    }

    await sessions.create(user, token);
    Ok();
});

export const Logout = async () => Result<void>(async (Ok) => {

    const session = await sessions.get();

    if (session) {
        sessions.del();
        oauth2.revoke(session.userToken);
    }
    
    Ok();
});