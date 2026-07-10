import type { Cache } from "lib/cache";
import type { Database } from "lib/database";
import type { MicrosoftTTS } from "lib/microsoft-tts";
import type { AppConfig } from "models";
import type { Option } from "resultant.js/rustify";

export interface Suffix {
    join: string;
    leave: string;
}

export interface State {
    readonly appConfig: {
        snapshot: () => AppConfig;
        defaultSuffix: () => Suffix;
        tts: () => { region: string; apiKey: string; defaultVoiceModel: string };
        admins: () => string[];
    };
    readonly database: Option<Database>;
    readonly cache: Option<Cache>;
    readonly tts: Option<MicrosoftTTS>;
}

interface StateUpdater {
    updateConfig: (config: AppConfig) => void;
    updateTTS: (tts: Option<MicrosoftTTS>) => void;
}

const copyAppConfig = (config: AppConfig): AppConfig => ({ ...config, admins: [...config.admins] });

export const newState = (
    appConfig: AppConfig,
    database: Option<Database>,
    cache: Option<Cache>,
    tts: Option<MicrosoftTTS>,
): State & StateUpdater => {
    let currentConfig: AppConfig = copyAppConfig(appConfig);
    let currentTTS: Option<MicrosoftTTS> = tts;

    return {
        appConfig: {
            snapshot: (): AppConfig => copyAppConfig(currentConfig),
            defaultSuffix: (): Suffix => ({
                join: currentConfig.defaultJoinSuffix,
                leave: currentConfig.defaultLeaveSuffix,
            }),
            tts: (): { region: string; apiKey: string; defaultVoiceModel: string } => ({
                region: currentConfig.ttsRegion || "",
                apiKey: currentConfig.ttsApiKey || "",
                defaultVoiceModel: currentConfig.defaultVoiceModel,
            }),
            admins: (): string[] => [...currentConfig.admins],
        },
        database,
        cache,
        get tts() {
            return currentTTS;
        },
        updateConfig: (updatedConfig: AppConfig) => {
            currentConfig = { ...updatedConfig };
        },
        updateTTS: (updatedTTS: Option<MicrosoftTTS>) => {
            currentTTS = updatedTTS;
        },
    };
};
