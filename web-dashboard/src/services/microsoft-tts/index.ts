import axios from "axios";
import { IssueToken } from "structs/microsoft-tts";


declare global {
    var _ttsIssueToken: IssueToken | undefined;
}

const region = process.env.TTS_REGION || "eastus";
const TOKEN = process.env.TTS_TOKEN || "";

const TOKEN_VALIDITY_SECONDS = 10 * 60;

const REFRESH_BEFORE_EXPIRATION_SECONDS = 60;

const fetchIssueToken = async (): Promise<string> => {
    const { data } = await axios.post<string>(
        `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        null,
        {
            headers: {
                'Ocp-Apim-Subscription-Key': TOKEN,
                'Content-Length': '0',
            },
        }
    );
    return data;
}

const isExpriedToken = (now: number, token?: IssueToken): token is undefined => (token === undefined || token.expiresAt <= now);

export const GetIssueToken = async (): Promise<IssueToken> => {
    const now = Date.now();

    const { _ttsIssueToken } = global;

    return isExpriedToken(now, _ttsIssueToken) ?
        await (async () => {
            const token = await fetchIssueToken();
            const expiresAt = now + (TOKEN_VALIDITY_SECONDS - REFRESH_BEFORE_EXPIRATION_SECONDS) * 1000;

            const issueToken = { token, expiresAt, region };

            global._ttsIssueToken = issueToken;
            return issueToken;
        })() :
        _ttsIssueToken;
};
