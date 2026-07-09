import type { Guild, GuildMember } from "discord.js";
import type { Suffix } from "lib/config";
import type { Container } from "lib/discord-client/app-container";
import type { TTSMessage } from "lib/microsoft-tts";
import type { MessageTemplate, SpeechNotice, UserConfig } from "models";
import { match, None, type Option, Some } from "resultant.js/rustify";

const createEmptyMessageTemplate = (): MessageTemplate => ({ prefix: "", content: "", suffix: "" });

const getGuild = (member: GuildMember) => member.guild;

const getMemberName = (member: GuildMember) => member.nickname || member.user.globalName || member.user.displayName;

const getSpeechNotice = ({ global, guilds }: UserConfig, { id }: Guild): SpeechNotice => {
    const guild = guilds[id];
    return guild && !guild.inheritGlobal
        ? guild
        : global || { inheritGlobal: false, muted: true, joinMessage: undefined, leaveMessage: undefined };
};

const getLanguage = (message: MessageTemplate) => message.language || "";

const getVoiceModel = (message: MessageTemplate) => message.voiceModel || "";

const getJoinMessage = (memberName: string, { joinMessage }: SpeechNotice, defaultSuffix: string) => {
    const message: MessageTemplate = joinMessage || createEmptyMessageTemplate();
    const prefix = message.prefix.trim();
    const content = message.content || memberName;
    const suffix = message.suffix === undefined ? "" : (message.suffix || "").trim() || defaultSuffix;
    return prefix + content + suffix;
};

const getLeaveMessage = (memberName: string, { joinMessage, leaveMessage }: SpeechNotice, defaultSuffix: string) => {
    const jMessage: MessageTemplate = joinMessage || createEmptyMessageTemplate();
    const lMessage: MessageTemplate = leaveMessage || createEmptyMessageTemplate();
    const prefix = (lMessage.prefix || jMessage.prefix).trim();
    const content = lMessage.content || jMessage.content || memberName;
    const suffix =
        lMessage.suffix === undefined ? "" : (lMessage.suffix || jMessage.suffix || "").trim() || defaultSuffix;
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
    { config, database }: Container,
    member: GuildMember,
    join: boolean = false,
): Promise<Option<TTSMessage>> => {
    const defaultSuffix = config.defaultSuffix();
    const guild = getGuild(member);

    const memberName = getMemberName(member);

    return match(database, {
        async Some(db) {
            const getUser = await db
                .getUserConfig(member.user.id)
                .then((getUser) => match(getUser, { Ok: (value) => value, Err: () => None<UserConfig>() }));

            return match(getUser, {
                Some(value) {
                    const notification = getSpeechNotice(value, guild);
                    if (notification.muted) return None();

                    const joinMessage = notification.joinMessage || createEmptyMessageTemplate();
                    const leaveMessage = notification.leaveMessage || createEmptyMessageTemplate();

                    if (join) {
                        const content = getJoinMessage(memberName, notification, defaultSuffix.join);

                        const language = getLanguage(joinMessage);
                        const voiceModel = getVoiceModel(joinMessage);

                        return Some({ content, language, voiceModel });
                    } else {
                        const content = getLeaveMessage(memberName, notification, defaultSuffix.leave);

                        const language = getLanguage(leaveMessage);
                        const voiceModel = getVoiceModel(leaveMessage);

                        return Some({ content, language, voiceModel });
                    }
                },
                None() {
                    const message = getSpeechNoticeFromMemberName(defaultSuffix, memberName, join);
                    return Some(message);
                },
            });
        },
        async None() {
            const message = getSpeechNoticeFromMemberName(defaultSuffix, memberName, join);
            return Some(message);
        },
    });
};
