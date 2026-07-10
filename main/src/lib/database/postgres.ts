import { SQL } from "bun";
import type { AppConfig, MessageTemplate } from "models";
import { buildResult, None, type Option, type Result, Some } from "resultant.js/rustify";

export class UserConfigNotFoundError extends Error {
    constructor() {
        super("database: user has no config row");
        this.name = "UserConfigNotFoundError";
    }
}

export const isNotFound = (error: Error): boolean => error instanceof UserConfigNotFoundError;

export interface Database {
    initAppConfig: () => Promise<Result<void, Error>>;
    getAppConfig: () => Promise<Result<Option<AppConfig>, Error>>;
    setAppConfig: (config: AppConfig) => Promise<Result<void, Error>>;
    // None: user has a config and is muted for this guild. Some: speak this template.
    getUserJoinMessage: (userId: string, guildId: string) => Promise<Result<Option<MessageTemplate>, Error>>;
    getUserLeaveMessage: (userId: string, guildId: string) => Promise<Result<Option<MessageTemplate>, Error>>;
    close: () => Promise<void>;
}

const APP_CONFIG_ROW_ID = "0";

interface AppConfigRow {
    default_join_suffix: string;
    default_leave_suffix: string;
    default_voice_model: string;
    tts_region: string | null;
    tts_api_key: string | null;
    admins: string[] | null;
}

interface UserMessageRow {
    prefix: string | null;
    content: string | null;
    suffix: string | null;
    language: string | null;
    voice_model: string | null;
    muted: boolean;
}

const toMessageTemplate = (row: UserMessageRow): MessageTemplate => ({
    prefix: row.prefix ?? "",
    content: row.content ?? "",
    suffix: row.suffix ?? undefined,
    language: row.language ?? undefined,
    voiceModel: row.voice_model ?? undefined,
});

const toUserMessageOption = (row: UserMessageRow | undefined): Option<MessageTemplate> => {
    if (!row) {
        throw new UserConfigNotFoundError();
    }
    return row.muted ? None<MessageTemplate>() : Some(toMessageTemplate(row));
};

const parseSnowflake = (label: string, value: string): bigint => {
    try {
        return BigInt(value);
    } catch {
        throw new Error(`database: invalid ${label} "${value}"`);
    }
};

const newDatabase = (databaseUrl: string) =>
    buildResult<Database>(async () => {
        if (databaseUrl === "") {
            throw new Error("DB_CONNECTION_ERROR: DATABASE_URL is empty.");
        }

        const sql = new SQL(databaseUrl);
        await sql.connect();

        return {
            initAppConfig: () =>
                buildResult(async () => {
                    await sql`
                        INSERT INTO app_runtime_info (id, default_join_suffix, default_leave_suffix, default_voice_model, tts_region, tts_api_key, admins)
                        VALUES (${APP_CONFIG_ROW_ID}, '', '', '', '', '', '{}')
                        ON CONFLICT (id) DO NOTHING
                    `;
                }),

            getAppConfig: () =>
                buildResult(async () => {
                    const rows = await sql<AppConfigRow[]>`
                        SELECT default_join_suffix, default_leave_suffix, default_voice_model, tts_region, tts_api_key, admins
                        FROM app_runtime_info
                        WHERE id = ${APP_CONFIG_ROW_ID}
                    `;
                    const row = rows[0];
                    return row
                        ? Some<AppConfig>({
                              defaultJoinSuffix: row.default_join_suffix,
                              defaultLeaveSuffix: row.default_leave_suffix,
                              defaultVoiceModel: row.default_voice_model,
                              ttsRegion: row.tts_region ?? undefined,
                              ttsApiKey: row.tts_api_key ?? undefined,
                              admins: row.admins ?? [],
                          })
                        : None<AppConfig>();
                }),

            setAppConfig: (config: AppConfig) =>
                buildResult(async () => {
                    await sql`
                        UPDATE app_runtime_info
                        SET default_join_suffix = ${config.defaultJoinSuffix},
                            default_leave_suffix = ${config.defaultLeaveSuffix},
                            default_voice_model = ${config.defaultVoiceModel},
                            tts_region = ${config.ttsRegion ?? null},
                            tts_api_key = ${config.ttsApiKey ?? null},
                            admins = ${config.admins}
                        WHERE id = ${APP_CONFIG_ROW_ID}
                    `;
                }),

            getUserJoinMessage: (userId, guildId) =>
                buildResult(async () => {
                    const uid = parseSnowflake("user id", userId);
                    const gid = parseSnowflake("guild id", guildId);

                    const rows = await sql<UserMessageRow[]>`
                        SELECT
                            jmt.prefix, jmt.content, jmt.suffix, jmt.language, jmt.voice_model,
                            COALESCE(CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.muted END, global_sn.muted, false) AS muted
                        FROM user_configs uc
                        LEFT JOIN user_guild_notices ugn ON ugn.user_config_id = uc.id AND ugn.guild_id = ${gid}
                        LEFT JOIN speech_notices guild_sn ON guild_sn.id = ugn.speech_notice_id
                        LEFT JOIN speech_notices global_sn ON global_sn.id = uc.global_speech_notice_id
                        LEFT JOIN message_templates jmt ON jmt.id = COALESCE(
                            CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.join_message_id END,
                            global_sn.join_message_id
                        )
                        WHERE uc.id = ${uid}
                    `;

                    return toUserMessageOption(rows[0]);
                }),

            getUserLeaveMessage: (userId, guildId) =>
                buildResult(async () => {
                    const uid = parseSnowflake("user id", userId);
                    const gid = parseSnowflake("guild id", guildId);

                    const rows = await sql<UserMessageRow[]>`
                        SELECT
                            lmt.prefix, lmt.content, lmt.suffix, lmt.language, lmt.voice_model,
                            COALESCE(CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.muted END, global_sn.muted, false) AS muted
                        FROM user_configs uc
                        LEFT JOIN user_guild_notices ugn ON ugn.user_config_id = uc.id AND ugn.guild_id = ${gid}
                        LEFT JOIN speech_notices guild_sn ON guild_sn.id = ugn.speech_notice_id
                        LEFT JOIN speech_notices global_sn ON global_sn.id = uc.global_speech_notice_id
                        LEFT JOIN message_templates lmt ON lmt.id = COALESCE(
                            CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.leave_message_id END,
                            global_sn.leave_message_id
                        )
                        WHERE uc.id = ${uid}
                    `;

                    return toUserMessageOption(rows[0]);
                }),

            close: () => sql.close(),
        };
    });

export default {
    newDatabase,
};
