/**
 * Message Button Event Definitions
 */
import { ReactNode } from "react";
import EventDispatcher from "app-pages/global-structs/event-dispatcher";

interface MessageButtonOptions {
    auto_remove?: boolean
}

type MessageButtonEventDefinitions = {
    "Clicked": { detail: Message };
};
export type MessageButtonEvent<T extends keyof MessageButtonEventDefinitions> = MessageButtonEventDefinitions[T];

export class MessageButton extends EventDispatcher<MessageButtonEventDefinitions> {
    public readonly text: string;
    private autoRemove: boolean = true;
    private _message?: Message;

    /**
     * @param text Text displayed on the button
     */
    constructor(text: string, options?: MessageButtonOptions) {
        super()
        this.text = text;

        if (options) {
            if (options.auto_remove !== undefined) {
                this.autoRemove = options.auto_remove;
            }
        }

        this.click = this.click.bind(this);
    }

    /**
     * Set the message associated with the button
     */
    public set message(message: Message) {
        this._message = message;
    }

    /**
     * Trigger button click
     */
    public click(): void {
        const { _message, autoRemove } = this;
        if (!_message) return;

        this.emit("Clicked", { detail: _message });

        if (autoRemove) {
            _message.remove();
        }
    }
}

type MessageType = "NORMAL" | "ALERT" | "ERROR";

export interface MessageOptions {
    type: MessageType
    content: ReactNode
    buttons?: MessageButton[]
}

export class Message {
    public static Type = class {
        /** `NORMAL`: Normal message, will be automatically removed after a delay if no button is present, or can be removed via command. */
        public static readonly NORMAL: MessageType = "NORMAL";
        /** `ALERT`: Alert message, must be manually removed or removed via command. */
        public static readonly ALERT: MessageType = "ALERT";
        /** `ERROR`: Error message, will be automatically removed after a delay if no button is present, or can be removed via command. */
        public static readonly ERROR: MessageType = "ERROR";
    }

    private static get CreateId(): string {
        const buf = new Uint16Array(8);
        crypto.getRandomValues(buf);
        return Array.from(buf).map((num) => (num < 0x10000 ? '0' : '') + num.toString(16)).join('-');
    }

    private _type: MessageType;
    private _content: ReactNode;
    private _id: string = Message.CreateId;
    private _buttons: MessageButton[] = [];
    private _manager?: MessageManager;

    constructor({ type, content, buttons = [] }: MessageOptions) {

        this._type = type;
        this._content = content;
        this._buttons = buttons;

        buttons.forEach(button => {
            button.message = this;
        });
    }

    /**
     * Add a new button
     * @param button 
     */
    public addButton(button: MessageButton): void {
        button.message = this;
        this._buttons.push(button);
    }

    /**
     * Check if the message contains a button
     */
    public get hasButton(): boolean {
        return this._buttons.length > 0;
    }

    /**
     * Get the buttons associated with the message
     */
    public get buttons(): MessageButton[] {
        return this._buttons;
    }

    /**
     * Set the manager associated with the message
     */
    public set manager(manager: MessageManager) {
        this._manager = manager;
    }

    /**
     * Remove the message
     */
    public remove(): void {
        if (!this._manager || !this._id) return;
        this._manager.remove(this._id);
    }

    public get id(): string {
        return this._id;
    }

    public get type(): MessageType {
        return this._type;
    }

    public get content(): ReactNode {
        return this._content;
    }
}

type MessageManagerEventDefinitions = {
    "MessagesChanged": { detail: Message[] };
};
export type MessageManagerEvent<T extends keyof MessageManagerEventDefinitions> = MessageManagerEventDefinitions[T];

export default class MessageManager extends EventDispatcher<MessageManagerEventDefinitions> {
    private _messages: Map<string, Message> = new Map();

    /**
     * Add a message to the manager
     * @param message 
     */
    public append(message: Message): Message {
        message.manager = this;

        let autoRemove = 0;
        switch (message.type) {
            case Message.Type.ALERT: {
                if (!message.hasButton) {
                    const button = new MessageButton("");
                    message.addButton(button);
                }
                break;
            }
            case Message.Type.NORMAL: {
                autoRemove = 3000;
                break;
            }
            case Message.Type.ERROR: {
                autoRemove = 5000;
                break;
            }
        }

        this._messages.set(message.id, message);

        if (!message.hasButton && autoRemove !== 0) {
            setTimeout(() => this.remove(message.id), autoRemove);
        }

        this.emit("MessagesChanged", { detail: this.messages });

        return message;
    }

    /**
     * Remove a message
     * @param messageId 
     */
    public remove(messageId: string): void {
        if (this._messages.delete(messageId)) {
            this.emit("MessagesChanged", { detail: this.messages });
        }
    }

    public get messages(): Message[] {
        return Array.from(this._messages.values());
    }
}
