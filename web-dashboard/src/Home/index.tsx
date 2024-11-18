import React, { useState } from "react";

import { AppInfo, User } from "@services/chiwawaAPI";

import Config from '@utils/applicationConfig';

import "./style.css";
import LoggedIn from "@home/LoggedIn";
import NotLoggedIn from "@home/NotLoggedIn";

import Initialize from "@home/Initialize";
import "@src/i18n";

/**
 * The main component for the home page of the Chiwawa Dashboard.
 * It handles user authentication, application initialization,
 * and conditional rendering based on the state of the application.
 */
const Home = () => {
    const [appInfo, SetAppInfo] = useState<AppInfo>();
    const [config, SetConfig] = useState<Config>();
    const [user, SetUser] = useState<User>();
    const [loaded, Load] = useState(false);

    Initialize(SetConfig, SetUser, SetAppInfo, Load);

    if (!loaded) {
        return <></>;
    }

    if (appInfo) {
        return <LoggedIn appInfo={appInfo} config={config} user={user} />
    }

    return <NotLoggedIn />
}

export default Home;