"use client";
import React, { useEffect } from "react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";

import API from "app-pages/global-services/api";
import { ProfileProvider } from "app-pages/global-services/profile-cxt";
import { useLoader } from "app-pages/global-components/loader";

import UserConfigEditor from "app-pages/root/components/home/user-config";

import { Profile } from "structs/profile";

import styles from "app-pages/root/components/home/style.module.scss";
import { useTTS } from "app-pages/global-services/tts";

interface Props {
    profile: Profile
}

const Root: React.FC = () => {
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
        API.logout()
            .then(() => {
                location.reload();
            })
            .finally(() => {
                loading.remove();
            });
    }

    return <div className={styles.options}>
        <Link to="/user">
            <button className={styles.option}>User</button>
        </Link>
        <button className={styles.option} onClick={logout}>{t("app.logout")}</button>
    </div>
}

const Home: React.FC<Props> = ({ profile }) => {

    return <div className={styles.menu}>
        <HashRouter>
            <Routes>
                <Route path="user/*" element={
                    <ProfileProvider profile={profile}>
                        <UserConfigEditor />
                    </ProfileProvider>
                } />
                <Route path="*" element={<Root />} />
            </Routes>
        </HashRouter>
    </div>
}

export default Home;