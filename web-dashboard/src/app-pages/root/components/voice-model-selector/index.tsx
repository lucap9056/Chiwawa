import React, { useEffect, useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import { useTTS, VoiceModel } from "app-pages/global-services/tts";

import styles from "./style.module.scss";

interface Props {
    message: string
    currentLanguage?: string
    currentVoiceModel?: string
    onChange: (voice: VoiceModel) => void
}

const getCurrentVoiceModel = (tts: ReturnType<typeof useTTS>, defaultVoiceModel: VoiceModel, language?: string, voiceModel?: string): VoiceModel => {

    if (language && voiceModel) {
        const models = tts.getVoiceModels(language);
        const found = models.find(v => v.DisplayName === voiceModel);

        if (found) return found;
    }

    return defaultVoiceModel;
}

const VoiceModelSelector: React.FC<Props> = ({ message, currentLanguage, currentVoiceModel, onChange }) => {
    const tts = useTTS();
    const defaultVoiceModel = tts.getDefaultVoiceModel();

    const [languages, setLanguages] = useState<string[]>([]);
    const [language, setLanguage] = useState<string>(defaultVoiceModel.Locale);
    const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
    const [voiceModel, setVoiceModel] = useState<VoiceModel>(defaultVoiceModel);

    useEffect(() => {
        if (currentLanguage) {
            setLanguage(currentLanguage);
            if (currentVoiceModel) {
                setVoiceModel(getCurrentVoiceModel(tts, defaultVoiceModel, currentLanguage, currentVoiceModel));
            }
        }
    });

    const updateLanguage = (l: string) => {
        const firstVoice = tts.getVoiceModels(l)[0];
        setVoiceModel(firstVoice);
        setLanguage(l);
        setLanguages([]);
        onChange(firstVoice);
    }

    const updateVoiceModel = (v: VoiceModel) => {
        setVoiceModel(v);
        setVoiceModels([]);
        onChange(v);
    }

    const showLanguages = async () => {
        setLanguages(tts.getLanguages());
    }

    const showVoiceModels = async () => {
        setVoiceModels(tts.getVoiceModels(language));
    }

    const play = async () => {

        if (voiceModel.ShortName === "unknown") return;

        try {
            const blob = await tts.getVoiceBlob(voiceModel, message);
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(url);
            }
        }
        catch {

        }

    }

    return <>
        <div className={styles.selector}>
            <div className={styles.language} onClick={showLanguages}>{language}</div>
            <div className={styles.voice} onClick={showVoiceModels}>
                {voiceModel.LocalName}
            </div>
            <div className={styles.play} onClick={play}>
                <FontAwesomeIcon icon={faVolumeHigh} />
            </div>
        </div>
        {
            languages.length !== 0 &&
            <div className={styles.select_languages}>
                {languages.map(
                    (l) => <div key={l} className={styles.language} onClick={() => updateLanguage(l)}>
                        {l}
                    </div>
                )}
            </div>
        }
        {
            voiceModels.length !== 0 &&
            <div className={styles.select_voices}>
                {voiceModels.map(
                    (v) => <div key={v.DisplayName} className={styles.voice} onClick={() => updateVoiceModel(v)}>
                        {v.LocalName}
                    </div>
                )}
            </div>
        }
    </>;
}

export default VoiceModelSelector;