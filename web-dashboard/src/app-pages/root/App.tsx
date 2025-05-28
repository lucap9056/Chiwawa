"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import API from "app-pages/global-services/api";
import Loader, { useLoader } from "app-pages/global-components/loader";
import Notifications, { useNotifications } from "app-pages/global-components/notifications";
import { Message } from "app-pages/global-structs/message";

import NotLoggedIn from "app-pages/root/components/not-logged-in";
import Home from "app-pages/root/components/home";
import { GuildsMemberProvider } from "app-pages/global-services/guilds-member";
import { Profile } from "structs/profile";
import { TTSProvider } from "app-pages/global-services/tts";

const App: React.FC = () => {
    const { t } = useTranslation();
    const loader = useLoader();
    const notifications = useNotifications();
    const [isLoaded, setLoaded] = useState(false);
    const [profile, setProfile] = useState<Profile>();

    useEffect(() => {
        setLoaded(false);

        const loading = loader.append();
        const loadingNotification = notifications.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("app.initializing"),
            })
        );

        API.retrieveProfile()
            .then(setProfile)
            .catch((err) => {

                notifications.append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: (err as Error).message
                    })
                );

            })
            .finally(() => {

                loading.remove();
                loadingNotification.remove();
                setLoaded(true);

            });

    }, []);

    return <>
        {
            isLoaded &&
            (profile ?
                <GuildsMemberProvider>
                    <TTSProvider profile={profile}  >
                        <Home profile={profile} />
                    </TTSProvider>
                </GuildsMemberProvider> :
                <NotLoggedIn />
            )
        }
        <Notifications />
        <Loader.Component />
    </>
}

export default App;