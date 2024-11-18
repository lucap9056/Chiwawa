import React from "react";
import { useTranslation } from "react-i18next";

import ChiwawaAPI, { LoginResult } from "@services/chiwawaAPI";

import { loadingManager } from "@components/Loading";

const NotLoggedIn = () => {
    const { t } = useTranslation();

    const Login = () => {

        if (location.search !== "") {
            const parentWindow: Window = window.opener;

            const search = new URLSearchParams(location.search);

            const code = search.get("code");
            const err = search.get("error");

            if (code || err) {
                const result: LoginResult = {
                    success: code !== null,
                    error: err ? new Error(err) : undefined,
                    code
                }

                parentWindow.postMessage(result);

                window.close();
                return;
            }

        }

        loadingManager.Append();
        ChiwawaAPI.Login().then(() => {
            location.reload();
        }).catch((errCode) => {
            console.log(errCode);
        });


    }

    return <div className="not_logged_in_container">
        <div className="not_logging_in">
            <div className="info">
                <h1 className="info_title">Chiwawa<br />Dashboard</h1>
                <img className="info_image" src={`./assets/cover.webp`} />
            </div>
            <div className="login">
                <button className="login_button" onClick={Login}>
                    {t("login_with_discord")}
                </button>

                <div className="login_description">
                    {t('app_description')}
                </div>
            </div>
        </div>
    </div>;
}

export default NotLoggedIn;