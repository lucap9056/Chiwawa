import dotenv from "dotenv";
import { newState } from "lib/appstate";
import cache, { type Cache } from "lib/cache";
import Config from "lib/config";
import DB, { type Database, isNotFound, NotFoundError } from "lib/database";
import discord, { type DiscordClient } from "lib/discord-client";
import microsoftTTS from "lib/microsoft-tts";
import { buildResult, match, None, Ok, type Option, type Result, Some } from "resultant.js/rustify";
import type { AppConfig } from "./models";

dotenv.config();

interface AppDependencies {
    database: Option<Database>;
    redis: Option<Cache>;
    discordClient: DiscordClient;
}

const optionStateText = (option: boolean): string => (option ? "\x1b[32mtrue\x1b[0m" : "\x1b[31mfalse\x1b[0m");

const initializeDatabase = async (databaseUrl: string, appConfig: AppConfig): Promise<Option<Database>> => {
    if (databaseUrl === "") {
        return None();
    }
    const database = await DB.newDatabase(databaseUrl);

    const result = await database.andThen(async (db) => {
        const initResult = await db.initAppConfig(appConfig);
        return initResult.map(() => db);
    });

    return match(result, {
        Ok: (db) => Some(db),
        Err: ({ message }) => {
            console.error(`main: failed to connect to the database at ${databaseUrl}: ${message}`);
            return None<Database>();
        },
    });
};

const initializeCache = async (redisUrl: string): Promise<Option<Cache>> => {
    if (redisUrl === "") {
        return None();
    }
    return cache.newCache(redisUrl).then((redis) =>
        match(redis, {
            Ok: (r) => Some(r),
            Err: (err) => {
                console.error(`main: failed to connect to Redis at ${redisUrl}: ${err.message}`);
                return None();
            },
        }),
    );
};

const loadAppConfig = (database: Option<Database>, rawConfig: AppConfig): Promise<AppConfig> => {
    return database
        .map((db) =>
            db
                .getAppConfig()
                .then((getConfig) =>
                    getConfig.andThen((config): Result<AppConfig, Error> => config.okOr(new NotFoundError())),
                ),
        )
        .unwrapOrElse(async () => Ok(rawConfig))
        .then((getConfig) => {
            return match(getConfig, {
                Ok: (config) => config,
                Err: (err) => {
                    if (!isNotFound(err)) {
                        console.error(`main: failed to load app config: ${err.message}`);
                    }
                    return rawConfig;
                },
            });
        });
};

const setupAppDependencies = (): Promise<Result<AppDependencies, Error>> =>
    buildResult(async () => {
        const { appConfig: rawAppConfig, databaseUrl, redisUrl, discordToken } = Config.loadConfig();
        const database = await initializeDatabase(databaseUrl, rawAppConfig);

        const appConfig = await loadAppConfig(database, rawAppConfig);

        console.log(`main: database: ${optionStateText(database.isSome())}`);

        const redis = await initializeCache(redisUrl);

        console.log(`main: redis: ${optionStateText(redis.isSome())}`);

        const tts = await microsoftTTS.initializeTTS(appConfig);

        console.log(`main: tts: ${optionStateText(tts.isSome())}`);

        const state = newState(appConfig, database, redis, tts);

        redis.map((r) => {
            let currentUpdateId = 0;
            r.on("configUpdated", async (newConfig) => {
                const { region: o1, apiKey: o2, defaultVoiceModel: o3 } = state.appConfig.tts();
                state.updateConfig(newConfig);
                const { region: n1, apiKey: n2, defaultVoiceModel: n3 } = state.appConfig.tts();
                if (o1 !== n1 || o2 !== n2 || o3 !== n3) {
                    const myUpdateId = ++currentUpdateId;
                    microsoftTTS.initializeTTS(newConfig).then((updatedTTS) => {
                        if (myUpdateId === currentUpdateId) {
                            state.updateTTS(updatedTTS);
                        }
                    });
                }
            });
        });

        const discordClient = await discord.newClient(discordToken, state);

        return { database, redis, discordClient };
    });

const shutdownApp = async ({ database, redis, discordClient }: AppDependencies): Promise<void> => {
    database.map((db) => db.close());
    redis.map((r) => r.close());
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
    } else {
        console.error(`main: failed to start: ${dependencies.unwrapErr().message}`);
        process.exit(1);
    }
};

startApp();
