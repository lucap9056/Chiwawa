import { APIInteractionGuildMember, ChatInputCommandInteraction, EmbedBuilder, GuildMember, MessageFlags } from "discord.js";
import { Database } from "lib/database";
import i18n from "lib/discord-client/user-reply/i18n";
import { MessageTemplate, SpeechNotice, UserConfig } from "structs/user-config";

const isGuildMember = (member: GuildMember | APIInteractionGuildMember): member is GuildMember => 'nickname' in member;

const getMemberName = (member: GuildMember | APIInteractionGuildMember): string => {
    if (isGuildMember(member)) return member.nickname || member.user.globalName || member.user.displayName;
    else return member.nick || member.user.global_name || member.user.username;
};

const getUsername = ({ user, member }: ChatInputCommandInteraction): string =>
    (!!member) ? getMemberName(member) : user.globalName || user.displayName || user.username;

const getGuildName = (i: ChatInputCommandInteraction) => i.guild ? i.guild.name : "";

const getSpeechNotice = ({ global, guilds }: UserConfig, guildId?: string): SpeechNotice => (!!guildId) ? guilds[guildId] || global : global;

const getLanguage = (message: MessageTemplate) => message.language || "";

const getVoiceModule = (message: MessageTemplate) => message.voice || "";

const getJoinMessage = (memberName: string, { joinMessage }: SpeechNotice, defaultSuffix: string) => {
    const prefix = joinMessage.prefix.trim();
    const content = joinMessage.content || memberName;
    const suffix = (joinMessage.suffix || defaultSuffix).trim();
    return prefix + content + suffix;
}

const getLeaveMessage = (memberName: string, { joinMessage, leaveMessage }: SpeechNotice, defaultSuffix: string) => {
    const prefix = (leaveMessage.prefix || joinMessage.prefix).trim();
    const content = leaveMessage.content || joinMessage.language || memberName;
    const suffix = (leaveMessage.suffix || joinMessage.suffix || defaultSuffix).trim();
    return prefix + content + suffix;
}
const replyUserConfig = async (database: Database, i: ChatInputCommandInteraction, user: UserConfig, guildId?: string): Promise<void> => {
    const username = getUsername(i).replace(/:.*/, "");
    const notification = getSpeechNotice(user, guildId);

    const { defaultJoinSuffix, defaultLeaveSuffix } = await database.getAppInfo();

    const isGuildContext = !!guildId;
    const guildName = getGuildName(i);

    const { t } = i18n(i.locale);

    const title = (isGuildContext)
        ? t("settings.guildTitle", { guild: guildName || t("common.unknownServer") })
        : t("settings.globalTitle", { username });

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(title)
        .setDescription(isGuildContext && notification.inheritGlobal ? t("settings.guildInheritDescription") : t("settings.description"))
        .addFields(
            { name: t("settings.muteStatus"), value: notification.muted ? t("common.yes") : t("common.no"), inline: true },
        );

    if (isGuildContext) {
        embed.addFields(
            { name: t("settings.inheritGlobal"), value: notification.inheritGlobal ? t("common.yes") : t("common.no"), inline: true },
        );
    }

    const joinSuffixName = notification.joinMessage.suffix ? t("settings.suffix") : t("settings.suffixDefault");
    const leaveSuffixName = (notification.leaveMessage.suffix || notification.joinMessage.suffix) ? t("settings.suffix") : t("settings.suffixDefault");

    embed.addFields(
        { name: '\u200B', value: t("settings.joinMessageSettings"), inline: false },
        { name: t("settings.prefix"), value: notification.joinMessage.prefix || "", inline: true },
        { name: t("settings.content"), value: notification.joinMessage.content || username, inline: true },
        { name: joinSuffixName, value: notification.joinMessage.suffix || defaultJoinSuffix, inline: true },
        { name: t("settings.language"), value: getLanguage(notification.joinMessage), inline: true },
        { name: t("settings.voiceModule"), value: getVoiceModule(notification.joinMessage), inline: true },
        { name: t("settings.joinPreview"), value: getJoinMessage(username, notification, defaultJoinSuffix), inline: false }
    );

    embed.addFields(
        { name: '\u200B', value: t("settings.leaveMessageSettings"), inline: false },
        { name: t("settings.prefix"), value: notification.leaveMessage.prefix || notification.joinMessage.prefix || "", inline: true },
        { name: t("settings.content"), value: notification.leaveMessage.content || notification.joinMessage.content || username, inline: true },
        { name: leaveSuffixName, value: notification.leaveMessage.suffix || notification.joinMessage.suffix || defaultLeaveSuffix, inline: true },
        { name: t("settings.language"), value: getLanguage(notification.leaveMessage), inline: true },
        { name: t("settings.voiceModule"), value: getVoiceModule(notification.leaveMessage), inline: true },
        { name: t("settings.leavePreview"), value: getLeaveMessage(username, notification, defaultLeaveSuffix), inline: false }
    );

    embed.setFooter({ text: t("settings.footer") });

    if (!i.replied && !i.deferred) i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    else i.editReply({ embeds: [embed] });
}

export default {
    replyUserConfig
}