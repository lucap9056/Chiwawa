import * as Collapsible from "@radix-ui/react-collapsible";
import type React from "react";
import styles from "./style.module.scss";

interface Props {
    title: string;
    visible?: boolean;
    children: React.ReactNode;
}

const Block: React.FC<Props> = ({ title, visible, children }) => {
    return (
        <Collapsible.Root className={styles.block} defaultOpen={visible ?? true}>
            <Collapsible.Trigger asChild>
                <div className={styles.title}>{title}</div>
            </Collapsible.Trigger>
            <Collapsible.Content className={styles.content}>{children}</Collapsible.Content>
        </Collapsible.Root>
    );
};

export default Block;
