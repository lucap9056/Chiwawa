import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import API from "app-pages/global-services/api";
import { AdminAppConfig, createEmptyAdminAppConfig, isAdminAppConfig } from "structs/app-config";
import { useProfile } from "app-pages/global-services/profile-cxt";
import { useNotifications } from "app-pages/global-components/notifications";
import VoiceModelSelector from "app-pages/root/components/voice-model-selector";
import Block from "./block";

import styles from "./style.module.scss";
import { VoiceModel } from "app-pages/global-services/tts";
import { useNavigate } from "react-router-dom";
import { match } from "resultant.js/rustify";
import { Message } from "app-pages/global-structs/message";
import { useLoader } from "app-pages/global-components/loader";

const AppConfigEditor: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const loader = useLoader();
    const notifications = useNotifications();
    const { getAppInfo, updateAppConfig } = useProfile();
    const appInfo = getAppInfo();
    const [config, setConfig] = useState<AdminAppConfig>(createEmptyAdminAppConfig());
    const [voiceContent, setVoiceContent] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const c = appInfo.config;
        if (isAdminAppConfig(c)) {
            setConfig(c);
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        const { defaultJoinSuffix, defaultLeaveSuffix } = config;
        const member = "";
        const content = member + defaultJoinSuffix + "." + member + defaultLeaveSuffix;
        setVoiceContent(content);
    }, [config]);

    const removeAdmin = (adminId: string) => {

        if (config.admins.length === 1) {
            notifications.append(
                new Message({
                    type: Message.Type.ERROR,
                    content: t("appconfig.admins.alerts.admin-minimum")
                })
            )
            return;
        }
        
        const index = config.admins.findIndex((id) => id === adminId);
        if (index > -1) {
            const admins = config.admins;
            setConfig({ ...config, admins: [...admins.slice(0, index), ...admins.slice(index + 1)] });
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const admin = e.currentTarget.value;
            if (!config.admins.includes(admin) && /^\d+$/.test(admin)) {
                setConfig({ ...config, admins: [...config.admins, admin] });
            }
            e.currentTarget.value = "";
        }
    }

    const updateDefaultJionSuffix = (e: React.ChangeEvent<HTMLInputElement>) => {
        const defaultJoinSuffix = e.currentTarget.value;
        setConfig({ ...config, defaultJoinSuffix });
    }

    const updateDefaultLeaveSuffix = (e: React.ChangeEvent<HTMLInputElement>) => {
        const defaultLeaveSuffix = e.currentTarget.value;
        setConfig({ ...config, defaultLeaveSuffix });
    }

    const updateVoiceModel = (voiceModel: VoiceModel) => {
        const defaultVoiceModel = voiceModel.ShortName;
        setConfig({ ...config, defaultVoiceModel });
    }

    const updateTTSRegion = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ttsRegion = e.currentTarget.value;
        setConfig({ ...config, ttsRegion });
    }

    const updateTTSApiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
        const ttsApiKey = e.currentTarget.value;
        setConfig({ ...config, ttsApiKey });
    }

    const back = () => {
        navigate("/");
    }

    const save = () => {

        const loading = loader.append();

        const saving = notifications.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("app.saving")
            })
        );

        API.updateAppConfig(config).then((result) => {

            match(result, {
                Ok() {
                    updateAppConfig(config);
                    notifications.append(
                        new Message({
                            type: Message.Type.NORMAL,
                            content: t("app.saved")
                        })
                    );
                },
                Err() {
                    notifications.append(
                        new Message({
                            type: Message.Type.ERROR,
                            content: t("app.save-failed")
                        })
                    );
                }
            })

            loading.remove();
            saving.remove();

        });
    }

    if (!loaded) return <></>

    return <div className={styles.app}>
        <Block title={t("appconfig.admins.block")}>
            <div className={styles.block}>
                {config.admins.map(
                    (admin) => <div className={styles.admin} key={admin}>
                        <div className={styles.admin_id}>{admin}</div>
                        <div className={styles.remove_admin} onClick={() => removeAdmin(admin)}></div>
                    </div>
                )}
                <div className={styles.textbox} data-label={t("appconfig.admins.append.label")}>
                    <input className={styles.add_admin} type="text" placeholder={t("appconfig.admins.append.placeholder")} onKeyDown={handleKeyDown} />
                </div>
            </div>
        </Block>
        <Block title={t("appconfig.default-suffix.block")}>
            <div className={styles.block}>
                <div className={styles.textbox} data-label={t("appconfig.default-suffix.join.label")}>
                    <input type="text" defaultValue={config.defaultJoinSuffix} onChange={updateDefaultJionSuffix} />
                </div>
                <div className={styles.textbox} data-label={t("appconfig.default-suffix.leave.label")}>
                    <input type="text" defaultValue={config.defaultLeaveSuffix} onChange={updateDefaultLeaveSuffix} />
                </div>
                <VoiceModelSelector message={voiceContent} onChange={updateVoiceModel} />
            </div>
        </Block>
        <Block title={t("appconfig.tts.block")}>
            <div className={styles.block}>
                <div className={styles.textbox} data-label={t("appconfig.tts.region.label")}>
                    <input type="text" defaultValue={config.ttsRegion} onChange={updateTTSRegion} />
                </div>
                <div className={styles.textbox} data-label={t("appconfig.tts.api-key.label")}>
                    <input type="password" defaultValue={config.ttsApiKey} onChange={updateTTSApiKey} />
                </div>
            </div>
        </Block>
        <div className={styles.options}>
            <button type="button" className={styles.option} onClick={back}>{t("app.back")}</button>
            <button type="button" className={styles.option} onClick={save}>{t("app.save")}</button>
        </div>
    </div>
}

export default AppConfigEditor;