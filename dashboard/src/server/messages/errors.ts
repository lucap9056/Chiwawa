// Server-side text for each ErrorCode, for logs/debugging only — the client
// receives just the code (see #/server/messages) and owns its own display text.

import type { ErrorCode } from "#/errors";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
    // OAuth2 / authorization
    AUTH_STATE_COOKIE_SET_FAILED: "Failed to set OAuth2 state cookie.",
    AUTH_STATE_COOKIE_MISSING: "No OAuth2 state cookie found.",
    AUTH_STATE_COOKIE_READ_FAILED: "Failed to read OAuth2 state cookie.",
    AUTH_STATE_MISMATCH: "OAuth2 state mismatch. Possible CSRF attempt or expired login attempt.",
    AUTH_TOKEN_EXCHANGE_FAILED: "Failed to obtain Discord access token.",
    AUTH_USER_FETCH_FAILED: "Failed to retrieve Discord user profile.",
    AUTH_LOGOUT_FAILED: "Failed to revoke the Discord OAuth2 token.",

    // Session lifecycle
    SESSION_COOKIE_SET_FAILED: "Failed to set session cookie.",
    SESSION_COOKIE_MISSING: "No session cookie found.",
    SESSION_COOKIE_READ_FAILED: "Failed to read session cookie.",
    SESSION_COOKIE_DELETE_FAILED: "Failed to delete session cookie.",
    SESSION_CREATE_FAILED: "Failed to create user session.",
    SESSION_STORE_READ_FAILED: "Failed to read session from the session store.",
    SESSION_NOT_FOUND: "No active session found.",
    SESSION_EXPIRED: "Session expired and could not be refreshed.",
    SESSION_UPDATE_FAILED: "Failed to update user session.",
    SESSION_DELETE_FAILED: "Failed to delete user session.",

    // Profile / app config / permissions
    PROFILE_GUILD_NOT_JOINED: "Guild is not in the user's joined guild list.",
    PROFILE_ADMIN_REQUIRED: "Only admins may update the app config.",
    PROFILE_SESSION_UPDATE_FAILED: "Failed to update session guild IDs.",
    PROFILE_SPEECH_NOTICE_FETCH_FAILED: "Failed to retrieve user speech notice.",
    PROFILE_SPEECH_NOTICE_UPDATE_FAILED: "Failed to update user speech notice.",
    PROFILE_APP_CONFIG_UPDATE_FAILED: "Failed to update app config.",
    PROFILE_GUILD_MEMBER_FETCH_FAILED: "Failed to get guild member.",

    // TTS
    TTS_NO_GUILD_ACCESS: "User has not joined any guild the bot is in.",
    TTS_TOKEN_ISSUE_FAILED: "Failed to issue TTS token.",

    // Upstream Discord API
    DISCORD_API_ERROR: "Discord API request failed.",
    DISCORD_OAUTH_TOKEN_EXCHANGE_FAILED: "Discord OAuth2 token exchange failed.",
    DISCORD_OAUTH_REFRESH_FAILED: "Discord OAuth2 token refresh failed.",
    DISCORD_OAUTH_REVOKE_FAILED: "Discord OAuth2 token revoke failed.",
    DISCORD_NO_REFRESH_TOKEN: "No refresh token provided.",

    // Database
    DATABASE_NOT_FOUND: "Requested record was not found.",
    DATABASE_INVALID_ID: "Invalid identifier supplied.",
    DATABASE_QUERY_FAILED: "Database query failed.",

    // Cache
    CACHE_OPERATION_FAILED: "Cache operation failed.",

    // Cross-cutting
    VALIDATION_FAILED: "Request validation failed.",
    INTERNAL_ERROR: "Internal server error.",
};

export const errorMessage = (code: ErrorCode): string => ERROR_MESSAGES[code];
