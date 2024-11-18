import React, { useState } from "react";

import ApplicationConfig from "@utils/applicationConfig";

interface Props {
    config: ApplicationConfig
}

const Discord: React.FC<Props> = ({ config }) => {
    const [discordVisible, SetDiscordVisible] = useState(false);
    const [ttsVisible, SetTTSVisible] = useState(false);
    const [defaultMessageVisible, SetDefaultMessageVisible] = useState(false);

    const DiscordVisible = () => {
        SetDiscordVisible(!discordVisible);
    }

    const TTSVisible = () => {
        SetTTSVisible(!ttsVisible);
    }

    const DefaultMessageVisible = () => {
        SetDefaultMessageVisible(!defaultMessageVisible);
    }

    return <>
        <div className="app_config_block_label" onClick={DiscordVisible}>Discord</div>
        <div className="app_config_discord app_config_block" data-visible={discordVisible}>

            <div className="app_config_label">Token</div>
            <input type="password" name="discordToken" defaultValue={config.discord.token} />

            <div className="app_config_block_label" onClick={TTSVisible}>TTS</div>
            <div className="app_config_tts app_config_block" data-visible={ttsVisible}>

                <div className="app_config_label">Region</div>
                <input type="text" name="ttsRegion" defaultValue={config.discord.tts.region} />

                <div className="app_config_label">Token</div>
                <input type="password" name="ttsToken" defaultValue={config.discord.tts.token} />

                <div className="app_config_label">Default language</div>
                <input type="text" name="ttsDefaultLanguage" placeholder="en-US" defaultValue={config.discord.tts.defaultLanguage} />
            </div>

            <div className="app_config_block_label" onClick={DefaultMessageVisible}>Default message</div>
            <div className="app_config_tts app_config_block" data-visible={defaultMessageVisible}>

                <div className="app_config_label">Join suffix</div>
                <input type="text" name="ttsDefaultJoinSuffix" defaultValue={config.discord.defaultMessages.joinSuffix} />

                <div className="app_config_label">Leave suffix</div>
                <input type="text" name="ttsDefaultLeaveSuffix" defaultValue={config.discord.defaultMessages.leaveSuffix} />
            </div>
        </div>
    </>
}

export default Discord;