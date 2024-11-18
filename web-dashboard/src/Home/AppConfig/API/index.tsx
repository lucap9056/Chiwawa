import React, { useState } from "react";

import ApplicationConfig from "@utils/applicationConfig";

interface Props {
    config: ApplicationConfig
}

const API: React.FC<Props> = ({ config }) => {

    const [apiVisible, SetAPIVisible] = useState(false);
    const [oauth2Visible, SetOauth2Visible] = useState(false);

    const APIVisible = () => {
        SetAPIVisible(!apiVisible);
    }

    const OAuth2Visible = () => {
        SetOauth2Visible(!oauth2Visible);
    }

    return <>
        <div className="app_config_block_label" onClick={APIVisible}>API</div>
        <div className="app_config_api app_config_block" data-visible={apiVisible}>

            <div className="app_config_label">Port</div>
            <input type="text" name="apiPort" defaultValue={config.api.port} />

            <div className="app_config_label">Redirect uri</div>
            <input type="text" name="redirectUri" defaultValue={config.api.redirectUri} />

            <div className="app_config_label">Session secret</div>
            <input type="password" name="sessionSecret" defaultValue={config.api.sessionSecret} />

            <div className="app_config_block_label" onClick={OAuth2Visible}>OAuth2</div>
            <div className="app_config_oauth2 app_config_block" data-visible={oauth2Visible}>

                <div className="app_config_label">Client id</div>
                <input type="text" name="clientId" defaultValue={config.api.oauth2.clientId} />

                <div className="app_config_label">Client secret</div>
                <input type="password" name="clientSecret" defaultValue={config.api.oauth2.clientSecret} />

            </div>
        </div>
    </>
}

export default API;
