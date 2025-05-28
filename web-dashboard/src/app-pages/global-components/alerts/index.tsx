"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

import MessageManager, { Message, MessageManagerEvent } from "app-pages/global-structs/message";

import styles from "./style.module.scss";

const AlertsContext = createContext<MessageManager | null>(null);

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const imgstorAlerts = new MessageManager();
    return <AlertsContext.Provider value={imgstorAlerts}>{children}</AlertsContext.Provider>;
};

export const useAlerts = (): MessageManager => {
    const context = useContext(AlertsContext);
    if (!context) {
        throw new Error("useAlerts must be used within an AlertsProvider.");
    }
    return context;
};

const Alerts: React.FC = () => {
    const manager = useAlerts();
    const [alert, setAlert] = useState<Message>();

    useEffect(() => {
        const AlertsChangedHandler = (e: MessageManagerEvent<"MessagesChanged">) => {
            if (e.detail.length === 0) {
                setAlert(undefined);
            }
            else {
                setAlert(e.detail[0]);
            }
        }

        manager.on("MessagesChanged", AlertsChangedHandler);
        return () => {
            manager.off("MessagesChanged", AlertsChangedHandler);
        }
    }, []);

    if (!alert) return <></>;

    return <Alert key={alert.id} content={alert} />;
}

const Alert: React.FC<{ content: Message }> = ({ content }) => {
    return <div className={styles.alert}>
        <div className={styles.main} data-type={content.type}>
            <div className={styles.message}>{content.content}</div>
            {content.buttons.map(
                (button, i) => <button key={content.id + i} className={styles.button}
                    onClick={button.click}>
                    {button.text}
                </button>
            )}
        </div>
    </div>
}

export default Alerts;