import axios from "axios";
import { DiscordGuild, DiscordGuildMember, DiscordUser } from "structs/discord";
import { OAuth2Token } from "structs/discord-oauth2";

const client_id = process.env["CLIENT_ID"] || "";
const client_secret = process.env["CLIENT_SECRET"] || "";
const redirect_uri = process.env["REDIRECT_URI"] || "";

const getAuthorizeUrl = (): string => `https://discord.com/oauth2/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=guilds+identify+guilds.members.read`;

const base = async (code: string): Promise<OAuth2Token> => {
    const { data } = await axios.post<OAuth2Token>(
        "https://discord.com/api/oauth2/token",
        { code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return data;
};

const refresh = async ({ refresh_token }: OAuth2Token): Promise<OAuth2Token> => {
    const { data } = await axios.post<OAuth2Token>("https://discord.com/api/oauth2/token/revoke",
        new URLSearchParams({
            refresh_token, grant_type: "refresh_code"
        }),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );

    return data;
}

const revoke = async ({ refresh_token }: OAuth2Token): Promise<void> => {
    await axios.post<OAuth2Token>("https://discord.com/api/oauth2/token/revoke",
        new URLSearchParams({
            refresh_token, token_type_hint: "refresh_token"
        }),
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }
    );
}

const getUrl = (path: string) => "https://discord.com/api/v10" + path;

const getUser = async ({ access_token }: OAuth2Token): Promise<DiscordUser> => {
    const { data } = await axios.get<DiscordUser>(
        getUrl("/users/@me"), {
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    });
    return data;
};

const getGuilds = async ({ access_token }: OAuth2Token): Promise<DiscordGuild[]> => {
    const { data } = await axios.get<DiscordGuild[]>(
        getUrl("/users/@me/guilds"), {
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    });
    return data;
}

const getGuildMember = async ({ access_token }: OAuth2Token, guildId: string): Promise<DiscordGuildMember> => {
    const { data } = await axios.get<DiscordGuildMember>(
        getUrl(`/users/@me/guilds/${guildId}/member`), {
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    });

    return data;
}

export default {
    getAuthorizeUrl,
    base,
    refresh,
    revoke,
    getUser,
    getGuilds,
    getGuildMember
}