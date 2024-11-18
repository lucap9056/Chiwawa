import React, { useState } from "react";

import ApplicationConfig from "@utils/applicationConfig";

interface Props {
    config: ApplicationConfig
}

const Database: React.FC<Props> = ({ config }) => {
    const [databaseVisible, SetDatabaseVisible] = useState(false);

    const DatabaseVisible = () => {
        SetDatabaseVisible(!databaseVisible);
    }

    return <>
        <div className="app_config_block_label" onClick={DatabaseVisible}>Database</div>
        <div className="app_config_database app_config_block" data-visible={databaseVisible}>

            <div className="app_config_label">Uri</div>
            <input type="text" name="databaseUri" defaultValue={config.database.uri} />
        </div>
    </>
}

export default Database;