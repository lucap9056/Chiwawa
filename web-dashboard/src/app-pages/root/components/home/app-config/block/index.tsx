import React, { useEffect, useRef, useState } from "react";
import styles from "./style.module.scss";

interface Props {
    title: string
    visible?: boolean
    children: React.ReactNode
}

const Block: React.FC<Props> = (props) => {
    const [visible, SetVisible] = useState<boolean>(props.visible !== undefined ? props.visible : true);
    const [style, SetStyle] = useState<React.CSSProperties>({});
    const [isExpanded, setIsExpanded] = useState<boolean>(visible);
    const { title, children } = props;
    const content = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!content.current) return;

        if (visible) {
            const height = content.current.scrollHeight;
            SetStyle({ height });

            const timer = setTimeout(() => {
                if (content.current && visible) {
                    setIsExpanded(true);
                }
            }, 350);
            return () => clearTimeout(timer);
        } else {
            const height = content.current.clientHeight;
            SetStyle({ height });
            setIsExpanded(false);
            const timer = setTimeout(() => {
                SetStyle({});
            }, 25);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const HandleVisible = () => {
        SetVisible(!visible);
    }

    return <div className={styles.block}>
        <div className={styles.title} data-visible={visible} onClick={HandleVisible}>{title}</div>
        <div className={styles.content} style={isExpanded ? {} : style} data-expanded={isExpanded || undefined} ref={content}>
            {children}
        </div>
    </div>
}

export default Block;