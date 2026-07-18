// Source: proto/v1/protocol.ts

/** Guild IDs the bot is currently in. Writer: main. Readers: dashboard. */
export const GUILD_IDS_KEY = "chiwawa:v1:guild_ids";

/** Published on app config updates. Payload: AppConfig. Writer: dashboard. Readers: main. */
export const CONFIG_UPDATED_CHANNEL = "chiwawa:v1:config:updated";

/** Published on guild join/leave. Payload: GuildEvent. Writer: main. Readers: dashboard. */
export const GUILDS_UPDATED_CHANNEL = "chiwawa:v1:guilds:updated";

/**
 * Prefix for cached join/leave speech per user per guild:
 * `${SPEECH_CACHE_PREFIX}:{userId}:{guildId}:{join|leave}` -> bytes (Opus), empty = muted.
 * Guild-scoped, no invalidation channel — writers must DEL the affected pair(s) themselves.
 * Writer/Reader: main.
 */
export const SPEECH_CACHE_PREFIX = "chiwawa:v1:speech";

export type GuildEventType = "join" | "leave";

/** Payload published to {@link GUILDS_UPDATED_CHANNEL}. */
export interface GuildEvent {
    type: GuildEventType;
    guildId: string;
}
