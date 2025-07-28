"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes } from "react-router-dom";

import { useProfile } from "app-pages/global-services/profile-cxt";

import Editor from "./editor";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLeftLong } from "@fortawesome/free-solid-svg-icons";

import styles from "./style.module.scss";

const UserConfigEditor: React.FC = () => {
    const { t } = useTranslation();
    const { getGuilds } = useProfile();

    return <div className={styles.user}>
        <div className={styles.guilds}>

            <Link to="/user/">
                <button className={styles.guild}>{t("userconfig.global")}</button>
            </Link>

            {getGuilds().map((guild) => {
                return <Link key={guild.id} to={"/user/" + guild.id}>
                    <button className={styles.guild}>
                        {guild.name}
                    </button>
                </Link>
            })}

            <div style={{ flex: 1 }}></div>

            <Link to="/">
                <button className={styles.guild}>
                    {t("app.back")}
                    <FontAwesomeIcon icon={faLeftLong} />
                </button>
            </Link>
        </div>

        <Routes>
            <Route path="/:guildId" element={<Editor />} ></Route>
            <Route path="/" element={<Editor />} ></Route>
        </Routes>

    </div>
}

export default UserConfigEditor;