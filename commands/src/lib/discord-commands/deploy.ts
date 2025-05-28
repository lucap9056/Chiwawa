import { REST, Routes } from 'discord.js';
import rawCommands from "lib/discord-commands/commands";

/**
 * Deploys Discord application (/) commands globally or to a specific guild.
 * @param token The bot token.
 * @param applicationId The application ID of your bot.
 * @param guildId The ID of the guild to deploy commands to (optional, deploys globally if not provided).
 */
export async function deployApplicationCommands(token: string, applicationId: string, guildId: string = "") {

    const commands = rawCommands.map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        if (guildId) {
            const data = await rest.put(
                Routes.applicationGuildCommands(applicationId, guildId),
                { body: commands },
            ) as unknown[];

            console.log(`Successfully reloaded ${data.length} application (/) commands for guild ${guildId}.`);
        } else {
            // Deploy commands globally
            const data = await rest.put(
                Routes.applicationCommands(applicationId),
                { body: commands },
            ) as unknown[];

            console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
        }
    } catch (error: any) {
        console.error("Failed to deploy application commands:");
        if (error.code) {
            console.error(`Error Code: ${error.code}`);
        }
        if (error.message) {
            console.error(`Error Message: ${error.message}`);
        }
        console.error(error);
    }
}