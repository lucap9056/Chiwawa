import React, { useState } from "react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";

import ChiwawaAPI, { AppInfo, User } from "@services/chiwawaAPI";

import ApplicationConfig from "@utils/applicationConfig";
import { Message } from "@utils/message";

import { messageManager } from "@components/Messages";
import { loadingManager } from "@components/Loading";
import { alertsManager } from "@components/Alerts";

import UserSettings from "./UserSettings";
import AppConfig from "./AppConfig";
import { useTranslation } from "react-i18next";

interface Props {
    config?: ApplicationConfig
    appInfo: AppInfo
    user?: User
}

const LoggedIn: React.FC<Props> = (props) => {
    const { t } = useTranslation();
    const [appInfo, SetAppInfo] = useState(props.appInfo);
    const [config, SetConfig] = useState(props.config);
    const [user, SetUser] = useState(props.user);

    const viewOptions = [];
    const routes = [];

    if (user) {

        viewOptions.push(
            <Link key="user" to="user">
                <button className="view_option">User</button>
            </Link>
        );

        routes.push(
            <Route key="user" path="user/*" element={
                <UserSettings appInfo={appInfo} user={user} />
            }></Route>
        );

    }

    if (config) {

        const Save = async (cfg: ApplicationConfig) => {
            const saving = loadingManager.Append();
            const saveAlert = new Message(Message.Type.Alert, t("saveing"));
            alertsManager.Append(saveAlert);
            try {
                SetConfig(cfg);
                await ChiwawaAPI.App.SetApp(cfg);
                messageManager.Append(new Message(Message.Type.Alert, t("saved")));
            }
            catch (err) {
                console.error(err);
            }
            finally {
                saveAlert.Remove();
                saving.Remove();
            }

        }

        viewOptions.push(
            <Link key="app" to="app">
                <button className="view_option">App</button>
            </Link>
        );

        routes.push(
            <Route key="app" path="app/*" element={
                <AppConfig config={config} onSave={Save} />
            }></Route>
        );

    }

    const Logout = () => {
        ChiwawaAPI.Logout().then(() => {
            location.reload();
        });
    }


    return <div className="main_view">
        <HashRouter>
            <Routes>
                {routes}
                <Route path="*" element={
                    <div className="view_options">
                        {viewOptions}
                        <button className="view_option" onClick={Logout}>{t("logout")}</button>
                    </div>
                }></Route>
            </Routes>
        </HashRouter>
    </div>
}

export default LoggedIn;