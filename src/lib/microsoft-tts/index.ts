import axios from "axios";

import { TTSEngineConfig } from "lib/config";

type Language = {
    [voice: string]: string
}

type Languages = {
    [languages: string]: Language
}

interface TTSMessage {
    content: string
    language: string
    voiceActor: string
}

interface IssueToken {
    token: string
    createTime: number
}

class IssueToken {
    constructor(token: string) {
        this.token = token;
        this.createTime = new Date().getTime();
    }

    public NeedRefresh() {
        const { token, createTime } = this;
        const currentTime = new Date().getTime();

        if (token === "") {
            return (createTime + 1 * 60 * 1000 < currentTime);
        }

        return (createTime + 5 * 60 * 1000 < currentTime);
    }
}

interface MicrosiftTTS {
    region: string
    token: string
    defaultLanguage: string
}

class MicrosiftTTS {
    private issueToken?: IssueToken;

    public languages: Languages = {};

    constructor(config: TTSEngineConfig) {
        Object.assign(this, config);

        if (config.isEnabled) {
            this.Init();
        }

    }

    private Init() {
        const { region, token } = this;

        axios.get(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Ocp-Apim-Subscription-Key": token
            }
        }).then((response) => {
            return response.data as { Locale: string, DisplayName: string, ShortName: string }[];
        }).then((languages) => {

            languages.forEach(language => {
                if (!this.languages[language.Locale]) {
                    this.languages[language.Locale] = {};
                }
                this.languages[language.Locale][language.DisplayName] = language.ShortName;
            });
        }).catch(console.error);

    }

    public async fetch(message: TTSMessage): Promise<Buffer> {

        const { region, token, languages } = this;

        if (!region || !token || !languages) {
            return Buffer.from("");
        }

        let { content, language, voiceActor } = message;

        if (!languages[language]) {
            language = this.defaultLanguage;
        }

        if (!languages[language][voiceActor]) {
            const voiceActors = Object.keys(languages[language]);

            let index = parseInt(voiceActor) || 0;

            if (index >= voiceActors.length) {
                index = 0;
            }

            voiceActor = voiceActors[index];
        }

        const body = `
            <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
                <voice name="${languages[language][voiceActor]}">${content}</voice>
            </speak>
            `;

        return axios.post(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, body, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Ocp-Apim-Subscription-Key': token,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                'User-Agent': 'Chiwawa'
            },
            responseType: 'arraybuffer'
        }).then(response => {
            return response.data as Buffer;
        }).catch((err) => {
            console.log(err);
            return Buffer.from("");
        });
        //*/
    }

    public async UpdateIssueToken(region: string, token: string): Promise<string> {

        return new Promise(async (resolve, reject) => {
            const issueToken = await axios.post(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, null, {
                headers: {
                    'Ocp-Apim-Subscription-Key': token,
                    'Content-Length': '0'
                }
            })
                .then((res) => res.data.toString())
                .catch((err) => {
                    console.log(err);
                    return "";
                });

            this.issueToken = new IssueToken(issueToken);
            resolve(issueToken);
        });

    }

    public get Token(): Promise<string> {
        const { issueToken, region, token } = this;

        return new Promise(async (resolve) => {

            if (!issueToken || (issueToken && issueToken.NeedRefresh())) {
                await this.UpdateIssueToken(region, token);
            }

            if (this.issueToken) {
                resolve(this.issueToken.token);
            } else {
                resolve("");
            }

        });
    }
}

export {
    TTSMessage
}

export default MicrosiftTTS;