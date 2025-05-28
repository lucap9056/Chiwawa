import { ChatInputCommandInteraction, Client, GatewayIntentBits, Interaction, MessageFlags, Partials } from "discord.js";
import { createEmptySpeechNotice, createEmptyUserConfig, UserConfig } from "structs/user-config";
import { AppConfig } from "lib/config";
import { Database } from "lib/database";
import userReply from "lib/discord-client/user-reply";
import userUpdate from "lib/discord-client/user-update";
import { COMMANDS } from "lib/discord-commands/commands";


const createClient = (token: string): Promise<Client<true>> => {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.DirectMessages,
        ],
        partials: [
            Partials.GuildMember,
            Partials.User
        ]
    });

    return new Promise(async (resolve, reject) => {

        const loginTimeout = setTimeout(() => {
            reject(new Error("Discord client login timed out after 5 seconds."));
        }, 5000);

        client.once("ready", (readyClient) => {
            console.log(new Date().toLocaleString(), "Bot Ready");
            clearTimeout(loginTimeout);
            resolve(readyClient);
        });

        try {
            await client.login(token);
        }
        catch (error) {
            clearTimeout(loginTimeout);
            reject(new Error(`Failed to log in to Discord: ${(error as Error).message}`));
        }

    });
}

export interface DiscordClient {
    destroy: () => Promise<void>
}

const getUserConfig = async (database: Database, { user }: ChatInputCommandInteraction) => (await database.getUserConfig(user.id)) || createEmptyUserConfig(user.id);

const getGuildId = ({ guildId }: ChatInputCommandInteraction) => guildId || undefined;

const insertNewGuild = (userConfig: UserConfig, guildId: string): UserConfig => ({
    ...userConfig,
    guilds: {
        ...userConfig.guilds,
        [guildId]: createEmptySpeechNotice()
    }
});

const getSubcommand = ({ options }: ChatInputCommandInteraction): string => (options.getSubcommandGroup(false) || "") + (options.getSubcommand(false) || "");

const newClient = async (config: AppConfig, database: Database) => {

    const client = await createClient(config.discordToken);

    client.on("error", (err) => console.log(err));

    client.on("interactionCreate", async (i: Interaction) => {
        if (!i.isChatInputCommand()) return;

        await i.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const userConfig = await getUserConfig(database, i);
            const guildId = getGuildId(i);

            const insertedUserConfig = (!!guildId && (!userConfig.guilds || !userConfig.guilds[guildId])) ? insertNewGuild(userConfig, guildId) : userConfig;

            const command = getSubcommand(i);

            switch (i.commandName) {
                case COMMANDS.GET:
                    return userReply.replyUserConfig(database, i, userConfig, guildId);
            }

            const updateContext = userUpdate.createContext(i, command, insertedUserConfig, guildId);
            const updatedUserConfig = userUpdate.update(updateContext);

            if (updatedUserConfig) {

                database.setUserConfig(updatedUserConfig).then(async () => {
                    await i.deleteReply();
                }).catch(async () => {
                    const errorMessage = 'An error occurred while saving your data. Please try again later.';
                    if (!i.replied && !i.deferred) {
                        await i.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
                    } else {
                        await i.editReply({ content: errorMessage });
                    }
                });

            }
        }
        catch (err) {
            const content = "An unexpected error occurred while processing your command.";
            if (!i.replied && !i.deferred) {
                await i.reply({ content, flags: MessageFlags.Ephemeral });
            } else {
                await i.editReply({ content });
            }
            throw err;
        }

    });

    return {
        destroy: () => client.destroy()
    }
}

export default {
    newClient
}