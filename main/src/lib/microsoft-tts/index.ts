import axios from "axios"
import { buildResult, match, None, Option, Some } from "resultant.js/rustify"
import { AppConfig } from "structs/app-config"

interface Context {
    region: string
    apiKey: string
    languages: Languages
}

const createContext = (config: AppConfig, languages: Languages): Context => {
    const region = config.ttsRegion;
    const apiKey = config.ttsApiKey;
    return { region, apiKey, languages };
}

export interface TTSMessage {
    content: string
    language: string
    voiceModel: string
}

interface VoiceModel {
    Locale: string,
    DisplayName: string,
    ShortName: string
}

const DEFAULT_VOICE_MODEL: VoiceModel = {
    Locale: "Locale",
    DisplayName: "HsiaoChen",
    ShortName: "zh-TW-HsiaoChenNeural"
};

const emptyLanguages: Languages = { default: { default: DEFAULT_VOICE_MODEL } };

const getRegion = (config: AppConfig) => config.ttsRegion;

const getApiKey = (config: AppConfig) => config.ttsApiKey;

const fetchAvailableVoiceModels = async (region: string, apiKey: string): Promise<VoiceModel[]> => {
    const response = await axios.get(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Ocp-Apim-Subscription-Key": apiKey
        }
    });
    return response.data;
}

type Language = {
    [voice: string]: VoiceModel
}

type Languages = {
    default: { default: VoiceModel }
    [languages: string]: Language
}

const getLanguages = async (config: AppConfig) => buildResult(async () => {
    const languages: Languages = { ...emptyLanguages };

    const region = getRegion(config);
    const apiKey = getApiKey(config);

    if (!region || region === "") {
        throw new Error("TTS region is not configured or is empty.");
    }
    if (!apiKey || apiKey === "") {
        throw new Error("TTS API key is not configured or is empty.");
    }

    for (const { Locale, DisplayName, ShortName } of await fetchAvailableVoiceModels(region, apiKey)) {
        if (!languages[Locale]) {
            languages[Locale] = {};
        }

        const voiceModel: VoiceModel = { Locale, DisplayName, ShortName };

        languages[Locale][DisplayName] = voiceModel;

        if (ShortName === config.defaultVoiceModel) {
            languages.default = { default: voiceModel };
        }
    }

    return languages;
});

const getTTSMessageLanguage = ({ languages }: Context, language: string): Language => languages[language] || languages.default;

const getTTSMessageVoiceModel = (language: Language, voiceName: string): VoiceModel => language[voiceName] || Object.values(language)[0];

const fetchSpeech = async ({ region, apiKey }: Context, { Locale, ShortName }: VoiceModel, content: string): Promise<Buffer> => {
    const body = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${Locale}">
    <voice name="${ShortName}">${content}</voice>
</speak>
`;

    const response = await axios.post<ArrayBuffer>(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, body, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'ogg-48khz-16bit-mono-opus',
            'User-Agent': 'Chiwawa'
        },
        responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
}

export interface MicrosoftTTS {
    fetchSpeech: (message: TTSMessage) => Promise<Buffer>
}

const initializeTTS = async (config: AppConfig): Promise<Option<MicrosoftTTS>> => {
    const languages = await getLanguages(config);

    return match(languages, {
        Ok(value) {
            const ctx = createContext(config, value);

            return Some<MicrosoftTTS>({
                fetchSpeech: async (message: TTSMessage): Promise<Buffer> => {
                    const languageMap = getTTSMessageLanguage(ctx, message.language);
                    const voiceModel = getTTSMessageVoiceModel(languageMap, message.voiceModel);
                    return fetchSpeech(ctx, voiceModel, message.content);
                }
            });
        },
        Err(err) {
            console.error(`Error fetching speech audio: ${err.message}`);
            return None();
        },
    })
}

const createTTSMessage = (content: string, language: string, voiceModel: string): TTSMessage => {
    return { content, language, voiceModel };
}

export default {
    createTTSMessage,
    initializeTTS,
}