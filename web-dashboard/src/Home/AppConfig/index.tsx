import React from "react";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";

import Config from "@utils/applicationConfig";

import Admins from "./Admins";
import API from "./API";
import Database from "./Database";
import Discord from "./Discord";

import "./style.css";
import ApplicationConfig from "@utils/applicationConfig";

interface Props {
    config: Config
    onSave: (config: Config) => void
}

const AppConfig: React.FC<Props> = (props) => {
    const navigate = useNavigate();
    const { config } = props;

    const Back = () => {
        navigate(-1);
    }

    const Save = (e: React.FormEvent<HTMLFormElement>) => {
        e.stopPropagation();
        e.preventDefault();

        const formData = new FormData(e.target as HTMLFormElement);

        const newConfig: ApplicationConfig = {
            adminIds: formData.getAll('adminId').map((v) => v.toString()),
            discord: {
                token: (formData.get("discordToken") || "").toString(),
                tts: {
                    region: (formData.get("ttsRegion") || "").toString(),
                    token: (formData.get("ttsToken") || "").toString(),
                    defaultLanguage: (formData.get("ttsDefaultLanguage") || "").toString()
                },
                defaultMessages: {
                    joinSuffix: (formData.get("ttsDefaulteJoinSuffix") || "").toString(),
                    leaveSuffix: (formData.get("ttsDefaultLeaveSuffix") || "").toString()
                }
            },
            database: {
                uri: (formData.get("databaseUri") || "").toString(),
            },
            api: {
                port: (formData.get("apiPort") || "").toString(),
                redirectUri: (formData.get("redirectUri") || "").toString(),
                sessionSecret: (formData.get("sessionSecret") || "").toString(),
                oauth2: {
                    clientId: (formData.get("clientId") || "").toString(),
                    clientSecret: (formData.get("clientSecret") || "").toString(),
                },
            }
        }

        props.onSave(newConfig);
    }

    return <div className="app">
        <div className="app_options">
            <div style={{ flex: 1 }}></div>
            <button type="button" className="app_option" onClick={Back}>
                <IonIcon name="arrow-back" />Back
            </button>
        </div>
        <form className="app_config" onSubmit={Save}>
            <Admins config={config} />
            <API config={config} />
            <Database config={config} />
            <Discord config={config} />
            <div className="app_config_options">
                <button type="submit" className="app_config_option button">Save</button>
            </div>
        </form>
    </div>
}

export default AppConfig;