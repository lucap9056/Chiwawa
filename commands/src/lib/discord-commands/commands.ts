import { SlashCommandBuilder, Locale } from "discord.js";
import { t } from "lib/discord-commands/descriptions";
import DEFAULT from "lib/discord-commands/descriptions/default.json";

export const enum COMMANDS {
    RESET = "reset",
    INHERIT_GLOBAL = "inherit-global",
    MUTE = "mute",
    PREFIX = "prefix",
    MESSAGE = "message",
    SUFFIX = "suffix",
    LANGUAGE = "language",
    VOICE = "voice",
    GET = "get"
}

export const enum MUTE_COMMANDS {
    ENABLE = "enable"
}

export const enum SUBCOMMAND_TYPES {
    SET = "set",
    VALUE = "value",
    UNSET = "unset",
}

export const enum SUBCOMMAND_GROUP_TYPES {
    JOIN = "join",
    LEAVE = "leave",
}

const resetCommand = new SlashCommandBuilder()
    .setName(COMMANDS.RESET)
    .setDescription(DEFAULT["reset"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "reset")
    );

const inheritGlobalCommand = new SlashCommandBuilder()
    .setName(COMMANDS.INHERIT_GLOBAL)
    .setDescription(DEFAULT["inheritGlobal"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "inheritGlobal")
    )
    .addBooleanOption(option =>
        option
            .setName(MUTE_COMMANDS.ENABLE)
            .setDescription(DEFAULT["inheritGlobal-enable"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "inheritGlobal-enable")
            )
            .setRequired(true)
    );

const muteCommand = new SlashCommandBuilder()
    .setName(COMMANDS.MUTE)
    .setDescription(DEFAULT["mute"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "mute")
    )
    .addBooleanOption(option =>
        option
            .setName(MUTE_COMMANDS.ENABLE)
            .setDescription(DEFAULT["mute-enable"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "mute-enable")
            )
            .setRequired(true)
    );

const prefixCommand = new SlashCommandBuilder()
    .setName(COMMANDS.PREFIX)
    .setDescription(DEFAULT["prefix"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "prefix")
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.SET)
            .setDescription(DEFAULT['prefix-set'])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "prefix-set")
            )
            .addStringOption(option =>
                option.setName(SUBCOMMAND_TYPES.VALUE)
                    .setDescription(DEFAULT["prefix-set-value"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "prefix-set-value")
                    )
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.UNSET)
            .setDescription(DEFAULT["prefix-unset"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "prefix-unset")
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.JOIN)
            .setDescription(DEFAULT["prefix-join"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "prefix-join")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["prefix-join-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "prefix-join-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["prefix-join-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "prefix-join-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["prefix-join-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "prefix-join-unset")
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.LEAVE)
            .setDescription(DEFAULT["prefix-leave"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "prefix-leave")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["prefix-leave-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "prefix-leave-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["prefix-leave-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "prefix-leave-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["prefix-leave-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "prefix-leave-unset")
                    )
            )
    );

const messageContentCommand = new SlashCommandBuilder()
    .setName(COMMANDS.MESSAGE)
    .setDescription(DEFAULT["message"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "message")
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.SET)
            .setDescription(DEFAULT["message-set"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "message-set")
            )
            .addStringOption(option =>
                option.setName(SUBCOMMAND_TYPES.VALUE)
                    .setDescription(DEFAULT["message-set-value"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "message-set-value")
                    )
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.UNSET)
            .setDescription(DEFAULT["message-unset"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "message-unset")
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.JOIN)
            .setDescription(DEFAULT["message-join"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "message-join")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["message-join-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "message-join-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["message-join-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "message-join-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["message-join-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "message-join-unset")
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.LEAVE)
            .setDescription(DEFAULT["message-leave"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "message-leave")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["message-leave-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "message-leave-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["message-leave-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "message-leave-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["message-leave-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "message-leave-unset")
                    )
            )
    );

const suffixCommand = new SlashCommandBuilder()
    .setName(COMMANDS.SUFFIX)
    .setDescription(DEFAULT["suffix"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "suffix")
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.SET)
            .setDescription(DEFAULT["suffix-set"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "suffix-set")
            )
            .addStringOption(option =>
                option.setName(SUBCOMMAND_TYPES.VALUE)
                    .setDescription(DEFAULT["suffix-set-value"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "suffix-set-value")
                    )
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.UNSET)
            .setDescription(DEFAULT["suffix-unset"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "suffix-unset")
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.JOIN)
            .setDescription(DEFAULT["suffix-join"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "suffix-join")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["suffix-join-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "suffix-join-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["suffix-join-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "suffix-join-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["suffix-join-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "suffix-join-unset")
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.LEAVE)
            .setDescription(DEFAULT["suffix-leave"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "suffix-leave")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["suffix-leave-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "suffix-leave-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["suffix-leave-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "suffix-leave-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["suffix-leave-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "suffix-leave-unset")
                    )
            )
    );

const languageCommand = new SlashCommandBuilder()
    .setName(COMMANDS.LANGUAGE)
    .setDescription(DEFAULT["language"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "language")
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.SET)
            .setDescription(DEFAULT["language-set"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "language-set")
            )
            .addStringOption(option =>
                option.setName(SUBCOMMAND_TYPES.VALUE)
                    .setDescription(DEFAULT["language-set-value"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "language-set-value")
                    )
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.UNSET)
            .setDescription(DEFAULT["language-unset"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "language-unset")
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.JOIN)
            .setDescription(DEFAULT["language-join"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "language-join")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["language-join-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "language-join-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["language-join-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "language-join-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["language-join-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "language-join-unset")
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.LEAVE)
            .setDescription(DEFAULT["language-leave"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "language-leave")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["language-leave-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "language-leave-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["language-leave-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "language-leave-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["language-leave-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "language-leave-unset")
                    )
            )
    );

const voiceCommand = new SlashCommandBuilder()
    .setName(COMMANDS.VOICE)
    .setDescription(DEFAULT["voice"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "voice")
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.SET)
            .setDescription(DEFAULT["voice-set"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "voice-set")
            )
            .addStringOption(option =>
                option.setName(SUBCOMMAND_TYPES.VALUE)
                    .setDescription(DEFAULT["voice-set-value"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "voice-set-value")
                    )
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName(SUBCOMMAND_TYPES.UNSET)
            .setDescription(DEFAULT["voice-unset"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "voice-unset")
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.JOIN)
            .setDescription(DEFAULT["voice-join"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "voice-join")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["voice-join-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "voice-join-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["voice-join-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "voice-join-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["voice-join-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "voice-join-unset")
                    )
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName(SUBCOMMAND_GROUP_TYPES.LEAVE)
            .setDescription(DEFAULT["voice-leave"])
            .setDescriptionLocalization(
                ...t(Locale.ChineseTW, "voice-leave")
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.SET)
                    .setDescription(DEFAULT["voice-leave-set"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "voice-leave-set")
                    )
                    .addStringOption(option =>
                        option.setName(SUBCOMMAND_TYPES.VALUE)
                            .setDescription(DEFAULT["voice-leave-set-value"])
                            .setDescriptionLocalization(
                                ...t(Locale.ChineseTW, "voice-leave-set-value")
                            )
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName(SUBCOMMAND_TYPES.UNSET)
                    .setDescription(DEFAULT["voice-leave-unset"])
                    .setDescriptionLocalization(
                        ...t(Locale.ChineseTW, "voice-leave-unset")
                    )
            )
    );

// 獨立的 GET 指令
const getCommand = new SlashCommandBuilder()
    .setName(COMMANDS.GET)
    .setDescription(DEFAULT["get"])
    .setDescriptionLocalization(
        ...t(Locale.ChineseTW, "get")
    );

export default [
    resetCommand,
    inheritGlobalCommand,
    muteCommand,
    prefixCommand,
    messageContentCommand,
    suffixCommand,
    languageCommand,
    voiceCommand,
    getCommand,
];