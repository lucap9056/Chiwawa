"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

import MessageManager, { Message, MessageManagerEvent } from "app-pages/global-structs/message";

import styles from "./style.module.scss";


const NotificationsContext = createContext<MessageManager | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const manager = new MessageManager();
    return <NotificationsContext.Provider value={manager}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = (): MessageManager => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error("useNotifications must be used within an NotificationsProvider.");
    }
    return context;
};

const Notifications: React.FC = () => {
    const manager = useNotifications();
    const [notifications, setNotifications] = useState<Message[]>([]);

    useEffect(() => {

        function NotificationsChangedHandler(e: MessageManagerEvent<"MessagesChanged">) {
            setNotifications([...e.detail]);
        }

        manager.on("MessagesChanged", NotificationsChangedHandler);
        return () => {
            manager.off("MessagesChanged", NotificationsChangedHandler);
        }
    }, []);

    if (notifications.length > 0) {
        return <div className={styles.notifications}>
            {notifications.map(

                (notification) => <li className={styles.notification} key={notification.id} data-type={notification.type}>
                    <p className={styles.message}>{notification.content}</p>
                    {notification.buttons.map(
                        (button, i) => <button key={notification.id + i} className={styles.button}
                            data-id={notification.id || ""}
                            onClick={button.click}>
                            {button.text}
                        </button>
                    )}
                </li>

            )}
        </div>
    }
    else return <></>;
}

export default Notifications;