import { OAuthToken} from "api/discord-api";
import Config from "lib/config";


interface DiscordData {
    joinedGuilds: string[]
    tts: {
        token: string,
        region: string,
        language: string,
        defaultMessages: {
            joinSuffix: string
            leaveSuffix: string
        }
    }
    userToken?: OAuthToken
}

export interface UserChiwawaData {
    discord: DiscordData
}

export interface AdminChiwawaData extends UserChiwawaData {
    config: Config
}
