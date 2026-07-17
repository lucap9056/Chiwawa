import { buildResultAsync, type Result } from "resultant.js/rustify";

export interface IssueToken {
    region: string;
    token: string;
    expiresAt: number;
}

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

export interface TTSMessage {
    getCredentials: () => {
        region: string;
        apiKey: string;
    };
    getIssueToken: () => Promise<IssueToken>;
    getLanguages: () => Promise<Languages>;
}

const TOKEN_VALIDITY_SECONDS = 10 * 60;

const REFRESH_BEFORE_EXPIRATION_SECONDS = 60;

export const DEFAULT_LANGUAGES: Languages = {
    default: {
        default: {
            Locale: "en-US",
            LocalName: "Jenny",
            DisplayName: "Jenny",
            ShortName: "en-US-JennyNeural",
        },
    },
};

const fetchIssueToken = async (now: number, region: string, apiKey: string): Promise<Result<IssueToken, Error>> =>
    buildResultAsync(() =>
        fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": apiKey,
                "Content-Length": "0",
            },
        })
            .then(async (r) => {
                const body = await r.text();
                if (!r.ok) {
                    throw new Error(`Failed to issue TTS token [${r.status}]: ${body}`);
                }
                return body;
            })
            .then((token) => ({
                token,
                expiresAt: now + (TOKEN_VALIDITY_SECONDS - REFRESH_BEFORE_EXPIRATION_SECONDS) * 1000,
                region,
            }))
            .catch((err) => {
                if (err instanceof Error) {
                    throw err;
                }
                throw new Error("Failed to issue TTS token.");
            }),
    );

export const fetchVoiceModels = async ({ region, token }: IssueToken): Promise<Result<Languages, Error>> =>
    buildResultAsync(async () => {
        const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch voice models [${res.status}]: ${res.statusText}`);
        }

        const voiceModels: VoiceModel[] = await res.json();

        return voiceModels.reduce((acc: Languages, voiceModel: VoiceModel) => {
            const { Locale, DisplayName } = voiceModel;
            if (!acc[Locale]) acc[Locale] = {};
            acc[Locale][DisplayName] = voiceModel;
            return acc;
        }, {});
    });

export const resolveDefaultVoiceModel = (languages: Languages, defaultVoiceModelShortName: string): Languages => {
    for (const locale of Object.values(languages)) {
        for (const voiceModel of Object.values(locale)) {
            if (voiceModel.ShortName === defaultVoiceModelShortName) {
                return {
                    ...languages,
                    default: { default: { ...voiceModel, LocalName: "default", DisplayName: "default" } },
                };
            }
        }
    }
    return { ...DEFAULT_LANGUAGES, ...languages };
};

const isExpriedToken = (now: number, token?: IssueToken): token is undefined =>
    token === undefined || token.expiresAt <= now;

const initializeTTS = (region: string, apiKey: string, existedToken?: IssueToken): TTSMessage => {
    let ttsRefreshPromise: Promise<IssueToken> | undefined;
    let languages: Languages = { ...DEFAULT_LANGUAGES };
    let languagesRefreshPromise: Promise<Languages> | undefined;
    let languagesLoaded = false;

    const refreshIssueToken = async (now: number, region: string, apiKey: string) => {
        const res = await fetchIssueToken(now, region, apiKey);

        const issueToken: IssueToken = res.unwrapOrElse((err) => {
            console.log(err);
            return {
                token: "",
                expiresAt: now + 2 * 60 * 1000,
                region,
            };
        });

        existedToken = issueToken;
        ttsRefreshPromise = undefined;
        return issueToken;
    };

    const getIssueToken = async (): Promise<IssueToken> => {
        const now = Date.now();
        if (isExpriedToken(now, existedToken)) {
            ttsRefreshPromise ??= refreshIssueToken(now, region, apiKey);
            return await ttsRefreshPromise;
        }
        return existedToken;
    };

    const refreshLanguages = async (): Promise<Languages> => {
        const token = await getIssueToken();
        const modelsResult = await fetchVoiceModels(token);
        languages = modelsResult.unwrapOrElse((err) => {
            console.error("Failed to load TTS voice models:", err);
            return { ...DEFAULT_LANGUAGES };
        });
        languagesLoaded = true;
        languagesRefreshPromise = undefined;
        return languages;
    };

    const getLanguages = async (): Promise<Languages> => {
        if (region === "" || apiKey === "" || languagesLoaded) {
            return languages;
        }
        languagesRefreshPromise ??= refreshLanguages();
        return await languagesRefreshPromise;
    };

    return {
        getCredentials: () => ({ region, apiKey }),
        getIssueToken,
        getLanguages,
    };
};

export { initializeTTS, fetchIssueToken };
