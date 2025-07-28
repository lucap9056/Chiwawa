"use client";
import React, { useEffect } from "react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ProfileProvider } from "app-pages/global-services/profile-cxt";
import { useTTS } from "app-pages/global-services/tts";
import API from "app-pages/global-services/api";

import { useLoader } from "app-pages/global-components/loader";
import UserConfigEditor from "./user-config";
import AppConfigEditor from "./app-config";

import { Profile } from "structs/profile";
import { isAdminAppConfig } from "structs/app-config";

import styles from "./style.module.scss";

interface Props {
    profile: Profile
}

const Home: React.FC<Props> = ({ profile }) => {
    const { t } = useTranslation();
    const loader = useLoader();
    const tts = useTTS();

    useEffect(() => {
        const loading = loader.append();

        tts.awaitLoaded().finally(() => {
            loading.remove();
        });

    }, []);

    const logout = async () => {
        const loading = loader.append();
        const reuslt = await API.logout();

        if (reuslt.isOk()) {
            location.reload();
        }

        loading.remove();

    }

    return <div className={styles.menu}>
        <ProfileProvider profile={profile}>
            <HashRouter>
                <Routes>
                    <Route path="app/*" element={
                        <AppConfigEditor />
                    } />
                    <Route path="user/*" element={
                        <UserConfigEditor />
                    } />
                    <Route path="*" element={
                        <div className={styles.options}>
                            <Link to="/user">
                                <button className={styles.option}>User</button>
                            </Link>
                            {isAdminAppConfig(profile.appInfo.config) &&
                                <Link to="/app">
                                    <button className={styles.option}>App</button>
                                </Link>
                            }
                            <button className={styles.option} onClick={logout}>{t("app.logout")}</button>
                        </div>
                    } />
                </Routes>
            </HashRouter>
        </ProfileProvider>
    </div>
}

export default Home;