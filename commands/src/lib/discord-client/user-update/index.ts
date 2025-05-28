import { ChatInputCommandInteraction } from "discord.js"
import { COMMANDS, MUTE_COMMANDS, SUBCOMMAND_TYPES, SUBCOMMAND_GROUP_TYPES } from "lib/discord-commands/commands";
import { createEmptySpeechNotice, MessageTemplate, SpeechNotice, UserConfig } from "structs/user-config";

interface Context {
    interaction: ChatInputCommandInteraction
    command: string
    user: UserConfig
    guildId?: string
}

const getBoolean = (ctx: Context, name: string) => ctx.interaction.options.getBoolean(name) || false;

const getString = (ctx: Context, name: string) => ctx.interaction.options.getString(name) || "";



const getEnable = (ctx: Context) => getBoolean(ctx, MUTE_COMMANDS.ENABLE);

const getValue = (ctx: Context) => getString(ctx, SUBCOMMAND_TYPES.VALUE);

const updateGuild = (user: UserConfig, guildId: string, n: SpeechNotice): UserConfig => ({ ...user, guilds: { ...user.guilds, [guildId]: n } });

const updateGlobal = (user: UserConfig, global: SpeechNotice) => ({ ...user, global });

const updateMute = (n: SpeechNotice, muted: boolean): SpeechNotice => ({ ...n, muted });

const updateInheritGlobal = (n: SpeechNotice, inheritGlobal: boolean): SpeechNotice => ({ ...n, inheritGlobal });

const updateJoinMesage = (n: SpeechNotice, joinMessage: MessageTemplate): SpeechNotice => ({ ...n, joinMessage });

const updateLeaveMessage = (n: SpeechNotice, leaveMessage: MessageTemplate): SpeechNotice => ({ ...n, leaveMessage });

const updatePrefix = (msg: MessageTemplate, prefix: string = ""): MessageTemplate => ({ ...msg, prefix });

const updateContent = (msg: MessageTemplate, content: string = ""): MessageTemplate => ({ ...msg, content });

const updateSuffix = (msg: MessageTemplate, suffix: string = ""): MessageTemplate => (
    { ...msg, suffix: (suffix === "") ? undefined : suffix }
);

const updateLanguage = (msg: MessageTemplate, language: string = ""): MessageTemplate => (
    { ...msg, language: (language === "") ? undefined : language }
);

const updateVoice = (msg: MessageTemplate, voice: string = ""): MessageTemplate => (
    { ...msg, voice: (voice === "") ? undefined : voice }
);

const reset = ({ user, guildId }: Context): UserConfig =>
    (!!guildId) ?
        updateGuild(user, guildId, createEmptySpeechNotice()) :
        updateGlobal(user, createEmptySpeechNotice());


const setInheritGlobal = (ctx: Context): UserConfig => {
    const enable = getEnable(ctx);

    const { user, guildId } = ctx;

    if (!!guildId) {
        return updateGuild(user,
            guildId, updateInheritGlobal(user.guilds[guildId], enable)
        )
    }
    return updateGlobal(user, updateInheritGlobal(user.global, enable));
}

const setMute = (ctx: Context): UserConfig => {
    const enable = getEnable(ctx);

    const { user, guildId } = ctx;

    if (!!guildId) {
        return updateGuild(user,
            guildId, updateMute(user.guilds[guildId], enable)
        )
    }
    return updateGlobal(user, updateMute(user.global, enable));
}

const setPrefix = (ctx: Context): UserConfig => {
    const { user, guildId, command } = ctx;

    switch (command) {
        case SUBCOMMAND_TYPES.SET: {

            const value = getValue(ctx);

            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(
                    user,
                    guildId,
                    {
                        ...guild,
                        joinMessage: updatePrefix(guild.joinMessage, value),
                        leaveMessage: updatePrefix(guild.leaveMessage)
                    }
                )
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(
                user,
                {
                    ...user.global,
                    joinMessage: updatePrefix(joinMessage, value),
                    leaveMessage: updatePrefix(leaveMessage)
                }
            )

        }
        case SUBCOMMAND_TYPES.UNSET: {

            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(
                    user,
                    guildId,
                    {
                        ...guild,
                        joinMessage: updatePrefix(guild.joinMessage),
                        leaveMessage: updatePrefix(guild.leaveMessage)
                    }
                )
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(
                user,
                {
                    ...user.global,
                    joinMessage: updatePrefix(joinMessage),
                    leaveMessage: updatePrefix(leaveMessage)
                }
            )

        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.SET: {

            const value = getValue(ctx);

            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId,
                    updateJoinMesage(guild,
                        updatePrefix(guild.joinMessage, value)
                    )
                )
            }

            const { global } = user;
            return updateGlobal(user,
                updateJoinMesage(global,
                    updatePrefix(global.joinMessage, value)
                )
            )

        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.UNSET: {

            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId,
                    updateJoinMesage(guild,
                        updatePrefix(guild.joinMessage)
                    )
                )
            }
            const { global } = user;
            return updateGlobal(user,
                updateJoinMesage(global,
                    updatePrefix(global.joinMessage)
                )
            )
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.SET: {
            const value = getValue(ctx);

            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId,
                    updateLeaveMessage(guild,
                        updatePrefix(guild.leaveMessage, value)
                    )
                )
            }
            const { global } = user;
            return updateGlobal(user,
                updateLeaveMessage(global,
                    updatePrefix(global.leaveMessage, value)
                )
            )
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId,
                    updateLeaveMessage(guild,
                        updatePrefix(guild.leaveMessage)
                    )
                )
            }
            const { global } = user;
            return updateGlobal(user,
                updateLeaveMessage(global,
                    updatePrefix(global.leaveMessage)
                )
            )
        }
    }
    return user;
}

const setMessage = (ctx: Context): UserConfig => {
    const { user, guildId, command } = ctx;
    const value = getValue(ctx);

    switch (command) {
        case SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateContent(guild.joinMessage, value),
                    leaveMessage: updateContent(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateContent(joinMessage, value),
                leaveMessage: updateContent(leaveMessage)
            });
        }
        case SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateContent(guild.joinMessage),
                    leaveMessage: updateContent(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateContent(joinMessage),
                leaveMessage: updateContent(leaveMessage)
            });
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateContent(guild.joinMessage, value)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateContent(user.global.joinMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateContent(guild.joinMessage)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateContent(user.global.joinMessage)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateContent(guild.leaveMessage, value)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateContent(user.global.leaveMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateContent(guild.leaveMessage)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateContent(user.global.leaveMessage)));
        }
    }
    return user;
}

const setSuffix = (ctx: Context): UserConfig => {
    const { user, guildId, command } = ctx;
    const value = getValue(ctx);

    switch (command) {
        case SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateSuffix(guild.joinMessage, value),
                    leaveMessage: updateSuffix(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateSuffix(joinMessage, value),
                leaveMessage: updateSuffix(leaveMessage)
            });
        }
        case SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateSuffix(guild.joinMessage),
                    leaveMessage: updateSuffix(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateSuffix(joinMessage),
                leaveMessage: updateSuffix(leaveMessage)
            });
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateSuffix(guild.joinMessage, value)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateSuffix(user.global.joinMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateSuffix(guild.joinMessage)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateSuffix(user.global.joinMessage)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateSuffix(guild.leaveMessage, value)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateSuffix(user.global.leaveMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateSuffix(guild.leaveMessage)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateSuffix(user.global.leaveMessage)));
        }
    }
    return user;
}


const setLanguage = (ctx: Context): UserConfig => {
    const { user, guildId, command } = ctx;
    const value = getValue(ctx);

    switch (command) {
        case SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateLanguage(guild.joinMessage, value),
                    leaveMessage: updateLanguage(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateLanguage(joinMessage, value),
                leaveMessage: updateLanguage(leaveMessage)
            });
        }
        case SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateLanguage(guild.joinMessage),
                    leaveMessage: updateLanguage(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateLanguage(joinMessage),
                leaveMessage: updateLanguage(leaveMessage)
            });
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateLanguage(guild.joinMessage, value)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateLanguage(user.global.joinMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateLanguage(guild.joinMessage)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateLanguage(user.global.joinMessage)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateLanguage(guild.leaveMessage, value)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateLanguage(user.global.leaveMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateLanguage(guild.leaveMessage)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateLanguage(user.global.leaveMessage)));
        }
    }
    return user;
}

const setVoice = (ctx: Context): UserConfig => {
    const { user, guildId, command } = ctx;
    const value = getValue(ctx);

    switch (command) {
        case SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateVoice(guild.joinMessage, value),
                    leaveMessage: updateVoice(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateVoice(joinMessage, value),
                leaveMessage: updateVoice(leaveMessage)
            });
        }
        case SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, {
                    ...guild,
                    joinMessage: updateVoice(guild.joinMessage),
                    leaveMessage: updateVoice(guild.leaveMessage)
                });
            }
            const { joinMessage, leaveMessage } = user.global;
            return updateGlobal(user, {
                ...user.global,
                joinMessage: updateVoice(joinMessage),
                leaveMessage: updateVoice(leaveMessage)
            });
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateVoice(guild.joinMessage, value)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateVoice(user.global.joinMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.JOIN + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateJoinMesage(guild, updateVoice(guild.joinMessage)));
            }
            return updateGlobal(user, updateJoinMesage(user.global, updateVoice(user.global.joinMessage)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.SET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateVoice(guild.leaveMessage, value)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateVoice(user.global.leaveMessage, value)));
        }
        case SUBCOMMAND_GROUP_TYPES.LEAVE + SUBCOMMAND_TYPES.UNSET: {
            if (!!guildId) {
                const guild = user.guilds[guildId];
                return updateGuild(user, guildId, updateLeaveMessage(guild, updateVoice(guild.leaveMessage)));
            }
            return updateGlobal(user, updateLeaveMessage(user.global, updateVoice(user.global.leaveMessage)));
        }
    }
    return user;
}

const update = (ctx: Context): UserConfig | undefined => {
    const { interaction } = ctx;
    const { commandName } = interaction;

    switch (commandName) {
        case COMMANDS.RESET:
            return reset(ctx);
        case COMMANDS.INHERIT_GLOBAL:
            return setInheritGlobal(ctx);
        case COMMANDS.MUTE:
            return setMute(ctx);
        case COMMANDS.PREFIX:
            return setPrefix(ctx);
        case COMMANDS.MESSAGE:
            return setMessage(ctx);
        case COMMANDS.SUFFIX:
            return setSuffix(ctx);
        case COMMANDS.LANGUAGE:
            return setLanguage(ctx);
        case COMMANDS.VOICE:
            return setVoice(ctx);
    }
}

const createContext = (interaction: ChatInputCommandInteraction, command: string, user: UserConfig, guildId?: string): Context => ({ interaction, command, user, guildId });

export default {
    update,
    createContext
}