import React, { useEffect, useState } from "react";

import ApplicationConfig from "@utils/applicationConfig";

interface Props {
    config: ApplicationConfig
}

const Admins: React.FC<Props> = ({ config }) => {
    const [adminsVisible, SetAdminsVisible] = useState(false);
    const [admins, SetAdmins] = useState<string[]>(config.adminIds);

    const AdminsVisible = () => {
        SetAdminsVisible(!adminsVisible);
    }

    const Remove = (id: string) => {
        const index = admins.indexOf(id);
        const before = admins.slice(0, index);
        const after = admins.slice(index + 1);
        SetAdmins([...before, ...after]);
    }

    const NewAdmin = (e: React.KeyboardEvent<HTMLInputElement>) => {

        if (e.key !== "Enter") return;

        e.stopPropagation();
        e.preventDefault();
        const input = e.target as HTMLInputElement;

        if (input.value) {
            SetAdmins([...admins, input.value]);
            input.value = "";
        }
    }

    return <>
        <div className="app_config_block_label" onClick={AdminsVisible}>Admins</div>
        <div className="app_config_admins app_config_block" data-visible={adminsVisible}>
            {admins.map((admin) =>
                <div key={admin} className="app_conig_admin">
                    <div className="app_config_admin_id">{admin}</div>
                    <div className="app_config_admin_remove" onClick={() => Remove(admin)}></div>
                    <input type="text" name="adminId" value={admin} readOnly hidden />
                </div>
            )}

            <input className="app_config_new_admin" type="text" placeholder="Append" onKeyDown={NewAdmin} />
        </div>
    </>
}

export default Admins;