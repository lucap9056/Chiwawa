import type {
    APIPartialGuild,
    APIUser,
    RESTGetCurrentUserGuildMemberResult,
    RESTPostOAuth2AccessTokenResult,
} from "discord-api-types/v10";
import { buildResultAsync, type Result } from "resultant.js/rustify";

export type OAuth2Token = RESTPostOAuth2AccessTokenResult;
export type DiscordUser = APIUser;
export type DiscordGuild = APIPartialGuild;
export type DiscordGuildMember = RESTGetCurrentUserGuildMemberResult;

export interface OAuth2Provider {
    getAuthorizeUrl: (state: string, code_challenge: string) => string;
    base: (code: string, code_verifier: string) => Promise<Result<OAuth2Token, Error>>;
    refresh: ({ refresh_token }: OAuth2Token) => Promise<Result<OAuth2Token, Error>>;
    revoke: (token: string) => Promise<Result<void, Error>>;
    getUser: ({ access_token }: OAuth2Token) => Promise<Result<DiscordUser, Error>>;
    getGuilds: ({ access_token }: OAuth2Token) => Promise<Result<DiscordGuild[], Error>>;
    getGuildMember: ({ access_token }: OAuth2Token, guildId: string) => Promise<Result<DiscordGuildMember, Error>>;
}

const fetchDiscord = <T>(path: string, accessToken: string): Promise<T> =>
    fetch(`https://discord.com/api/v10${path}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "User-Agent": "Chiwawa",
        },
    }).then((res) => {
        if (!res.ok) throw new Error(`Discord API Error [${res.status}]: ${res.statusText}`);
        return res.json() as Promise<T>;
    });

const newOAuth2Provider = (client_id: string, client_secret: string, redirect_uri: string): OAuth2Provider => {
    const activeRefreshes = new Map<string, Promise<OAuth2Token>>();
    return {
        getAuthorizeUrl: (state: string, code_challenge: string) =>
            `https://discord.com/oauth2/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=guilds+identify+guilds.members.read&state=${state}&code_challenge=${encodeURIComponent(code_challenge)}&code_challenge_method=S256`,
        base: (code: string, code_verifier: string) =>
            buildResultAsync(() =>
                fetch("https://discord.com/api/oauth2/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        code,
                        client_id,
                        client_secret,
                        redirect_uri,
                        grant_type: "authorization_code",
                        code_verifier,
                    }),
                }).then(async (r) => {
                    if (!r.ok) {
                        const errorBody = await r.json().catch(() => ({}));
                        throw new Error(`Discord OAuth failed (${r.status}): ${JSON.stringify(errorBody)}`);
                    }
                    return r.json() as Promise<OAuth2Token>;
                }),
            ),

        refresh: ({ refresh_token }: OAuth2Token) =>
            buildResultAsync(async () => {
                if (!refresh_token) {
                    throw new Error("No refresh token provided");
                }

                const existingPromise = activeRefreshes.get(refresh_token);
                if (existingPromise) {
                    return existingPromise;
                }

                const promise = fetch("https://discord.com/api/oauth2/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        refresh_token,
                        client_id,
                        client_secret,
                        grant_type: "refresh_token",
                    }),
                })
                    .then(async (r) => {
                        if (!r.ok) {
                            const errorBody = await r.json().catch(() => ({}));
                            throw new Error(`Discord OAuth Refresh failed (${r.status}): ${JSON.stringify(errorBody)}`);
                        }
                        return r.json() as Promise<OAuth2Token>;
                    })
                    .finally(() => {
                        activeRefreshes.delete(refresh_token);
                    });

                activeRefreshes.set(refresh_token, promise);
                return promise;
            }),

        revoke: (token: string) =>
            buildResultAsync(() =>
                fetch("https://discord.com/api/oauth2/token/revoke", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`, "utf8").toString("base64")}`,
                    },
                    body: new URLSearchParams({ token }),
                }).then(async (r) => {
                    if (!r.ok) {
                        const errorBody = await r.json().catch(() => ({}));
                        throw new Error(`Discord OAuth Revoke failed (${r.status}): ${JSON.stringify(errorBody)}`);
                    }
                }),
            ),

        getUser: ({ access_token }: OAuth2Token) =>
            buildResultAsync(() => fetchDiscord<DiscordUser>("/users/@me", access_token)),

        getGuilds: ({ access_token }: OAuth2Token) =>
            buildResultAsync(() => fetchDiscord<DiscordGuild[]>("/users/@me/guilds", access_token)),

        getGuildMember: ({ access_token }: OAuth2Token, guildId: string) =>
            buildResultAsync(() =>
                fetchDiscord<DiscordGuildMember>(`/users/@me/guilds/${guildId}/member`, access_token),
            ),
    };
};

export { newOAuth2Provider };
