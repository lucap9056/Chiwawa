import type { SQL } from "bun";
import { buildResultAsync, None, type Option, type Result, Some } from "resultant.js/rustify";
import type { AppConfig, MessageTemplate, SpeechNotice } from "#/models";

export class NotFoundError extends Error {
    constructor(detail?: string) {
        super(detail ? `database: not found: ${detail}` : "database: not found");
        this.name = "NotFoundError";
    }
}

export const isNotFound = (error: Error): boolean => error instanceof NotFoundError;

export interface Database {
    getAppConfig: () => Promise<Result<Option<AppConfig>, Error>>;
    setAppConfig: (config: AppConfig, userId: string) => Promise<Result<void, Error>>;
    getUserSpeechNotice: (userId: string, guildId?: string) => Promise<Result<SpeechNotice, Error>>;
    setUserSpeechNotice: (userId: string, notice: SpeechNotice, guildId?: string) => Promise<Result<void, Error>>;
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
    inherit_global: boolean;
    muted: boolean;
    join_message: MessageTemplate | null;
    leave_message: MessageTemplate | null;
}

const toSpeechNotice = (row: UserSpeechNoticeRow | undefined): SpeechNotice => {
    if (!row) {
        throw new NotFoundError("user config");
    }
    return {
        inheritGlobal: row.inherit_global,
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

const newDatabase = (sql: SQL, defaultAdmins: string[]) => ({
    getAppConfig: () =>
        buildResultAsync(async () => {
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

    setAppConfig: (config: AppConfig, userId: string) =>
        buildResultAsync(async () => {
            await sql`
                    INSERT INTO app_runtime_info (
                        id, 
                        default_join_suffix, 
                        default_leave_suffix, 
                        default_voice_model, 
                        tts_region, 
                        tts_api_key, 
                        admins
                    )
                    SELECT 
                        ${APP_CONFIG_ROW_ID}, 
                        ${config.defaultJoinSuffix}, 
                        ${config.defaultLeaveSuffix}, 
                        ${config.defaultVoiceModel}, 
                        ${config.ttsRegion ?? null}, 
                        ${config.ttsApiKey ?? null}, 
                        ${sql.array(config.admins)}
                    WHERE ${userId} = ANY(${sql.array(defaultAdmins)}::text[])
                    ON CONFLICT (id) 
                    DO UPDATE SET 
                        default_join_suffix = EXCLUDED.default_join_suffix,
                        default_leave_suffix = EXCLUDED.default_leave_suffix,
                        default_voice_model = EXCLUDED.default_voice_model,
                        tts_region = EXCLUDED.tts_region,
                        tts_api_key = EXCLUDED.tts_api_key,
                        admins = EXCLUDED.admins
                    WHERE ${userId} = ANY(app_runtime_info.admins)
                    `;
        }),

    getUserSpeechNotice: (userId: string, guildId?: string) =>
        buildResultAsync(async () => {
            const uid = parseSnowflake("user id", userId);

            if (!guildId) {
                const rows = await sql<UserSpeechNoticeRow[]>`
                        SELECT
                            false AS inherit_global,
                            COALESCE(global_sn.muted, false) AS muted,
                            global_sn.join_message,
                            global_sn.leave_message
                        FROM user_configs uc
                        LEFT JOIN speech_notices global_sn ON global_sn.id = uc.global_speech_notice_id
                        WHERE uc.id = ${uid}
                        `;

                return toSpeechNotice(rows[0]);
            }

            const gid = parseSnowflake("guild id", guildId);

            const rows = await sql<UserSpeechNoticeRow[]>`
                    SELECT
                        COALESCE(guild_sn.inherit_global, true) AS inherit_global,
                        COALESCE(guild_sn.muted, false) AS muted,
                        guild_sn.join_message,
                        guild_sn.leave_message
                    FROM user_configs uc
                    LEFT JOIN user_guild_notices ugn ON ugn.user_config_id = uc.id AND ugn.guild_id = ${gid}
                    LEFT JOIN speech_notices guild_sn ON guild_sn.id = ugn.speech_notice_id
                    WHERE uc.id = ${uid}
                    `;

            return toSpeechNotice(rows[0]);
        }),

    setUserSpeechNotice: (userId: string, notice: SpeechNotice, guildId?: string) =>
        buildResultAsync(async () => {
            const uid = parseSnowflake("user id", userId);
            const joinMessage = notice.joinMessage ? JSON.stringify(notice.joinMessage) : null;
            const leaveMessage = notice.leaveMessage ? JSON.stringify(notice.leaveMessage) : null;

            await sql.begin(async (tx) => {
                await tx`
                        INSERT INTO user_configs (id) VALUES (${uid})
                        ON CONFLICT (id) DO NOTHING
                        `;

                // Locks this user's row for the rest of the transaction so concurrent
                // writes for the same user serialize instead of racing to create
                // duplicate speech_notices rows.
                const [{ global_speech_notice_id: existingGlobalId }] = await tx<
                    { global_speech_notice_id: number | null }[]
                >`
                        SELECT global_speech_notice_id FROM user_configs WHERE id = ${uid} FOR UPDATE
                        `;

                if (!guildId) {
                    if (existingGlobalId === null) {
                        const [{ id }] = await tx<{ id: number }[]>`
                                INSERT INTO speech_notices (inherit_global, muted, join_message, leave_message)
                                VALUES (false, ${notice.muted}, ${joinMessage}::jsonb, ${leaveMessage}::jsonb)
                                RETURNING id
                                `;
                        await tx`
                                UPDATE user_configs SET global_speech_notice_id = ${id} WHERE id = ${uid}
                                `;
                    } else {
                        await tx`
                                UPDATE speech_notices
                                SET inherit_global = false,
                                    muted = ${notice.muted},
                                    join_message = ${joinMessage}::jsonb,
                                    leave_message = ${leaveMessage}::jsonb
                                WHERE id = ${existingGlobalId}
                                `;
                    }
                    return;
                }

                const gid = parseSnowflake("guild id", guildId);

                const rows = await tx<{ speech_notice_id: number | null }[]>`
                            SELECT speech_notice_id FROM user_guild_notices
                            WHERE user_config_id = ${uid} AND guild_id = ${gid}
                        `;
                const existingGuildId = rows[0]?.speech_notice_id ?? null;

                if (existingGuildId === null) {
                    const [{ id }] = await tx<{ id: number }[]>`
                                INSERT INTO speech_notices (inherit_global, muted, join_message, leave_message)
                                VALUES (${notice.inheritGlobal}, ${notice.muted}, ${joinMessage}::jsonb, ${leaveMessage}::jsonb)
                                RETURNING id
                            `;
                    await tx`
                            INSERT INTO user_guild_notices (user_config_id, guild_id, speech_notice_id)
                            VALUES (${uid}, ${gid}, ${id})
                            ON CONFLICT (user_config_id, guild_id) DO UPDATE SET speech_notice_id = EXCLUDED.speech_notice_id
                            `;
                } else {
                    await tx`
                            UPDATE speech_notices
                            SET inherit_global = ${notice.inheritGlobal},
                                muted = ${notice.muted},
                                join_message = ${joinMessage}::jsonb,
                                leave_message = ${leaveMessage}::jsonb
                            WHERE id = ${existingGuildId}
                            `;
                }
            });
        }),
});

export default {
    newDatabase,
};
