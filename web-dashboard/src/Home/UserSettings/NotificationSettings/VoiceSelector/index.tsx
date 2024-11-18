import React, { useEffect, useState } from "react";
import { IonIcon } from '@ionic/react';

import { MessageTemplate } from "@utils/Notifications";
import TTS, { Selector, Voice } from "@utils/microsoftTTS";

import "./style.css";
import { useTranslation } from "react-i18next";

interface Props {
    tts: TTS
    content: string
    message: MessageTemplate
    onChange: (message: MessageTemplate) => void
}

const VoiceSelector: React.FC<Props> = (props) => {
    const { t } = useTranslation();
    const [selector, SetSelector] = useState<Selector>();
    const [languages, SetLanguages] = useState<string[]>([]);
    const [voices, SetVoices] = useState<Voice[]>([]);

    useEffect(() => {
        const { tts, message } = props;

        const selector = new Selector(tts, message.language, message.voice);

        SetSelector(selector);
    }, []);

    if (!selector) {
        return <></>;
    }

    const SyncVoice = () => {
        const { message, onChange } = props;
        message.language = selector.Language;
        message.voice = selector.Voice.DisplayName;
        onChange(message);
    }

    const LanguagesList = () => {
        SetLanguages(selector.Languages);
    }

    const VoicesList = () => {
        SetVoices(selector.Voices);
    }

    const SelectLanguage = (lang: string) => {
        selector.Language = lang;
        SetLanguages([]);
        SetVoices([]);
        SetSelector(selector);
        SyncVoice();
    }

    const SelectVoice = (vo: string) => {
        selector.Voice = vo;
        SetVoices([]);
        SetSelector(selector);
        SyncVoice();
    }

    const Default = () => {
        const { tts } = props;
        SelectLanguage(tts.language);
        SyncVoice();
    }

    const Play = () => {
        const { content } = props;

        selector.Play(content).then(blob => {
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            audio.play();

            audio.onended = () => {
                URL.revokeObjectURL(url);
            }
        });
    }

    return <>
        <div className="tts_selector">
            <div className="tts_selector_language" onClick={LanguagesList}>{selector.Language}</div>
            <div className="tts_selector_voice" onClick={VoicesList}>{selector.Voice.LocalName}</div>
            <div className="tts_selector_play" onClick={Play}>
                <IonIcon name="volume-medium" />
            </div>
        </div>
        {
            languages.length === 0 ? <></> :
                <div className="tts_select_languages">
                    <div className="select_language" onClick={Default}>{t("default")}</div>
                    {languages.map(
                        (l) => <div key={l} className="select_language" onClick={() => SelectLanguage(l)}>
                            {l}
                        </div>
                    )}
                </div>
        }
        {
            voices.length === 0 ? <></> :
                <div className="tts_select_voices">
                    {voices.map(
                        (v) => <div key={v.DisplayName} className="select_voice" onClick={() => SelectVoice(v.DisplayName)}>
                            {v.LocalName}
                        </div>
                    )}
                </div>
        }
    </>;
}

export default VoiceSelector;