// Implements the v1 Redis contract from proto/v1/redis.md.

export const GUILD_IDS_KEY = "chiwawa:v1:guild_ids";
export const CONFIG_UPDATED_CHANNEL = "chiwawa:v1:config:updated";
export const GUILDS_UPDATED_CHANNEL = "chiwawa:v1:guilds:updated";

export type GuildEventType = "join" | "leave";

// Payload published to chiwawa:v1:guilds:updated.
export interface GuildEvent {
    type: GuildEventType;
    guildId: string;
}
