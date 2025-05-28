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
    avatar_decoration_data: any | null;
    banner_color: string | null;
    clan: any | null;
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
    avatar: string,
    banner?: string,
    ommunication_disabled_until?: null,
    flags: 0,
    joined_at: string,
    nick?: string,
    pending: boolean,
    premium_since?: null,
    roles: [],
    unusual_dm_activity_until?: null,
    user: DiscordUser,
    mute: boolean,
    deaf: boolean,
    bio: string
}
