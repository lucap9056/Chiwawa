/**
 * 畫面中央提示
 */
import React, { useEffect, useState } from 'react';

import { Message, MessageEvents, } from "@utils/message";

import { messageManager } from "./script";
import "./style.css";

export {
    messageManager
}

const Messages = () => {
    const [message, setMessage] = useState<Message>();

    useEffect(() => {


        const MessagesChange = (e: MessageEvents.MessagesChangeEvent) => {
            if (e.detail.length === 0) {
                setMessage(undefined);
            }
            else {
                setMessage(e.detail[0]);
            }
        }

        setMessage(messageManager.Messages[0]);

        messageManager.on("messages_change", MessagesChange);
        return () => {
            messageManager.off("messages_change", MessagesChange);
        }
    }, []);

    if (!message) return <></>;

    return <MessageComponent key={message.Id} content={message} />;
}

export default Messages;

class MessageComponent extends React.Component<{ content: Message }> {
    constructor(props: { content: Message }) {
        super(props);
    }

    render(): React.ReactNode {
        const { content } = this.props;
        return <div className="message_container">
            <div className="message" data-type={content.Type}>
                <p className="message_content">{content.Text}</p>
                {content.Buttons.map(
                    (button, i) => <button key={content.Id + i} className="message_button"
                        onClick={button.Click}>
                        {button.Text}
                    </button>
                )}
            </div>
        </div>
    }
}