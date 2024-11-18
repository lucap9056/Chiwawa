import DiscordUser, { DiscordToken, DiscordGuilds } from "@utils/discordUser";
import { Notifications, Notification } from "@utils/Notifications";
import Config from "@utils/applicationConfig";
import TTS from "@utils/microsoftTTS";

interface DiscordInfo {
    joinedGuilds: string[]
    tts: TTS
    userToken?: DiscordToken
}

interface AppInfo {
    discord: DiscordInfo,
    config?: Config
}

interface LoginResult {
    success: boolean
    code?: string
    error?: Error
}

class AuthWindow {
    private authWindow: Window;
    private resolve: (chiwawa: AppInfo) => void;
    private reject: (err: Error | number) => void;

    public Login(): Promise<AppInfo> {
        this.authWindow = window.open("./api/login", "authWindow", "width=460,height=620");

        const MessageListen = this.MessageListen.bind(this);

        window.addEventListener("message", MessageListen);

        return new Promise((resolve, reject) => {
            this.resolve = (appInfo: AppInfo) => {
                window.removeEventListener("message", MessageListen);
                resolve(appInfo);
            };
            this.reject = reject;
        });
    }

    private MessageListen(e: MessageEvent<any>) {
        const { authWindow, resolve, reject } = this;

        if (e.source !== authWindow || e.origin !== authWindow.origin) {
            return;
        }

        const result: LoginResult = e.data;

        if (!result.success) {
            return reject(result.error);
        }

        const { code } = result;

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ code })
        };

        fetch(`./api/login`, options)
            .then(async (res) => {
                if (res.status === 200) {
                    const appInfo: AppInfo = await res.json();
                    return resolve(appInfo);
                }
                reject(res.status);
            })
            .catch(reject);

    }
}

class ChiwawaAPI {

    public static Status = class {
        public static OK = 200;
        public static NO_CONTENT = 204;

        public static BAD_REQUEST = 400;
        public static UNAUTHORIZED = 401;
        public static FORBIDDEN = 402;
    }

    /**
     * @returns {Promise<AppInfo>} Chiwawa Basic info
     * @throws {number} ErrorCode
     */
    public static get Info(): Promise<AppInfo> {
        return new Promise((resolve, reject: (errorCode: number) => void) => {
            fetch(`./api/info`)
                .then(async (res) => {

                    if (res.status === 200) {
                        const appInfo: AppInfo = await res.json();
                        return resolve(appInfo);
                    }
                    reject(res.status);
                }).catch(reject);
        });
    }

    public static Login(): Promise<AppInfo> {
        const auth = new AuthWindow();
        return auth.Login();
    }

    public static Logout(): Promise<void> {
        return new Promise((resolve, reject: (errorCode: number) => void) => {
            fetch(`./api/login`, {
                method: "DELETE"
            })
                .then(async (res) => {

                    if (res.status === 204) {
                        return resolve();
                    }
                    reject(res.status);
                }).catch(reject);
        });
    }

    public static App = class {
        public static SetApp(config: Config): Promise<void> {
            return new Promise((resolve, reject: (errorCode: number) => void) => {
                fetch(`./api/app`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(config)
                })
                    .then(async (res) => {
                        if (res.status === 200) {
                            resolve();
                        }
                        reject(res.status);
                    }).catch(reject);
            });
        }
    }

    public static User = class {
        public static GetMe(): Promise<Notifications> {
            return new Promise((resolve, reject) => {
                fetch(`./api/users/@me`).
                    then((res) => res.json())
                    .then((user: Notifications) => user)
                    .then(resolve)
                    .catch(reject)
            });
        }

        public static SetMe(user: User): Promise<void> {
            return new Promise((resolve, reject) => {
                fetch(`./api/users/@me`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(user.notifications)
                }).then((res) => {
                    resolve();
                }).catch(reject);
            });
        }
    }
}

class User extends DiscordUser {
    public notifications: Notifications;
    public guilds: DiscordGuilds;
    public guildMemberNames: { [guildId: string]: string } = {};

    public static Init(token: DiscordToken): Promise<User> {
        const user = new User(token);
        return user.GetMe;
    }

    public UpdateNotification(notification: Notification, guildId?: string): Promise<void> {
        if (guildId) {
            this.notifications.guildSettings[guildId] = notification;
        } else {
            this.notifications.globalSettings = notification;
        }

        return ChiwawaAPI.User.SetMe(this);
    }
}

export default ChiwawaAPI;

export {
    AppInfo,
    DiscordInfo,
    LoginResult,
    User,
}