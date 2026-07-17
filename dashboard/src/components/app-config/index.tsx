import { toast } from "Sonner";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { match } from "resultant.js/rustify";
import api from "#/api";
import { useProfile } from "#/components/global/profile";
import { useTTS, type VoiceModel } from "#/components/global/tts";
import VoiceModelSelector from "#/components/voice-model-selector";
import type { AppConfig } from "#/models";
import type { Profile } from "#/server/profile";
import Block from "./block";
import styles from "./style.module.scss";

interface Props {
    profile: Profile;
}

const AppConfigEditor: React.FC<Props> = ({ profile }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const tts = useTTS();
    const { updateAppConfig } = useProfile();

    const [config, setConfig] = useState<AppConfig>(profile.appConfig);
    const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
    const [voiceLanguage, setVoiceLanguage] = useState<string | undefined>();
    const [voiceModel, setVoiceModel] = useState<string | undefined>();
    const [voiceContent, setVoiceContent] = useState("");

    useEffect(() => {
        const currentVoiceModel = tts.findVoiceModel(config.defaultVoiceModel);

        const { defaultJoinSuffix, defaultLeaveSuffix } = config;
        const member = "";
        const content = `${member}${defaultJoinSuffix}.${member}${defaultLeaveSuffix}`;

        setVoiceLanguage(currentVoiceModel?.language);
        setVoiceModel(currentVoiceModel?.voiceModel);
        setVoiceContent(content);
    }, [config, tts]);

    const requestRemoveAdmin = (adminId: string) => {
        if (config.admins.length === 1) {
            toast.error(t("appconfig.admins.alerts.admin-minimum"));
            return;
        }
        setPendingRemoval(adminId);
    };

    const confirmRemoveAdmin = () => {
        setConfig((c) => ({ ...c, admins: c.admins.filter((id) => id !== pendingRemoval) }));
        setPendingRemoval(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const admin = e.currentTarget.value;
            if (!config.admins.includes(admin) && /^\d+$/.test(admin)) {
                setConfig({ ...config, admins: [...config.admins, admin] });
            }
            e.currentTarget.value = "";
        }
    };

    const updateDefaultJoinSuffix = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, defaultJoinSuffix: e.currentTarget.value });
    };

    const updateDefaultLeaveSuffix = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, defaultLeaveSuffix: e.currentTarget.value });
    };

    const updateVoiceModel = (voice: VoiceModel) => {
        setConfig({ ...config, defaultVoiceModel: voice.ShortName });
    };

    const updateTTSRegion = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, ttsRegion: e.currentTarget.value });
    };

    const updateTTSApiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, ttsApiKey: e.currentTarget.value });
    };

    const back = () => {
        navigate("/");
    };

    const save = async () => {
        const request = api.updateAppConfig(config);
        const id = toast.promise(request, { loading: t("app.saving") }) as string;
        const result = await request;

        match(result, {
            Ok: () => {
                updateAppConfig(config);
                toast.success(t("app.saved"), { id });
            },
            Err: (error) => {
                console.error("Failed to save app config:", error);
                toast.error(t("app.save-failed"), { id });
            },
        });
    };

    return (
        <div className={styles.app}>
            <Block title={t("appconfig.admins.block")}>
                <div className={styles.block}>
                    {config.admins.map((admin) => (
                        <div className={styles.admin} key={admin}>
                            <div className={styles.admin_id}>{admin}</div>
                            <button
                                type="button"
                                className={styles.remove_admin}
                                onClick={() => requestRemoveAdmin(admin)}
                            />
                        </div>
                    ))}
                    <div className={styles.textbox} data-label={t("appconfig.admins.append.label")}>
                        <input
                            type="text"
                            placeholder={t("appconfig.admins.append.placeholder")}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
            </Block>
            <Block title={t("appconfig.default-suffix.block")}>
                <div className={styles.block}>
                    <div className={styles.textbox} data-label={t("appconfig.default-suffix.join.label")}>
                        <input type="text" defaultValue={config.defaultJoinSuffix} onChange={updateDefaultJoinSuffix} />
                    </div>
                    <div className={styles.textbox} data-label={t("appconfig.default-suffix.leave.label")}>
                        <input
                            type="text"
                            defaultValue={config.defaultLeaveSuffix}
                            onChange={updateDefaultLeaveSuffix}
                        />
                    </div>
                    <VoiceModelSelector
                        message={voiceContent}
                        currentLanguage={voiceLanguage}
                        currentVoiceModel={voiceModel}
                        onChange={updateVoiceModel}
                    />
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
                <button type="button" className={styles.option} onClick={back}>
                    {t("app.back")}
                </button>
                <button type="button" className={styles.option} onClick={save}>
                    {t("app.save")}
                </button>
            </div>

            <AlertDialog.Root open={pendingRemoval !== null} onOpenChange={(open) => !open && setPendingRemoval(null)}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className={styles.dialog_overlay} />
                    <AlertDialog.Content className={styles.dialog_content}>
                        <AlertDialog.Title className={styles.dialog_title}>
                            {t("appconfig.admins.remove-confirm.title")}
                        </AlertDialog.Title>
                        <AlertDialog.Description>
                            {t("appconfig.admins.remove-confirm.description", { admin: pendingRemoval })}
                        </AlertDialog.Description>
                        <div className={styles.dialog_options}>
                            <AlertDialog.Cancel asChild>
                                <button type="button">{t("appconfig.admins.remove-confirm.cancel")}</button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button type="button" onClick={confirmRemoveAdmin}>
                                    {t("appconfig.admins.remove-confirm.confirm")}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </div>
    );
};

export default AppConfigEditor;
