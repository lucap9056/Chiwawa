import ChiwawaAPI, { AppInfo, DiscordInfo, User as ChiwawaUser, User } from "@services/chiwawaAPI";
import { useTranslation } from "react-i18next";

import ApplicationConfig from "@utils/applicationConfig";
import { DiscordGuilds } from "@utils/discordUser";
import MicrosoftTTS from "@utils/microsoftTTS";
import { Message } from "@utils/message";

import { loadingManager } from "@components/Loading";
import { alertsManager } from "@components/Alerts";

import { useEffect } from "react";

async function InitializeUser(appInfo: AppInfo): Promise<ChiwawaUser | undefined> {
    const { userToken } = appInfo.discord;

    if (!userToken) {
        return;
    }

    const user = await ChiwawaUser.Init(userToken);

    const mutialGuildsAsync = user.GetGuilds().then(userGuilds => {
        return userGuilds.filter(guild => {
            return appInfo.discord.joinedGuilds.find(id => id === guild.id);
        })
    });

    const notificationsAsync = ChiwawaAPI.User.GetMe();

    const [mutialGuilds, notifications] = await Promise.all([
        mutialGuildsAsync,
        notificationsAsync
    ]);

    user.notifications = notifications;

    user.guilds = mutialGuilds.reduce((acc, guild) => {
        acc.map[guild.id] = guild;
        return acc;
    }, new DiscordGuilds());

    return user;
}

async function InitializeTTS(discord: DiscordInfo): Promise<void> {
    discord.tts = new MicrosoftTTS(discord.tts);
    await discord.tts.Init();

    setInterval(() => {
        ChiwawaAPI.Info.then((newInfo) => {
            const { token } = newInfo.discord.tts;
            discord.tts.SetToken(token);
        });
    }, 5 * 60 * 1000);
    return;
}

/**
 * Custom hook to fetch and initialize app and user data.
 * @param setConfig - Function to set application configuration.
 * @param setUser - Function to set user information.
 * @param setAppInfo - Function to set application information.
 * @param load - Function to set the loading state.
 */
const useAppInitialization = (
    setConfig: React.Dispatch<React.SetStateAction<ApplicationConfig | undefined>>,
    setUser: React.Dispatch<React.SetStateAction<User | undefined>>,
    setAppInfo: React.Dispatch<React.SetStateAction<AppInfo | undefined>>,
    load: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const { t } = useTranslation();
    useEffect(() => {

        const laoding = loadingManager.Append();

        const initializing: Message = new Message(Message.Type.Alert, t("initializing"));
        alertsManager.Append(initializing);

        const initializeApp = async () => {
            try {
                // Fetch application information
                const appInfo = await ChiwawaAPI.Info;

                // Set application configuration if available
                if (appInfo.config) {
                    setConfig(appInfo.config);
                }

                // Initialize user and handle potential errors
                try {
                    const user = await InitializeUser(appInfo);
                    setUser(user);
                } catch (err) {
                    if (err.code && err.code === 0) {
                        await ChiwawaAPI.Logout();
                    }
                }

                // Initialize TTS settings
                await InitializeTTS(appInfo.discord);

                // Set application information
                setAppInfo(appInfo);
            } catch (errCode) {
                console.log(errCode);
            } finally {
                // Indicate that loading is complete
                load(true);

                laoding.Remove();
                initializing.Remove();
            }
        };

        initializeApp();
    }, [setConfig, setUser, setAppInfo, load]);
};

export default useAppInitialization;