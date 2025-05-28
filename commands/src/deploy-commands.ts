import { deployApplicationCommands } from "lib/discord-commands/deploy";
import dotenv from "dotenv";
dotenv.config();

const DISCORD_TOKEN = process.env.APP_DISCORD_TOKEN || "";
const APPLICATION_ID = process.env.APPLICATION_ID || "";
const GUILD_ID = process.env.GUILD_ID || "";

deployApplicationCommands(DISCORD_TOKEN, APPLICATION_ID, GUILD_ID);