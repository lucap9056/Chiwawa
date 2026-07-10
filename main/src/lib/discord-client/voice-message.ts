import type { GuildMember } from "discord.js";
import type { State, Suffix } from "lib/appstate";
import { isNotFound } from "lib/database";
import type { TTSMessage } from "lib/microsoft-tts";
import type { MessageTemplate } from "models";
import { match, None, type Option, Some } from "resultant.js/rustify";

const getGuild = (member: GuildMember) => member.guild;

const getMemberName = (member: GuildMember) => member.nickname || member.user.globalName || member.user.displayName;

const getLanguage = (message: MessageTemplate | undefined) => message?.language || "";

const getVoiceModel = (message: MessageTemplate | undefined) => message?.voiceModel || "";

const getJoinMessage = (memberName: string, message: MessageTemplate | undefined, defaultSuffix: string) => {
    const prefix = (message?.prefix ?? "").trim();
    const content = message?.content || memberName;
    const suffix =
        message !== undefined && message.suffix === undefined ? "" : (message?.suffix || "").trim() || defaultSuffix;
    return prefix + content + suffix;
};

const getLeaveMessage = (
    memberName: string,
    joinMessage: MessageTemplate | undefined,
    leaveMessage: MessageTemplate | undefined,
    defaultSuffix: string,
) => {
    const prefix = ((leaveMessage?.prefix || joinMessage?.prefix) ?? "").trim();
    const content = leaveMessage?.content || joinMessage?.content || memberName;
    const suffix =
        leaveMessage !== undefined && leaveMessage.suffix === undefined
            ? ""
            : (leaveMessage?.suffix || joinMessage?.suffix || "").trim() || defaultSuffix;
    return prefix + content + suffix;
};

const getSpeechNoticeFromMemberName = (
    defaultSuffix: Suffix,
    memberName: string,
    join: boolean = false,
): TTSMessage => {
    const removeSuffix = /\.$/.test(memberName);
    const suffix = removeSuffix ? "" : join ? defaultSuffix.join : defaultSuffix.leave;

    const content = memberName.replace(/:.*/, "") + suffix;

    const voiceName = /:/.test(memberName) ? memberName.replace(/.*:|\.$/g, "") : "";

    const language = voiceName.replace(/[0-9a-zA-Z]*$/, "").replace(/-$/, "");
    const voiceModel = voiceName.replace(/.*-/g, "");

    return { content, language, voiceModel };
};

export const generateMessages = async (
    { appConfig, database }: State,
    member: GuildMember,
    join: boolean = false,
): Promise<Option<TTSMessage>> => {
    const defaultSuffix = appConfig.defaultSuffix();
    const guild = getGuild(member);
    const memberName = getMemberName(member);

    const fallbackFromNickname = (): Option<TTSMessage> =>
        Some(getSpeechNoticeFromMemberName(defaultSuffix, memberName, join));

    return match(database, {
        async None() {
            return fallbackFromNickname();
        },
        async Some(db) {
            const res = await db.getUserSpeechNotice(member.user.id, guild.id);

            return match(res, {
                Ok: (notice): Option<TTSMessage> => {
                    if (notice.muted) return None();

                    if (join) {
                        return Some({
                            content: getJoinMessage(memberName, notice.joinMessage, defaultSuffix.join),
                            language: getLanguage(notice.joinMessage),
                            voiceModel: getVoiceModel(notice.joinMessage),
                        });
                    }

                    return Some({
                        content: getLeaveMessage(
                            memberName,
                            notice.joinMessage,
                            notice.leaveMessage,
                            defaultSuffix.leave,
                        ),
                        language: getLanguage(notice.leaveMessage),
                        voiceModel: getVoiceModel(notice.leaveMessage),
                    });
                },
                Err(err) {
                    if (!isNotFound(err)) console.error(`voice-message: ${err.message}`);
                    return fallbackFromNickname();
                },
            });
        },
    });
};
