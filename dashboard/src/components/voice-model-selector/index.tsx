import { SpeakerHighIcon } from "@phosphor-icons/react";
import * as Select from "@radix-ui/react-select";
import type React from "react";
import { useEffect, useState } from "react";
import { type TTS, useTTS, type VoiceModel } from "#/components/global/tts";
import styles from "./style.module.scss";

interface Props {
    message: string;
    currentLanguage?: string;
    currentVoiceModel?: string;
    onChange: (voice: VoiceModel) => void;
}

const getCurrentVoiceModel = (
    tts: TTS,
    defaultVoiceModel: VoiceModel,
    language?: string,
    voiceModel?: string,
): VoiceModel => {
    if (language && voiceModel) {
        const models = tts.getVoiceModels(language);
        const found = models.find((v) => v.DisplayName === voiceModel);

        if (found) return found;
    }

    return defaultVoiceModel;
};

const VoiceModelSelector: React.FC<Props> = ({ message, currentLanguage, currentVoiceModel, onChange }) => {
    const tts = useTTS();
    const defaultVoiceModel = tts.getDefaultVoiceModel();

    const [language, setLanguage] = useState<string>(defaultVoiceModel.Locale);
    const [voiceModel, setVoiceModel] = useState<VoiceModel>(defaultVoiceModel);

    useEffect(() => {
        if (currentLanguage) {
            setLanguage(currentLanguage);
            if (currentVoiceModel) {
                setVoiceModel(getCurrentVoiceModel(tts, defaultVoiceModel, currentLanguage, currentVoiceModel));
            }
            return;
        }

        if (tts.loaded) {
            setLanguage(defaultVoiceModel.Locale);
            setVoiceModel(defaultVoiceModel);
        }
    });

    const updateLanguage = (l: string) => {
        const firstVoice = tts.getVoiceModels(l)[0];
        setVoiceModel(firstVoice);
        setLanguage(l);
        onChange(firstVoice);
    };

    const updateVoiceModel = (displayName: string) => {
        const v = tts.getVoiceModels(language).find((m) => m.DisplayName === displayName);
        if (!v) return;
        setVoiceModel(v);
        onChange(v);
    };

    const play = async () => {
        try {
            const blob = await tts.getVoiceBlob(voiceModel, message);
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(url);
            };
        } catch (error) {
            // playback failures are non-fatal, matches old behavior
            console.error("Failed to play voice preview:", error);
        }
    };

    return (
        <div className={styles.selector}>
            <Select.Root value={language} onValueChange={updateLanguage}>
                <Select.Trigger className={styles.language}>
                    <Select.Value />
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className={styles.select_content}>
                        <Select.Viewport>
                            {tts.getLanguages().map((l) => (
                                <Select.Item key={l} value={l} className={styles.select_item}>
                                    <Select.ItemText>{l}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>

            <Select.Root value={voiceModel.DisplayName} onValueChange={updateVoiceModel}>
                <Select.Trigger className={styles.voice}>
                    <Select.Value>{voiceModel.LocalName}</Select.Value>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className={styles.select_content}>
                        <Select.Viewport>
                            {tts.getVoiceModels(language).map((v) => (
                                <Select.Item key={v.DisplayName} value={v.DisplayName} className={styles.select_item}>
                                    <Select.ItemText>{v.LocalName}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>

            <button type="button" className={styles.play} onClick={play}>
                <SpeakerHighIcon />
            </button>
        </div>
    );
};

export default VoiceModelSelector;
