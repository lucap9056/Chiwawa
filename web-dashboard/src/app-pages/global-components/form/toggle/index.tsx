import React, { useState } from "react";

import styles from "./style.module.scss";

interface Props {
    name?: string
    label: string
    value: boolean
    onChange?: (v: boolean) => void
}

const Toggle: React.FC<Props> = ({ name, label, value, onChange }) => {

    const [isEnabled, setIsEnabled] = useState<boolean>(value);

    const Change = () => {
        const value = !isEnabled;
        setIsEnabled(value);
        if (onChange) onChange(value);
    }

    return <div className={styles.toggle}>
        <div className={styles.label}>{label}</div>
        <div className={styles.content}>
            <div className={styles.button} data-enabled={isEnabled} onClick={Change}></div>
        </div>
        {name && <input type="checkbox" name={name} checked={isEnabled} readOnly hidden />}
    </div>
}

export default Toggle;