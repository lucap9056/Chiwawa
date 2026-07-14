export interface OAuth2Token {
    token_type: "Bearer";
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    public_flags: number;
    flags: number;
    banner: string | null;
    accent_color: number | null;
    global_name: string | null;
    avatar_decoration_data: unknown | null;
    banner_color: string | null;
    clan: unknown | null;
    mfa_enabled: boolean;
    locale: string;
    premium_type: number;
}

export interface DiscordGuild {
    id: string;
    name: string;
    icon: string;
    banner: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
}

export interface DiscordGuildMember {
    avatar: string;
    banner?: string;
    ommunication_disabled_until?: null;
    flags: 0;
    joined_at: string;
    nick?: string;
    pending: boolean;
    premium_since?: null;
    roles: [];
    unusual_dm_activity_until?: null;
    user: DiscordUser;
    mute: boolean;
    deaf: boolean;
    bio: string;
}

export interface OAuth2Provider {
    getAuthorizeUrl: () => string;
    base: (code: string) => Promise<OAuth2Token>;
    refresh: ({ refresh_token }: OAuth2Token) => Promise<OAuth2Token>;
    revoke: (token: string) => Promise<void>;
    getUser: ({ access_token }: OAuth2Token) => Promise<DiscordUser>;
    getGuilds: ({ access_token }: OAuth2Token) => Promise<DiscordGuild[]>;
    getGuildMember: ({ access_token }: OAuth2Token, guildId: string) => Promise<DiscordGuildMember>;
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

const newOAuth2Provider = (client_id: string, client_secret: string, redirect_uri: string): OAuth2Provider => ({
    getAuthorizeUrl: (): string =>
        `https://discord.com/oauth2/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=guilds+identify+guilds.members.read`,
    base: async (code: string): Promise<OAuth2Token> =>
        fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id,
                client_secret,
                redirect_uri,
                grant_type: "authorization_code",
            }),
        }).then(async (r) => {
            if (!r.ok) {
                const errorBody = await r.json().catch(() => ({}));
                throw new Error(`Discord OAuth failed (${r.status}): ${JSON.stringify(errorBody)}`);
            }
            return r.json();
        }),
    refresh: async ({ refresh_token }: OAuth2Token): Promise<OAuth2Token> =>
        fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                refresh_token,
                client_id,
                client_secret,
                grant_type: "refresh_token",
            }),
        }).then(async (r) => {
            if (!r.ok) {
                const errorBody = await r.json().catch(() => ({}));
                throw new Error(`Discord OAuth Refresh failed (${r.status}): ${JSON.stringify(errorBody)}`);
            }
            return r.json() as Promise<OAuth2Token>;
        }),
    revoke: async (token: string): Promise<void> =>
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
    getUser: ({ access_token }: OAuth2Token): Promise<DiscordUser> =>
        fetchDiscord<DiscordUser>("/users/@me", access_token),
    getGuilds: ({ access_token }: OAuth2Token): Promise<DiscordGuild[]> =>
        fetchDiscord<DiscordGuild[]>("/users/@me/guilds", access_token),
    getGuildMember: ({ access_token }: OAuth2Token, guildId: string): Promise<DiscordGuildMember> =>
        fetchDiscord<DiscordGuildMember>(`/users/@me/guilds/${guildId}/member`, access_token),
});

export { newOAuth2Provider };
