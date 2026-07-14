import { buildResult, type Result } from "resultant.js/rustify";

export interface IssueToken {
    region: string;
    token: string;
    expiresAt: number;
}

export interface TTSMessage {
    getIssueToken: () => Promise<IssueToken>;
}

const TOKEN_VALIDITY_SECONDS = 10 * 60;

const REFRESH_BEFORE_EXPIRATION_SECONDS = 60;

const fetchIssueToken = async (now: number, region: string, apiKey: string): Promise<Result<IssueToken, Error>> =>
    buildResult(() =>
        fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
            headers: {
                "Ocp-Apim-Subscription-Key": apiKey,
                "Content-Length": "0",
            },
        })
            .then((r) => r.text())
            .then((token) => ({
                token,
                expiresAt: now + (TOKEN_VALIDITY_SECONDS - REFRESH_BEFORE_EXPIRATION_SECONDS) * 1000,
                region,
            }))
            .catch((err) => {
                if (err instanceof Error) {
                    throw err;
                }
                throw new Error("");
            }),
    );

const isExpriedToken = (now: number, token?: IssueToken): token is undefined =>
    token === undefined || token.expiresAt <= now;

const initializeTTS = (region: string, apiKey: string, existedToken?: IssueToken) => {
    let ttsRefreshPromise: Promise<IssueToken> | undefined;

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

    return {
        getIssueToken: async (): Promise<IssueToken> => {
            const now = Date.now();
            if (isExpriedToken(now, existedToken)) {
                ttsRefreshPromise ??= refreshIssueToken(now, region, apiKey);
                return await ttsRefreshPromise;
            }
            return existedToken;
        },
    };
};

export { initializeTTS, fetchIssueToken };
