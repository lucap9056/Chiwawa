import type React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "#/api";
import { useLoader } from "#/components/global/loader";
import { useProfile } from "#/components/global/profile";
import styles from "./style.module.scss";

export const Unauthenticated: React.FC = () => {
    const { t } = useTranslation();
    const loader = useLoader();
    const { setResult } = useProfile();

    const login = async () => {
        const loading = loader.append();

        const result = await api.login();

        if (result.isOk()) {
            setResult(await api.retrieveProfile());
        } else {
            console.error("Login failed:", result.unwrapErr());
            toast.error(result.unwrapErr());
        }

        loading.remove();
    };

    return (
        <div className={styles.not_logged_in}>
            <div className={styles.main}>
                <div className={styles.info}>
                    <h1 className={styles.title}>
                        Chiwawa
                        <br />
                        Dashboard
                    </h1>
                    <img className={styles.image} src={`${import.meta.env.BASE_URL}assets/cover.webp`} alt="" />
                </div>
                <div className={styles.login}>
                    <button type="button" className={styles.button} onClick={login}>
                        {t("login.discord")}
                    </button>
                    <div className={styles.description}>{t("login.description")}</div>
                </div>
            </div>
        </div>
    );
};
