import axios from "axios";

interface OAuthToken {
    token_type: "Bearer"
    access_token: string
    expires_in: number
    refresh_token: string
    scope: string
}

class OAuth2 {
    private client_id: string;
    private client_secret: string;
    private redirect_uri: string;
    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        this.client_id = clientId;
        this.client_secret = clientSecret;
        this.redirect_uri = redirectUri;
    }

    public get getAuthorizeUrl(): string {
        const { client_id, redirect_uri } = this;

        return `https://discord.com/oauth2/authorize?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=guilds+identify+guilds.members.read`;
    }

    /**
     * 
     * @param code Authorize Code
     * @returns Token
     */
    public async Base(code: string): Promise<OAuthToken | undefined> {
        const { client_id, client_secret, redirect_uri } = this;

        return new Promise((resolve) => {
            axios.post("https://discord.com/api/oauth2/token", {
                code,
                client_id,
                client_secret,
                redirect_uri,
                grant_type: "authorization_code"
            }, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            })
                .then(res => res.data as OAuthToken)
                .then(resolve)
                .catch(() => {
                    resolve(undefined);
                });
        });
    }


    public static Refresh(token: OAuthToken): Promise<OAuthToken | undefined> {

        return new Promise((resolve) => {
            axios.post("https://discord.com/api/oauth2/token/revoke",
                new URLSearchParams({
                    refresh_token: token.refresh_token,
                    grant_type: "refresh_code"
                }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                }
            )
                .then(res => res.data as OAuthToken)
                .then(resolve)
                .catch(() => {
                    resolve(undefined);
                });
        });
    }

}

interface User {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
    public_flags: number;
    flags: number;
    banner: string | null;
    accent_color: number | null;
    global_name: string | null;
    avatar_decoration_data: any | null;
    banner_color: string | null;
    clan: any | null;
    mfa_enabled: boolean;
    locale: string;
    premium_type: number;

}

interface Guild {
    id: string;
    name: string;
    icon: string;
    banner: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
}

class User {

    public static Init = async function (token: string): Promise<User | undefined> {
        return new Promise((resolve) => {
            axios.get("https://discord.com/api/v10/users/@me", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
                .then((response) => response.data as User)
                .then((user) => {
                    return new User(token, user);
                })
                .then(resolve)
                .catch(() => {
                    resolve(undefined);
                });
        });
    }

    private token: string;
    constructor(token: string, userData: User) {
        this.token = token;
        Object.assign(this, userData);
    }

    public GetGuilds(): Promise<Guild[]> {
        const { token } = this;

        const request = axios.get("https://discord.com/api/v10/users/@me/guilds", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        return new Promise(async (resolve, reject) => {
            console.log(request);
            const response = await request;
            console.log(response);

            resolve(response.data as Guild[]);
        });
    }
}

export {
    OAuthToken,
    OAuth2,
    User
}

export default OAuth2;