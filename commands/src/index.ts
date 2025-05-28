import DB, { Database } from "lib/database";
import discord, { DiscordClient } from "lib/discord-client";
import Config, { AppConfig } from "lib/config";
import dotenv from "dotenv";
dotenv.config();

interface AppDependencies {
    database?: Database
    discordClient: DiscordClient
}

const loadConfig = (): AppConfig => Config.newConfig();

const setupAppDependencies = async (): Promise<AppDependencies> => {

    const config = loadConfig();

    const database = await DB.newDatabase(config.databaseUrl);

    const discordClient = await discord.newClient(config, database);

    return { database, discordClient }
}

const shutdownApp = async (dependencies: AppDependencies): Promise<void> => {
    if (dependencies.database) {
        dependencies.database.close();
    }
    await dependencies.discordClient.destroy();
};

const setupStopEventListeners = (shutdown: () => Promise<void>) => {

    const exitGracefully = () => {

        shutdown()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));

        setTimeout(() => {
            process.exit(1);
        }, 10 * 1000);

    };

    process.on("SIGINT", exitGracefully);
    process.on("SIGTERM", exitGracefully);
};


const startApp = async () => {
    try {
        const dependencies = await setupAppDependencies();
        setupStopEventListeners(() => shutdownApp(dependencies));
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

startApp();
