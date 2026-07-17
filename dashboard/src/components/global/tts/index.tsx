import type React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Err, matchAsync, Ok, Option, type Result } from "resultant.js/rustify";
import { toast } from "sonner";
import api from "#/api";
import type { ErrorCode } from "#/errors";
import type { IssueToken } from "#/services/microsoft-tts";

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
    loaded: boolean;
    run: (defaultVoiceModel: string) => Promise<void>;
    awaitLoaded: () => Promise<void>;
    getDefaultVoiceModel: () => VoiceModel;
    getLanguages: () => string[];
    getVoiceModels: (lang: string) => VoiceModel[];
    findVoiceModel: (shortName: string) => { language: string; voiceModel: string } | undefined;
    getVoiceBlob: (voice: VoiceModel, content: string) => Promise<Blob | undefined>;
}

interface PreviousBlob {
    voiceShortName: string;
    content: string;
    blob: Blob;
}

const EMPTY_ISSUE_TOKEN: IssueToken = { region: "", token: "", expiresAt: 0 };

// Fallback used before the real catalog loads, and whenever a defaultVoiceModel can't be
// matched in it — a real, broadly-available voice rather than an empty ShortName, so TTS
// still actually works in that case instead of silently failing to synthesize anything.
const DEFAULT_LANGUAGES: Languages = {
    default: {
        default: {
            Locale: "en-US",
            LocalName: "Jenny",
            DisplayName: "Jenny",
            ShortName: "en-US-JennyNeural",
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

const fetchVoiceModels = async (
    { region, token }: IssueToken,
    defaultVoiceModelShortName: string,
): Promise<Result<Languages, string>> => {
    if (region === "" || token === "") {
        return Ok({ ...DEFAULT_LANGUAGES });
    }

    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) {
        return Err(`Failed to fetch voice models: ${res.statusText}`);
    }

    const voiceModels: VoiceModel[] = await res.json();

    return Ok(
        voiceModels.reduce(
            (acc: Languages, voiceModel: VoiceModel) => {
                const { Locale, DisplayName, ShortName } = voiceModel;

                if (!acc[Locale]) acc[Locale] = {};

                acc[Locale][DisplayName] = voiceModel;

                if (ShortName === defaultVoiceModelShortName) {
                    acc.default = {
                        default: { ...voiceModel, LocalName: "default", DisplayName: "default" },
                    };
                }

                return acc;
            },
            { ...DEFAULT_LANGUAGES },
        ),
    );
};

export const TTSProvider: React.FC<{
    children: React.ReactNode;
    defaultVoiceModel: string;
    initialLanguages?: Languages;
}> = ({ children, defaultVoiceModel, initialLanguages }) => {
    const { t } = useTranslation();
    const currentToken = useRef<IssueToken>(EMPTY_ISSUE_TOKEN);
    const languages = useRef<Languages>(initialLanguages ?? DEFAULT_LANGUAGES);
    const fetchVoiceBlobPromise = useRef<Promise<Response> | undefined>(undefined);
    const previousBlob = useRef<PreviousBlob | undefined>(undefined);
    const loadingPromise = useRef<Promise<void> | undefined>(undefined);
    const [loaded, setLoaded] = useState(false);

    const getToken = useCallback(async (): Promise<Result<IssueToken, ErrorCode>> => {
        const REFRESH_THRESHOLD_MS = 30 * 1000;
        const now = Date.now();

        const refresh = !new Option(currentToken.current).isSomeAnd(
            ({ expiresAt }) => expiresAt - now > REFRESH_THRESHOLD_MS,
        );

        if (!refresh) {
            return Ok(currentToken.current);
        }

        const result = await api.getAccessToken();
        if (result.isErr()) {
            console.error("Failed to refresh TTS access token:", result.unwrapErr());
            return result;
        }

        currentToken.current = result.unwrap();
        return result;
    }, []);

    const run = useCallback(
        async (defaultVoiceModel: string): Promise<void> => {
            if (loadingPromise.current) return loadingPromise.current;

            loadingPromise.current = (async () => {
                await matchAsync(getToken(), {
                    Ok: async (token) => {
                        return matchAsync(fetchVoiceModels(token, defaultVoiceModel), {
                            Ok: (models) => {
                                languages.current = models;
                            },
                            Err: (err) => {
                                console.error("Failed to load voice models:", err);
                                toast.error(t("app.tts-load-failed"));
                            },
                        });
                    },
                    Err: () => {
                        toast.error(t("app.tts-load-failed"));
                    },
                });

                loadingPromise.current = undefined;
                setLoaded(true);
            })();

            return loadingPromise.current;
        },
        [getToken, t],
    );

    useEffect(() => {
        run(defaultVoiceModel);
    }, [defaultVoiceModel, run]);

    const awaitLoaded = async () => {
        await loadingPromise.current;
    };

    const getDefaultVoiceModel = (): VoiceModel => languages.current.default.default;

    const getLanguages = (): string[] => Object.keys(languages.current);

    const getVoiceModels = (lang: string): VoiceModel[] =>
        languages.current[lang] ? Object.values(languages.current[lang]) : [];

    const findVoiceModel = (shortName: string): { language: string; voiceModel: string } | undefined => {
        for (const locale of Object.values(languages.current)) {
            for (const voiceModel of Object.values(locale)) {
                if (voiceModel.ShortName === shortName && voiceModel.DisplayName !== "default") {
                    return {
                        language: voiceModel.Locale,
                        voiceModel: voiceModel.DisplayName,
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

        const tokenResult = await getToken();
        if (tokenResult.isErr()) {
            return undefined;
        }
        const { region, token } = tokenResult.unwrap();
        const { Locale, ShortName } = voice;

        fetchVoiceBlobPromise.current = fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: "POST",
            body: `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${Locale}">
            <voice name="${ShortName}">${content}</voice>
        </speak>`,
            headers: {
                Authorization: `Bearer ${token}`,
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

    const ttsValue: TTS = {
        loaded,
        run,
        awaitLoaded,
        getDefaultVoiceModel,
        getLanguages,
        getVoiceModels,
        findVoiceModel,
        getVoiceBlob,
    };

    return <TTSContext.Provider value={ttsValue}>{children}</TTSContext.Provider>;
};
