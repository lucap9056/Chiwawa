import { Guild, GuildMember } from "discord.js";
import { Container } from "lib/discord-client/app-container";
import { TTSMessage } from "lib/microsoft-tts";
import { AppConfig } from "lib/config";
import { MessageTemplate, SpeechNotice, UserConfig } from "structs/user-config";

const getGuild = (member: GuildMember) => member.guild;

const getMemberName = (member: GuildMember) => member.nickname || member.user.globalName || member.user.displayName;

const getSpeechNotice = ({ global, guilds }: UserConfig, { id }: Guild): SpeechNotice => {
    const guild = guilds[id];
    return (guild && !guild.inheritGlobal) ? guild : global;
}

const getLanguage = (message: MessageTemplate) => message.language || "";

const getVoice = (message: MessageTemplate) => message.voice || "";

const getJoinMessage = (memberName: string, { joinMessage }: SpeechNotice, defaultSuffix: string) => {
    const prefix = joinMessage.prefix.trim();
    const content = joinMessage.content || memberName;
    const suffix = joinMessage.suffix === undefined ? "" : (joinMessage.suffix || "").trim() || defaultSuffix;
    return prefix + content + suffix;
}

const getLeaveMessage = (memberName: string, { joinMessage, leaveMessage }: SpeechNotice, defaultSuffix: string) => {
    const prefix = (leaveMessage.prefix || joinMessage.prefix).trim();
    const content = leaveMessage.content || joinMessage.content || memberName;
    const suffix = leaveMessage.suffix === undefined ? "" : (leaveMessage.suffix || joinMessage.suffix || "").trim() || defaultSuffix;
    return prefix + content + suffix;
}

const getSpeechNoticeFromMemberName = ({ defaultJoinSuffix, defaultLeaveSuffix }: AppConfig, memberName: string, join: boolean = false): TTSMessage => {

    const removeSuffix = /\.$/.test(memberName);
    const suffix = removeSuffix ? "" : (join) ? defaultJoinSuffix : defaultLeaveSuffix;

    const content = memberName.replace(/:.*/, "") + suffix;

    const voiceName = /:/.test(memberName) ? memberName.replace(/.*:|\.$/g, '') : "";

    const language = voiceName.replace(/[0-9a-zA-Z]*$/, "").replace(/-$/, "");
    const voice = voiceName.replace(/.*-/g, "");

    return { content, language, voice }
}

export const generateMessages = async ({ config, database }: Container, member: GuildMember, join: boolean = false): Promise<TTSMessage | undefined> => {

    const { defaultJoinSuffix, defaultLeaveSuffix } = config;

    const guild = getGuild(member);

    const memberName = getMemberName(member);

    if (database) {

        const user = await database.get(member.user.id);

        if (user) {

            const notification = getSpeechNotice(user, guild);
            if (notification.muted) return;

            if (join) {
                const content = getJoinMessage(memberName, notification, defaultJoinSuffix);

                const language = getLanguage(notification.joinMessage);
                const voice = getVoice(notification.joinMessage);

                return { content, language, voice };
            } else {
                const content = getLeaveMessage(memberName, notification, defaultLeaveSuffix);

                const language = getLanguage(notification.leaveMessage);
                const voice = getVoice(notification.leaveMessage);

                return { content, language, voice };
            }

        }

    }

    return getSpeechNoticeFromMemberName(config, memberName, join);
}