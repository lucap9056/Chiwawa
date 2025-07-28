"use client";
import React from "react";
import { useTranslation } from "react-i18next";

import API from "app-pages/global-services/api";
import { useLoader } from "app-pages/global-components/loader";
import { useNotifications } from "app-pages/global-components/notifications";

import styles from "app-pages/root/components/not-logged-in/style.module.scss";
import { Message } from "app-pages/global-structs/message";
import { match } from "resultant.js/rustify";

const NotLoggedIn = () => {
    const loader = useLoader();
    const { t } = useTranslation();
    const notifications = useNotifications();

    const Login = async () => {
        const loading = loader.append();

        const loginResult = await API.login();
        match(loginResult, {
            Ok: () => {
                location.reload();
            },
            Err: (error) => {
                notifications.append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: error.message
                    })
                );
            }
        });

        loading.remove();

    }

    return <div className={styles.not_logged_in}>
        <div className={styles.main}>
            <div className={styles.info}>
                <h1 className={styles.title}> Chiwawa < br /> Dashboard </h1>
                < img className={styles.image} src={`./assets/cover.webp`} />
            </div>
            < div className={styles.login}>
                <button className={styles.button} onClick={Login}>
                    {
                        t("login.discord")
                    }
                </button>

                < div className={styles.description}>
                    {
                        t('login.description')
                    }
                </div>
            </div>
        </div>
    </div>;
}

export default NotLoggedIn;