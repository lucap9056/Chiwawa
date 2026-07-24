// Source: proto/v1/protocol.ts

/** Guild IDs the bot is currently in. Writer: main. Readers: dashboard. */
export const GUILD_IDS_KEY = "chiwawa:v1:guild_ids";

/** Published on app config updates. Payload: AppConfig. Writer: dashboard. Readers: main. */
export const CONFIG_UPDATED_CHANNEL = "chiwawa:v1:config:updated";

/** Published on guild join/leave. Payload: GuildEvent. Writer: main. Readers: dashboard. */
export const GUILDS_UPDATED_CHANNEL = "chiwawa:v1:guilds:updated";

/**
 * Prefix for cached synthesized speech, content-addressed by the resolved voice model and text:
 * `${SPEECH_CACHE_PREFIX}:{hash(voiceShortName, content)}` -> bytes (Opus).
 * Self-invalidating: any change to the resolved voice or message text produces a different key,
 * so no invalidation channel is needed. Entries expire via TTL.
 * Writer/Reader: main. Dashboard does not read or write this key.
 */
export const SPEECH_CACHE_PREFIX = "chiwawa:v1:speech";

export type GuildEventType = "join" | "leave";

/** Payload published to {@link GUILDS_UPDATED_CHANNEL}. */
export interface GuildEvent {
    type: GuildEventType;
    guildId: string;
}
