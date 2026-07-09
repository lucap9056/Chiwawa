CREATE TABLE app_runtime_info (
    id TEXT PRIMARY KEY,
    default_join_suffix TEXT,
    default_leave_suffix TEXT,
    default_voice_model TEXT,
    tts_region TEXT,
    tts_api_key TEXT,
    admins TEXT[]
);

CREATE TABLE message_templates (
    id SERIAL PRIMARY KEY,
    prefix TEXT NOT NULL,
    content TEXT NOT NULL,
    suffix TEXT,
    language TEXT,
    voice_model TEXT
);

CREATE TABLE speech_notices (
    id SERIAL PRIMARY KEY,
    inherit_global BOOLEAN NOT NULL DEFAULT FALSE,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    join_message_id INT REFERENCES message_templates(id) ON DELETE SET NULL,
    leave_message_id INT REFERENCES message_templates(id) ON DELETE SET NULL
);

CREATE INDEX idx_speech_notices_join_message_id ON speech_notices(join_message_id) WHERE join_message_id IS NOT NULL;
CREATE INDEX idx_speech_notices_leave_message_id ON speech_notices(leave_message_id) WHERE leave_message_id IS NOT NULL;

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