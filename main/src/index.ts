import dotenv from "dotenv";
import Config, { RuntimeConfig } from "lib/config";
import DB, { Database } from "lib/database";
import discord, { DiscordClient } from "/lib/discord-client";
import microsoftTTS from "lib/microsoft-tts";
import { AppConfig } from "models";
import { None, Option, Result, Some, buildResult, match } from "resultant.js/rustify";
dotenv.config();

interface AppDependencies {
    database: Option<Database>;
    discordClient: DiscordClient;
}

const optionStateText = (option: boolean): string => option ? "\x1b[32mtrue\x1b[0m" : "\x1b[31mfalse\x1b[0m";

const loadConfig = async (rawConfig: RuntimeConfig, database: Option<Database>): Promise<RuntimeConfig> => {

    return match(database, {
        async Some(db) {

            const appConfig = await db.getAppConfig().then(
                appConfig => match(appConfig, { Ok: (v) => v, Err: () => None<AppConfig>() })
            );

            return match(appConfig, {
                Some(value) {
                    return { ...rawConfig, ...value };
                },
                None() {
                    return rawConfig;
                },
            });

        },
        async None() {
            return rawConfig;
        }
    });
};

const initializeDatabase = async (databaseUrl: string): Promise<Option<Database>> => {
    const database = await DB.newDatabase(databaseUrl);

    const result = await database.andThen(async (db) => {
        const initResult = await db.initAppInfo();
        return initResult.map(() => db);
    });

    return match(result, {
        Ok: (db) => Some(db),
        Err: ({ message }) => {
            console.error(`Failed to connect to the database at ${databaseUrl}: ${message}`);
            return None<Database>();
        }
    });
};

const setupAppDependencies = (): Promise<Result<AppDependencies, Error>> => buildResult(async () => {
    const rawConfig = Config.loadConfig();
    const database = await initializeDatabase(rawConfig.databaseUrl);

    const config = await loadConfig(rawConfig, database);

    console.log("Database: " + optionStateText(database.isSome()));

    const tts = await microsoftTTS.initializeTTS(config);

    console.log("TTS:" + optionStateText(tts.isSome()));

    database.map(async (db) => {
        const result = await db.setAppConfig(config.appConfig.snapshot());
        result.mapErr((err) => {
            console.error(err);
        });
    });

    const discordClient = await discord.newClient(config, tts, database);

    return { database, discordClient };
});

const shutdownApp = async ({ database, discordClient }: AppDependencies): Promise<void> => {
    database.map((db) => db.close());
    await discordClient.destroy();
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
    const dependencies = await setupAppDependencies();
    if (dependencies.isOk()) {
        setupStopEventListeners(() => shutdownApp(dependencies.unwrap()));
    }
    else {
        console.error(dependencies.unwrapErr());
        process.exit(1);
    }
};

startApp();
