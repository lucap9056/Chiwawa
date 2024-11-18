/**
 * This file defines interfaces and classes to interact with the Discord API and manage Discord users.
 * It includes functionality to retrieve user information, guilds, and guild membership details.
 */

interface DiscordToken {
    token_type: string
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string
}

interface DiscordGuild {
    id: string;
    name: string;
    icon: string;
    banner: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
}

interface DiscordGuilds {
    map: { [guildId: string]: DiscordGuild }
}

class DiscordGuilds {

    constructor() {
        this.map = {}
    }

    /**
     * Returns an array of DiscordGuild objects.
     */
    public get array(): DiscordGuild[] {
        return Object.values(this.map);
    }
}

interface DiscordUser {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    public_flags: number;
    flags: number;
    banner: string | null;
    accent_color: number | null;
    global_name: string | null;
    avatar_decoration_data: any | null;
    banner_color: string | null;
    clan: any | null;
    mfa_enabled: boolean;
    locale: string;
    premium_type: number;
    code?: number;
    message?: string;
}

interface DiscordGuildMember {
    avatar: string | null
    banner: string | null
    bio: string
    communication_disabled_until: null
    deaf: boolean
    flags: number
    joined_at: Date
    mute: boolean
    nick: string
    pending: boolean
    premium_since: null
    roles: string[]
    unusual_dm_activity_until: null
    user: DiscordUser
}

class DiscordUser {
    private static Endpoint = "https://discord.com/api/v10";

    private token: DiscordToken;
    constructor(token: DiscordToken) {
        this.token = token;
    }

    /**
     * Retrieves the current user's information from the Discord API.
     * @returns {Promise<this>} A promise that resolves to the current user object.
     */
    public get GetMe(): Promise<this> {

        const { token } = this;

        return new Promise((resolve, reject) => {

            if (this.id) {
                return this;
            }

            fetch(`${DiscordUser.Endpoint}/users/@me`, {
                method: "GET",
                headers: {
                    "Authorization": `${token.token_type} ${token.access_token}`
                }
            })
                .then((res) => res.json())
                .then((user: DiscordUser) => {
                    if (user.code === 0 && user.message) {
                        const { code, message } = user;
                        throw { code, message };
                    }
                    Object.assign(this, user);
                    resolve(this);
                })
                .catch(reject);



        });

    }

    /**
     * Retrieves the current user's guilds from the Discord API.
     * @returns {Promise<DiscordGuild[]>} A promise that resolves to an array of guild objects.
     */
    public GetGuilds(): Promise<DiscordGuild[]> {
        const { token } = this;

        return fetch(`${DiscordUser.Endpoint}/users/@me/guilds`, {
            method: "GET",
            headers: {
                "Authorization": `${token.token_type} ${token.access_token}`
            }
        })
            .then((res) => res.json())
            .then((guilds: DiscordGuild[]) => guilds);

    }

    /**
     * Retrieves the current user's membership details in a specific guild from the Discord API.
     * @param {string} guildId - The ID of the guild.
     * @returns {Promise<DiscordGuildMember>} A promise that resolves to the guild member object.
     */
    public GetGuildMe(guildId: string): Promise<DiscordGuildMember> {
        const { token } = this;

        return fetch(`${DiscordUser.Endpoint}/users/@me/guilds/${guildId}/member`, {
            method: "GET",
            headers: {
                "Authorization": `${token.token_type} ${token.access_token}`
            }
        })
            .then((res) => res.json())
            .then((member: DiscordGuildMember) => member);
    }
}

export default DiscordUser;

export {
    DiscordToken,
    DiscordGuild,
    DiscordGuilds,
    DiscordGuildMember
}