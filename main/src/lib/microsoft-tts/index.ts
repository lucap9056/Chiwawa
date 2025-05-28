import axios from "axios"
import { AppConfig } from "lib/config"

interface Context {
    region: string
    token: string
    languages: Languages
}

const createContext = (config: AppConfig, languages: Languages): Context => {
    const region = config.ttsRegin;
    const token = config.ttsToken;
    return { region, token, languages };
}

export interface TTSMessage {
    content: string
    language: string
    voice: string
}

interface Voice {
    Locale: string,
    DisplayName: string,
    ShortName: string
}

const DEFAULT_VOICE_MODULE: Voice = {
    Locale: "Locale",
    DisplayName: "HsiaoChen",
    ShortName: "zh-TW-HsiaoChenNeural"
};

const getRegion = (config: AppConfig) => config.ttsRegin;

const getToken = (config: AppConfig) => config.ttsToken;

const getLanguagesArray = async (region: string, token: string): Promise<Voice[]> => {
    const response = await axios.get(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": token
        }
    });
    return response.data;
}

type Language = {
    [voice: string]: Voice
}

type Languages = {
    default: { default: Voice }
    [languages: string]: Language
}

const getLanguages = async (config: AppConfig) => {
    const languages: Languages = { default: { default: DEFAULT_VOICE_MODULE } };

    const region = getRegion(config);
    const token = getToken(config);

    for (const { Locale, DisplayName, ShortName } of await getLanguagesArray(region, token)) {
        if (!languages[Locale]) {
            languages[Locale] = {};
        }

        const voice: Voice = { Locale, DisplayName, ShortName };

        languages[Locale][DisplayName] = voice;

        if (ShortName === config.ttsDefaultVoiceModule) {
            languages.default = { default: voice };
        }
    }

    return languages;
}

const getTTSMessageLanguage = ({ languages }: Context, language: string): Language => languages[language] || languages.default;

const getTTSMessageVoice = (language: Language, voiceName: string): Voice => language[voiceName] || Object.values(language)[0];

const fetchSpeech = async ({ region, token }: Context, { Locale, ShortName }: Voice, content: string): Promise<Buffer> => {
    const body = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${Locale}">
    <voice name="${ShortName}">${content}</voice>
</speak>
`;

    const response = await axios.post(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, body, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': token,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'Chiwawa'
        },
        responseType: 'arraybuffer'
    });

    return response.data;
}

export interface MicrosoftTTS {
    fetchSpeech: (message: TTSMessage) => Promise<Buffer>
}

const initializeTTS = async (config: AppConfig): Promise<MicrosoftTTS> => {

    const languages = await getLanguages(config);
    const ctx = createContext(config, languages);

    return {
        fetchSpeech: (message: TTSMessage): Promise<Buffer> => {
            const languageMap = getTTSMessageLanguage(ctx, message.language);
            const voice = getTTSMessageVoice(languageMap, message.voice);
            return fetchSpeech(ctx, voice, message.content);
        }
    }
}

const createTTSMessage = (content: string, language: string, voice: string): TTSMessage => {
    return { content, language, voice };
}

export default {
    createTTSMessage,
    initializeTTS,
}