"use client";
import React, { createContext, useContext, useRef, useEffect, useCallback } from "react";
import { GetAccessToken } from "server/tts";
import { IssueToken } from "structs/microsoft-tts";
import { Profile } from "structs/profile";
import { Option, Result } from "resultant.js/rustify";

export interface VoiceModel {
    Locale: string;
    LocalName: string;
    DisplayName: string;
    ShortName: string;
}

export interface Language {
    [LocalName: string]: VoiceModel;
}

export interface Languages {
    [Locale: string]: Language;
}

export interface TTS {
    awaitLoaded: () => Promise<void>;
    isLoaded: () => boolean;
    getDefaultVoiceModel: () => VoiceModel;
    getLanguages: () => string[];
    getVoiceModels: (lang: string) => VoiceModel[];
    findVoiceModel: (shortName: string) => { language: string, voiceModel: string } | undefined;
    getVoiceBlob: (voice: VoiceModel, content: string) => Promise<Blob | undefined>;
}

interface PreviousBlob {
    voiceShortName: string;
    content: string;
    blob: Blob;
}

const DEFAULT_LANGUAGES: Languages = {
    default: {
        default: {
            Locale: "unknown",
            LocalName: "unknown",
            DisplayName: "unknown",
            ShortName: "",
        },
    },
};

const TTSContext = createContext<TTS | null>(null);

export const useTTS = (): TTS => {
    const context = useContext(TTSContext);
    if (!context) {
        throw new Error("useTTS must be used within an TTSProvider.");
    }
    return context;
};

const fetchVoiceModels = async ({ region, token }: IssueToken, defaultVoiceModelShortName: string): Promise<Languages> => {
    if (region === "" || token === "") {
        return { ...DEFAULT_LANGUAGES };
    }

    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
        headers: {
            "Authorization": `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch voice models: ${res.statusText}`);
    }

    const voiceModels: VoiceModel[] = await res.json();

    return voiceModels.reduce((acc: Languages, voiceModel: VoiceModel) => {
        const { Locale, DisplayName, ShortName } = voiceModel;

        if (!acc[Locale]) acc[Locale] = {};

        acc[Locale][DisplayName] = voiceModel;

        if (ShortName === defaultVoiceModelShortName) {
            acc.default = {
                default: { ...voiceModel, LocalName: "default", DisplayName: "default" },
            };
        }

        return acc;
    }, { ...DEFAULT_LANGUAGES });
};

export const TTSProvider: React.FC<{ profile: Profile; children: React.ReactNode }> = ({ profile, children }) => {
    const { appInfo: { config: { defaultVoiceModel }, ttsAccessToken } } = profile;

    const currentToken = useRef<IssueToken>(ttsAccessToken);
    const languages = useRef<Languages>(DEFAULT_LANGUAGES);
    const fetchVoiceBlobPromise = useRef<Promise<Response> | undefined>(undefined);
    const previousBlob = useRef<PreviousBlob | undefined>(undefined);
    const isModelLoaded = useRef(false);
    const loadingPromise = useRef<Promise<void> | undefined>(undefined);

    const getToken = useCallback(async (): Promise<IssueToken> => {
        const REFRESH_THRESHOLD_MS = 30 * 1000;
        const now = Date.now();

        const refresh = !new Option(currentToken.current).isSomeAnd(({ expiresAt }) => expiresAt - now > REFRESH_THRESHOLD_MS);

        if (refresh) {
            const result = await Result.From(GetAccessToken());

            if (result.isOk()) {
                currentToken.current = result.unwrap();
            }
            else {
                const err = result.unwrapErr();
                console.error("Failed to refresh TTS access token:", err);
                throw err;
            }
        }

        return currentToken.current;
    }, []);


    useEffect(() => {
        const loadModels = async () => {
            if (loadingPromise.current) return;

            loadingPromise.current = (async () => {
                try {
                    const token = await getToken();
                    languages.current = await fetchVoiceModels(token, defaultVoiceModel);
                    isModelLoaded.current = true;
                } catch (error) {
                    console.error("Failed to load voice models:", error);

                } finally {
                    loadingPromise.current = undefined;
                }
            })();
        };

        loadModels();
    }, [defaultVoiceModel]);


    const isLoaded = () => isModelLoaded.current;

    const awaitLoaded = async () => {
        try {
            await loadingPromise.current;
        } catch {

        }
    };

    const getDefaultVoiceModel = (): VoiceModel => languages.current.default.default;

    const getLanguages = (): string[] => Object.keys(languages.current);

    const getVoiceModels = (lang: string): VoiceModel[] =>
        languages.current[lang] ? Object.values(languages.current[lang]) : [];

    const findVoiceModel = (shortName: string): { language: string, voiceModel: string } | undefined => {
        for (const locale of Object.values(languages.current)) {
            for (const voiceModel of Object.values(locale)) {
                if (voiceModel.ShortName === shortName && voiceModel.DisplayName !== "default") {
                    return {
                        language: voiceModel.Locale,
                        voiceModel: voiceModel.DisplayName
                    };
                }
            }
        }
    };

    const getVoiceBlob = async (voice: VoiceModel, content: string): Promise<Blob | undefined> => {
        if (fetchVoiceBlobPromise.current !== undefined) return;
        if (
            previousBlob.current &&
            voice.ShortName === previousBlob.current.voiceShortName &&
            previousBlob.current.content === content
        ) {
            return previousBlob.current.blob;
        }

        const { region, token } = await getToken();
        const { Locale, ShortName } = voice;

        fetchVoiceBlobPromise.current = fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: "POST",
            body: `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${Locale}">
            <voice name="${ShortName}">${content}</voice>
        </speak>`,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Ocp-Apim-Subscription-Key": token,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
                "User-Agent": "Web",
            },
        });

        try {
            const res = await fetchVoiceBlobPromise.current;
            if (!res.ok) {
                console.error(`Failed to get voice blob: ${res.statusText}`);
                return undefined;
            }
            const blob = await res.blob();

            previousBlob.current = {
                voiceShortName: voice.ShortName,
                content,
                blob,
            };
            return blob;
        } catch (error) {
            console.error("Error fetching voice blob:", error);
            return undefined;
        } finally {
            fetchVoiceBlobPromise.current = undefined;
        }
    };

    const ttsValue = {
        isLoaded,
        awaitLoaded,
        getDefaultVoiceModel,
        getLanguages,
        getVoiceModels,
        findVoiceModel,
        getVoiceBlob,
    };

    return <TTSContext.Provider value={ttsValue}>{children}</TTSContext.Provider>;
};