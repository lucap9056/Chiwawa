import React, { useState, useEffect } from "react";

import { Message, MessageEvents } from "@utils/message";
import { alertsManager } from "./script";
import "./style.css";

export {
    alertsManager
}

const Alerts = () => {
    const [alerts, setAlerts] = useState<Message[]>([]);

    useEffect(() => {

        function AlertsChange(e: MessageEvents.MessagesChangeEvent) {
            setAlerts([...e.detail]);
        }

        setAlerts(alertsManager.Messages);

        alertsManager.on("messages_change", AlertsChange);
        return () => {
            alertsManager.off("messages_change", AlertsChange);
        }
    }, []);

    if (alerts.length > 0) {
        return <div className='alerts'>
            {alerts.map(
                (alert: Message) => <Alert key={alert.Id} content={alert} />
            )}
        </div>
    }
    else return <></>;
}

export default Alerts;


class Alert extends React.Component<{ content: Message }> {
    constructor(props: { content: Message }) {
        super(props);
    }

    render(): React.ReactNode {
        const { content } = this.props;

        return <li className="alert" data-type={content.Type}>
            <p className="alert_message">{content.Text}</p>
            {content.Buttons.map(
                (button, i) => <button key={content.Id + i} className="alert_button"
                    data-id={content.Id || ""}
                    onClick={button.Click}>
                    {button.Text}
                </button>
            )}
        </li>
    }
}