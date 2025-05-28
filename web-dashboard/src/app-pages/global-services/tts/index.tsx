"use client";
import React, { createContext, useContext } from "react";
import { GetAccessToken } from "server/tts";
import { IssueToken } from "structs/microsoft-tts";
import { Profile } from "structs/profile";
import { getOrThrow, Result, RsResult } from "structs/rs-result";


export interface Voice {
    Locale: string
    LocalName: string
    DisplayName: string
    ShortName: string
}

export interface Language {
    [LocalName: string]: Voice
}

export interface Languages {
    [Locale: string]: Language
}

export interface TTS {
    awaitLoaded: () => Promise<void>
    isLoaded: () => boolean
    getDefaultVoice: () => Voice
    getLanguages: () => string[]
    getVoices: (lang: string) => Voice[]
    getVoiceBlob: (voice: Voice, content: string) => Promise<Blob | undefined>
}

interface PreviousBlob {
    voiceShortName: string,
    content: string,
    blob: Blob
}

const DEFAULT_LANGUAGES: Languages = {
    default: {
        default: {
            Locale: "unknown",
            LocalName: "unknown",
            DisplayName: "unknown",
            ShortName: "unknown"
        }
    }
};

const TTSContext = createContext<TTS | null>(null);

export const useTTS = (): TTS => {
    const context = useContext(TTSContext);
    if (!context) {
        throw new Error("useTTS must be used within an TTSProvider.");
    }
    return context;
}

const fetchVoiceModules = async (profile: Profile): Promise<Languages> => {
    const { ttsAccessToken, defaultVoiceModule } = profile.appInfo;
    const { region, token } = ttsAccessToken;
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const voices: Voice[] = await res.json();

    return voices.reduce((acc: Languages, voice: Voice) => {
        const { Locale, DisplayName, ShortName } = voice;

        if (!acc[Locale]) acc[Locale] = {};

        acc[Locale][DisplayName] = voice;

        if (ShortName === defaultVoiceModule) {
            acc.default = {
                default: { ...voice, LocalName: "default", DisplayName: "default" },
            }
        }

        return acc;
    }, { ...DEFAULT_LANGUAGES });
}

export const TTSProvider: React.FC<{ profile: Profile, children: React.ReactNode }> = ({ profile, children }) => {
    const { ttsAccessToken } = profile.appInfo;
    let getToken: Promise<RsResult<IssueToken>> = Result((Ok) => Ok(ttsAccessToken));
    let languages: Languages = { ...DEFAULT_LANGUAGES };
    let fetchVoiceBlob: Promise<Response> | undefined;
    let previous: PreviousBlob | undefined;
    let loaded = false;

    const loading = fetchVoiceModules(profile).then((langs) => {
        languages = langs;
    }).finally(() => {
        loaded = true;
    });

    const isLoaded = () => loaded;

    const awaitLoaded = async () => {
        try {
            await loading;
        }
        catch { }
    }

    const init = async () => {
        if (loaded) return;
        loaded = true;
        return fetchVoiceModules(profile).then((langs) => {
            languages = langs;
        });
    }

    const GetToken = () => getToken.then((token) => {
        const now = new Date().getTime();
        if (getOrThrow(token).expiresAt > now) {
            return token;
        }
        return getToken = GetAccessToken();
    });

    const getDefaultVoice = (): Voice => languages.default.default;

    const getLanguages = (): string[] => Object.keys(languages);

    const getVoices = (lang: string): Voice[] => languages[lang] ? Object.values(languages[lang]) : [];

    const getVoiceBlob = async (voice: Voice, content: string): Promise<Blob | undefined> => {
        if (fetchVoiceBlob !== undefined) return;
        if (previous && voice.ShortName === previous.voiceShortName && previous.content === content) {
            return previous.blob;
        }

        const { region, token } = await GetToken().then(getOrThrow);
        const { Locale, ShortName } = voice;

        fetchVoiceBlob = fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: "POST",
            body: `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${Locale}">
            <voice name="${ShortName}">${content}</voice>
        </speak>`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Ocp-Apim-Subscription-Key': token,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                'User-Agent': 'Web'
            }
        });
        const res = await fetchVoiceBlob;
        const blob = await res.blob();

        fetchVoiceBlob = undefined;
        previous = {
            voiceShortName: voice.ShortName,
            content,
            blob
        }
        return blob;
    }

    return <TTSContext.Provider value={{ isLoaded, awaitLoaded, getDefaultVoice, getLanguages, getVoices, getVoiceBlob }}>{children}</TTSContext.Provider>
}