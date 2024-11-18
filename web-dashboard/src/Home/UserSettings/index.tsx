import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { IonIcon } from "@ionic/react";

import { AppInfo, User } from "@services/chiwawaAPI";

import { Notification } from "@utils/Notifications";

import NotificationSettings from "./NotificationSettings";

import "./style.css";
import { useTranslation } from "react-i18next";

interface Props {
    appInfo: AppInfo
    user: User
}

const UserConfig: React.FC<Props> = (props) => {
    const { t } = useTranslation();
    const { appInfo, user } = props;
    const { tts } = appInfo.discord;

    return <div className="user">
        <div className="guilds">

            <Link to="./">
                <button className="guild">{Notification.Global}</button>
            </Link>

            {user.guilds.array.map((guild) => {
                return <Link key={guild.id} to={guild.id}>
                    <button className="guild">{guild.name}</button>
                </Link>
            })}

            <div style={{ flex: 1 }}></div>

            <Link to="/">
                <button className="guild">
                    <IonIcon name="arrow-back" />{t("back")}
                </button>
            </Link>
        </div>

        <Routes>
            <Route path="/:guildId" element={<NotificationSettings tts={tts} user={user} />} ></Route>
            <Route path="/" element={<NotificationSettings tts={tts} user={user} />} ></Route>
        </Routes>

    </div>
}

export default UserConfig;