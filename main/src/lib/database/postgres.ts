import { SQL } from "bun";
import type { AppConfig, MessageTemplate, SpeechNotice } from "models";
import { buildResult, None, type Option, type Result, Some } from "resultant.js/rustify";

export class NotFoundError extends Error {
    constructor(detail?: string) {
        super(detail ? `database: not found: ${detail}` : "database: not found");
        this.name = "NotFoundError";
    }
}

export const isNotFound = (error: Error): boolean => error instanceof NotFoundError;

export interface Database {
    initAppConfig: (config: AppConfig) => Promise<Result<void, Error>>;
    getAppConfig: () => Promise<Result<Option<AppConfig>, Error>>;
    setAppConfig: (config: AppConfig) => Promise<Result<void, Error>>;
    // Already resolved: guild overrides global unless the guild has no notice
    // or explicitly inherits, so the caller never sees the raw guild/global pair.
    getUserSpeechNotice: (userId: string, guildId: string) => Promise<Result<SpeechNotice, Error>>;
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

interface UserSpeechNoticeRow {
    muted: boolean;
    join_message: MessageTemplate | null;
    leave_message: MessageTemplate | null;
}

// inheritGlobal is always false here — this is already the resolved notice,
// there's nothing further for the caller to inherit from.
const toSpeechNotice = (row: UserSpeechNoticeRow | undefined): SpeechNotice => {
    if (!row) {
        throw new NotFoundError("user config");
    }
    return {
        inheritGlobal: false,
        muted: row.muted,
        joinMessage: row.join_message ?? undefined,
        leaveMessage: row.leave_message ?? undefined,
    };
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
            initAppConfig: (config: AppConfig) =>
                buildResult(async () => {
                    await sql`
                        INSERT INTO app_runtime_info (id, default_join_suffix, default_leave_suffix, default_voice_model, tts_region, tts_api_key, admins)
                        VALUES (${APP_CONFIG_ROW_ID}, ${config.defaultJoinSuffix}, ${config.defaultLeaveSuffix}, ${config.defaultVoiceModel}, ${config.ttsRegion}, ${config.ttsApiKey}, ${sql.array(config.admins)})
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
                            admins = ${sql.array(config.admins)}
                        WHERE id = ${APP_CONFIG_ROW_ID}
                    `;
                }),

            getUserSpeechNotice: (userId, guildId) =>
                buildResult(async () => {
                    const uid = parseSnowflake("user id", userId);
                    const gid = parseSnowflake("guild id", guildId);

                    const rows = await sql<UserSpeechNoticeRow[]>`
                        SELECT
                            COALESCE(
                                CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.muted ELSE global_sn.muted END,
                                false
                            ) AS muted,
                            CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.join_message ELSE global_sn.join_message END AS join_message,
                            CASE WHEN guild_sn.id IS NOT NULL AND NOT guild_sn.inherit_global THEN guild_sn.leave_message ELSE global_sn.leave_message END AS leave_message
                        FROM user_configs uc
                        LEFT JOIN user_guild_notices ugn ON ugn.user_config_id = uc.id AND ugn.guild_id = ${gid}
                        LEFT JOIN speech_notices guild_sn ON guild_sn.id = ugn.speech_notice_id
                        LEFT JOIN speech_notices global_sn ON global_sn.id = uc.global_speech_notice_id
                        WHERE uc.id = ${uid}
                    `;

                    return toSpeechNotice(rows[0]);
                }),

            close: () => sql.close(),
        };
    });

export default {
    newDatabase,
};
