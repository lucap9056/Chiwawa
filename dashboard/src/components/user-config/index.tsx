import { ArrowLeftIcon } from "@phosphor-icons/react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes } from "react-router-dom";
import type { Profile } from "#/server/profile";
import Editor from "./editor";
import styles from "./style.module.scss";

interface Props {
    profile: Profile;
}

const UserConfigEditor: React.FC<Props> = ({ profile }) => {
    const { t } = useTranslation();

    return (
        <div className={styles.user}>
            <div className={styles.guilds}>
                <Link to="/user/">
                    <button type="button" className={styles.guild}>
                        {t("userconfig.global")}
                    </button>
                </Link>

                {profile.guilds.map((guild) => (
                    <Link key={guild.id} to={`/user/${guild.id}`}>
                        <button type="button" className={styles.guild}>
                            {guild.name}
                        </button>
                    </Link>
                ))}

                <div style={{ flex: 1 }} />

                <Link to="/">
                    <button type="button" className={styles.guild}>
                        {t("app.back")}
                        <ArrowLeftIcon size={16} />
                    </button>
                </Link>
            </div>

            <Routes>
                <Route path="/:guildId" element={<Editor profile={profile} />} />
                <Route path="/" element={<Editor profile={profile} />} />
            </Routes>
        </div>
    );
};

export default UserConfigEditor;
