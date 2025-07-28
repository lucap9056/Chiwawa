import axios from "axios";
import { createEmptyIssueToken, IssueToken } from "structs/microsoft-tts";
import { Mutex } from "structs/mutex";
import { goify } from "resultant.js/goify";

declare global {
    var _ttsRegion: string | undefined
    var _ttsApiKey: string | undefined
    var _ttsMutex: Mutex
    var _ttsIssueToken: IssueToken | undefined;
}

if (global._ttsMutex === undefined) {
    global._ttsMutex = new Mutex();
}

const TOKEN_VALIDITY_SECONDS = 10 * 60;

const REFRESH_BEFORE_EXPIRATION_SECONDS = 60;

const fetchIssueToken = async (region: string, apiKey: string): Promise<string> => {
    const { data } = await axios.post<string>(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        null,
        {
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Content-Length': '0',
            },
        }
    );
    return data;
}

const refreshIssueToken = async (now: number, region: string, apiKey: string) => {
    if (region === "" || apiKey === "") {
        return createEmptyIssueToken();
    }

    const [t, err] = await goify(() => fetchIssueToken(region, apiKey));

    const token = t || "";

    const expiresAt = (err) ?
        now + (2 * 60 * 1000) :
        now + (TOKEN_VALIDITY_SECONDS - REFRESH_BEFORE_EXPIRATION_SECONDS) * 1000;

    const issueToken: IssueToken = { token, expiresAt, region };
    global._ttsIssueToken = issueToken;
    return issueToken;

}

const isExpriedToken = (now: number, token?: IssueToken): token is undefined => (token === undefined || token.expiresAt <= now);

export const GetIssueToken = async (region: string = "", apiKey: string = ""): Promise<IssueToken> => {
    const now = Date.now();

    if (region && !global._ttsRegion) {
        global._ttsRegion = region;
    } else if (!region) {
        region = global._ttsRegion || "";
    }

    if (apiKey && !global._ttsApiKey) {
        global._ttsApiKey = apiKey;
    } else if (!region) {
        apiKey = global._ttsApiKey || "";
    }

    const mux = global._ttsMutex;

    const [token, err] = await mux.runExclusive<IssueToken>(async () => {

        const existedToken = global._ttsIssueToken;

        return isExpriedToken(now, existedToken) ?
            await refreshIssueToken(now, region, apiKey) :
            existedToken;
    })

    if (err) {
        throw err;
    }

    return token;
};
