import type React from "react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import styles from "./style.module.scss";

interface Loading {
    remove: () => void;
}

interface LoaderContextValue {
    append: () => Loading;
}

const LoaderContext = createContext<LoaderContextValue | null>(null);

export const useLoader = (): LoaderContextValue => {
    const context = useContext(LoaderContext);
    if (!context) {
        throw new Error("useLoader must be used within an LoaderProvider.");
    }
    return context;
};

export const LoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [count, setCount] = useState(0);
    const idsRef = useRef<Set<string>>(new Set());

    const append = useCallback((): Loading => {
        const id = crypto.randomUUID();
        idsRef.current.add(id);
        setCount(idsRef.current.size);

        return {
            remove: () => {
                idsRef.current.delete(id);
                setCount(idsRef.current.size);
            },
        };
    }, []);

    return (
        <LoaderContext.Provider value={{ append }}>
            {children}
            {count > 0 && (
                <div className={styles.loader}>
                    <div className={styles.loader_main}>
                        <div className={styles.triangle}></div>
                        <div className={styles.line}></div>
                        <div className={styles.triangle}></div>
                        <div className={styles.line}></div>
                        <div className={styles.triangle}></div>
                        <div className={styles.line}></div>
                        <div className={styles.triangle}></div>
                        <div className={styles.line}></div>
                    </div>
                </div>
            )}
        </LoaderContext.Provider>
    );
};
