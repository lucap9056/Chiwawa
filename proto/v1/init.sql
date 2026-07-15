CREATE TABLE app_runtime_info (
    id TEXT PRIMARY KEY,
    default_join_suffix TEXT,
    default_leave_suffix TEXT,
    default_voice_model TEXT,
    tts_region TEXT,
    tts_api_key TEXT,
    admins TEXT[] NOT NULL,
    CONSTRAINT chk_admins_not_empty CHECK (cardinality(admins) >= 1)
);

-- join_message/leave_message hold a MessageTemplate ({prefix, content, suffix?,
-- language?, voiceModel?}) or NULL when that event isn't customized. Owned
-- 1:1 by the notice, so there's no separate table/FK for it.
CREATE TABLE speech_notices (
    id SERIAL PRIMARY KEY,
    inherit_global BOOLEAN NOT NULL DEFAULT FALSE,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    join_message JSONB,
    leave_message JSONB
);

CREATE TABLE user_configs (
    id BigInt PRIMARY KEY,
    global_speech_notice_id INT REFERENCES speech_notices(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_configs_global_speech_notice_id ON user_configs(global_speech_notice_id) WHERE global_speech_notice_id IS NOT NULL;

CREATE TABLE user_guild_notices (
    user_config_id BigInt REFERENCES user_configs(id) ON DELETE CASCADE,
    guild_id BigInt NOT NULL,
    speech_notice_id INT REFERENCES speech_notices(id) ON DELETE CASCADE,
    PRIMARY KEY (user_config_id, guild_id)
);

CREATE INDEX idx_user_guild_notices_speech_notice_id ON user_guild_notices(speech_notice_id) WHERE speech_notice_id IS NOT NULL;