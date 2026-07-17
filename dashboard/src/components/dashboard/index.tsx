import type React from "react";
import { useTranslation } from "react-i18next";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { toast } from "sonner";
import api from "#/api";
import AppConfigEditor from "#/components/app-config";
import { GuildsMemberProvider } from "#/components/global/guilds-member";
import { useProfile } from "#/components/global/profile";
import UserConfigEditor from "#/components/user-config";
import type { Profile } from "#/server/profile";
import styles from "./style.module.scss";

interface Props {
    profile: Profile;
}

const Menu: React.FC<Props> = ({ profile }) => {
    const { t } = useTranslation();
    const { setResult } = useProfile();

    const logout = async () => {
        const result = await api.logout();
        if (result.isOk()) {
            setResult(await api.retrieveProfile());
        } else {
            const error = result.unwrapErr();
            console.error("Logout failed:", error);
            toast.error(error);
        }
    };

    return (
        <div className={styles.options}>
            <Link to="/user">
                <button type="button" className={styles.option}>
                    User
                </button>
            </Link>
            {profile.isAdmin && (
                <Link to="/app">
                    <button type="button" className={styles.option}>
                        App
                    </button>
                </Link>
            )}
            <button type="button" className={styles.option} onClick={logout}>
                {t("app.logout")}
            </button>
        </div>
    );
};

export const Dashboard: React.FC<Props> = ({ profile }) => {
    return (
        <div className={styles.menu}>
            <GuildsMemberProvider>
                <HashRouter>
                    <Routes>
                        {profile.isAdmin && <Route path="app/*" element={<AppConfigEditor profile={profile} />} />}
                        <Route path="user/*" element={<UserConfigEditor profile={profile} />} />
                        <Route path="*" element={<Menu profile={profile} />} />
                    </Routes>
                </HashRouter>
            </GuildsMemberProvider>
        </div>
    );
};
