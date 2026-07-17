import * as RadixSwitch from "@radix-ui/react-switch";
import type React from "react";
import styles from "./style.module.scss";

interface Props {
    name?: string;
    label: string;
    value: boolean;
    onChange?: (v: boolean) => void;
}

const Switch: React.FC<Props> = ({ name, label, value, onChange }) => {
    return (
        <div className={styles.toggle}>
            <div className={styles.label}>{label}</div>
            <div className={styles.content}>
                <RadixSwitch.Root className={styles.button} name={name} checked={value} onCheckedChange={onChange}>
                    <RadixSwitch.Thumb className={styles.thumb} />
                </RadixSwitch.Root>
            </div>
        </div>
    );
};

export default Switch;
