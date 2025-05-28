export interface OAuth2Token {
    token_type: "Bearer"
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string
}