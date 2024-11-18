/**
 * This file defines interfaces and classes to interact with the TTS (Text-to-Speech) API.
 * It includes functionality to retrieve available languages and voices, select a voice, and play TTS content.
 */

interface Voice {
    Locale: string
    LocalName: string
    DisplayName: string
    ShortName: string
}

interface Language {
    [LocalName: string]: Voice
}

interface Languages {
    [Locale: string]: Language
}

class Selector {
    private languages: Languages;
    private language: Language;
    private voice?: Voice;
    private tts: TTS;

    /**
     * Creates an instance of the Selector class.
     * @param tts - An instance of the TTS class to interact with the TTS service.
     * @param lang - The language code to select the language.
     * @param vo - The voice name to select the specific voice.
     */
    constructor(tts: TTS, lang: string, vo: string) {

        const languages = tts.GetLanguages();
        const language = languages[lang] || languages[tts.language];

        this.language = language;

        if (lang && vo) {
            const voice = tts.GetVoice(lang, vo);
            this.voice = voice || Object.values(language)[0] || undefined;
        } else {
            this.voice = Object.values(language)[0] || undefined;
        }

        this.tts = tts;
        this.languages = languages;
    }

    /**
     * Gets the available languages.
     * @returns An array of available language codes.
     */
    public get Languages(): string[] {
        return Object.keys(this.languages);
    }

    /**
     * Sets the selected language.
     * @param lang - The language code to set.
     */
    public set Language(lang: string) {
        const { languages } = this;
        if (languages[lang]) {
            this.language = languages[lang];
            this.voice = Object.values(languages[lang])[0];
        }
    }

    /**
     * Gets the locale of the selected language.
     * @returns The locale of the selected language.
     */
    public get Language(): string {
        return Object.values(this.language)[0].Locale;
    }

    /**
     * Gets the available voices for the selected language.
     * @returns An array of available voice names.
     */
    public get Voices(): Voice[] {
        return Object.values(this.language);
    }

    /**
     * Gets the local name of the selected voice.
     * @returns The local name of the selected voice.
     */
    public get Voice(): Voice {
        const { voice } = this;

        if (voice) {
            return voice;
        } else {
            Object.values(this.language)[0];
        }
    }

    /**
     * Sets the selected voice.
     * @param voice - The local name of the voice to set.
     */
    public set Voice(voice: string) {
        const { language } = this;
        if (language[voice]) {
            this.voice = language[voice];
        }
    }

    /**
     * Plays the given content using the selected voice.
     * @param content - The text content to be converted to speech.
     * @returns A promise that resolves to a Blob containing the audio data.
     */
    public Play(content: string): Promise<Blob> {
        const { tts, voice } = this;
        return tts.Play(voice, content);
    }

}

interface TTS {
    token: string
    region: string
    language: string
    defaultMessages: {
        joinSuffix: string
        leaveSuffix: string
    }
}

class TTS {
    private languages: Languages;
    public static DefaultVoice: Voice = {
        Locale: "en-US",
        LocalName: "Ava Multilingual",
        DisplayName: "Ava Multilingual",
        ShortName: "en-US-AvaMultilingualNeural"
    };

    public static DefaultLanguage: Language = {
        "Ava Multilingual": TTS.DefaultVoice
    }

    /**
     * Creates an instance of the TTS class.
     * @param tts - An object containing the initial configuration for the TTS service.
     */
    constructor(tts: TTS) {
        Object.assign(this, tts);
    }

    /**
     * Sets the token used for authentication with the TTS API.
     * @param token - The new token to be used.
     */
    public async Init(): Promise<void> {
        const { region, token } = this;

        await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then((res) => res.json())
            .then(
                (voices: Voice[]) => voices.reduce((acc, v) => {
                    const { Locale, DisplayName } = v;

                    if (!acc[Locale]) acc[Locale] = {};

                    acc[Locale][DisplayName] = v;

                    return acc;
                }, {} as Languages)
            ).then((langs) => {
                this.languages = langs;
            });
    }

    /**
     * Sets the token used for authentication with the TTS API.
     * @param token - The new token to be used.
     */
    public SetToken(token: string): void {
        this.token = token;
    }

    /**
     * Gets the available languages for the TTS service.
     * @returns An object containing languages and their associated voices.
     */
    public GetLanguages(): Languages {
        return this.languages;
    }

    /**
     * Gets the language object for the specified language code.
     * @param lang - The language code to retrieve.
     * @returns The language object or the default language if not found.
     */
    public GetLanguage(lang: string): Language {
        const { languages, language } = this;
        return languages[lang] || languages[language] || TTS.DefaultLanguage;
    }

    /**
     * Gets the available voices for the specified language code.
     * @param lang - The language code to retrieve voices for.
     * @returns An array of voice names for the specified language.
     */
    public GetVoices(lang: string): string[] {
        return Object.keys(this.languages[lang] || {});
    }

    /**
     * Gets the voice object for the specified language and voice name.
     * @param lang - The language code of the desired voice.
     * @param vo - The name of the desired voice.
     * @returns The voice object or the default voice if not found.
     */
    public GetVoice(lang: string, vo: string): Voice {
        const language = this.languages[lang] || TTS.DefaultLanguage;
        return language[vo] || TTS.DefaultVoice;
    }

    /**
     * Plays the given content using the specified voice.
     * @param vo - The voice to use for playing the content.
     * @param content - The text content to be converted to speech.
     * @returns A promise that resolves to a Blob containing the audio data.
     */
    public Play(vo: Voice, content: string): Promise<Blob> {
        const { region, token } = this;

        return fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: "POST",
            body: `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${vo.Locale}">
            <voice name="${vo.ShortName}">${content}</voice>
        </speak>`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Ocp-Apim-Subscription-Key': token,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                'User-Agent': 'Chiwawa'
            }
        }).then(res => res.blob());
    }
}

export default TTS;

export {
    Selector,
    Languages,
    Language,
    Voice
}