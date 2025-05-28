import React, { useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import { useTTS, Voice } from "app-pages/global-services/tts";

import styles from "app-pages/root/components/home/user-config/editor/voice-selector/style.module.scss";

interface Props {
    message: string
    onChange: (voice: Voice) => void
}

const VoiceSelector: React.FC<Props> = ({ message, onChange }) => {
    const tts = useTTS();
    const defaultVoice = tts.getDefaultVoice();

    const [languages, setLanguages] = useState<string[]>([]);
    const [voices, setVoices] = useState<Voice[]>([]);
    const [language, setLanguage] = useState<string>(defaultVoice.Locale);
    const [voice, setVoice] = useState<Voice>(defaultVoice);

    const updateLanguage = (l: string) => {
        const firstVoice = tts.getVoices(l)[0];
        setVoice(firstVoice);
        setLanguage(l);
        setLanguages([]);
        onChange(firstVoice);
    }

    const updateVoice = (v: Voice) => {
        setVoice(v);
        setVoices([]);
        onChange(v);
    }

    const showLanguages = async () => {
        setLanguages(tts.getLanguages());
    }

    const showVoices = async () => {
        setVoices(tts.getVoices(language));
    }

    const play = async () => {

        if (voice.ShortName === "unknown") return;

        try {
            const blob = await tts.getVoiceBlob(voice, message);
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
            <div className={styles.voice} onClick={showVoices}>
                {voice.LocalName}
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
            voices.length !== 0 &&
            <div className={styles.select_voices}>
                {voices.map(
                    (v) => <div key={v.DisplayName} className={styles.voice} onClick={() => updateVoice(v)}>
                        {v.LocalName}
                    </div>
                )}
            </div>
        }
    </>;
}

export default VoiceSelector;