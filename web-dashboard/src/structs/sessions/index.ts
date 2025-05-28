import { OAuth2Token } from "structs/discord-oauth2"

export interface Session {
    sessionId: string
    userId: string
    userToken: OAuth2Token
    expireAt: Date
}