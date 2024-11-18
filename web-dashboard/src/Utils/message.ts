/**
 * 
 */

namespace MessageEvents {
    export type MessageButtonClickEvent = { detail: Message };
    export type MessagesChangeEvent = { detail: Message[] };
}

namespace MessageEventHandlers {
    export type MessageButtonClickEventHandler = (event?: MessageEvents.MessageButtonClickEvent) => void;
    export type MessagesChangeEventHandler = (event?: MessageEvents.MessagesChangeEvent) => void
}

type MessageButtonEventPayloads = {
    "click": MessageEvents.MessageButtonClickEvent
};

type MessageButtonEventHandlers = {
    "click": MessageEventHandlers.MessageButtonClickEventHandler
}

class MessageButton {
    private readonly _text: string;
    private _autoRemove: boolean = true;
    private _onClick?: MessageEventHandlers.MessageButtonClickEventHandler;
    private _message: Message;

    /**
     * 
     * @param text Button內顯示文字
     */
    constructor(text: string) {
        this._text = text;

        this.Click = this.Click.bind(this);
    }

    /**
     * 獲取Button內文字
     */
    public get Text(): string {
        return this._text;
    }

    /**
     * 點擊後自動移除Message
     * @param autoRemove default: true
     * @returns 
     */
    public AutoRemove(autoRemove: boolean = true): MessageButton {
        this._autoRemove = autoRemove;
        return this;
    }

    /**
     * 設定Button所屬Message
     */
    public set Message(message: Message) {
        this._message = message;
    }

    /**
     * 觸發點擊
     */
    public Click(): void {
        const { _message, _autoRemove } = this;
        if (!_message) return;

        this.emit("click", { detail: _message });

        if (_autoRemove) {
            _message.Remove();
        }
    }

    private events: { [K in keyof MessageButtonEventHandlers]?: Array<any> } = {};

    public on<K extends keyof MessageButtonEventHandlers>(event: K, listener: MessageButtonEventHandlers[K]): MessageButton {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event]!.push(listener);
        return this;
    }

    public off<K extends keyof MessageButtonEventHandlers>(event: K, listener: MessageButtonEventHandlers[K]) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event]!.filter(l => l !== listener);
    }

    private emit<K extends keyof MessageButtonEventPayloads>(event: K, value: MessageButtonEventPayloads[K]) {
        if (!this.events[event]) return;

        for (const listener of this.events[event]!) {
            listener(value);
        }
    }
}

/**
 * - "alert" :  警告消息 手動移除、指令移除
 * - "normal":  正常消息 無Button時定時移除、指令移除
 * - "error" :  錯誤消息 無Button時定時移除、指令移除
 */
type MessageType = "normal" | "alert" | "error";

interface Message {
    text: string;

}
class Message {
    public static Type = class {
        public static readonly Normal: MessageType = "normal";
        public static readonly Alert: MessageType = "alert";
        public static readonly Error: MessageType = "error";
    }

    public readonly _type: MessageType;
    private readonly _text: string;
    private _buttons: MessageButton[] = [];
    private _id: string;
    private _manager: MessageManager;

    constructor(type: MessageType, text: string, buttons: MessageButton[] = []) {
        this._type = type;
        this._text = text;
        this._buttons = buttons;

        buttons.forEach(button => {
            button.Message = this;
        });
    }

    public get Type(): MessageType {
        return this._type;
    }

    public get Text(): string {
        return this._text;
    }

    public set Id(id: string) {
        this._id = id;
    }

    public get Id(): string {
        return this._id;
    }

    /**
     * 添加新Button
     * @param button 
     */
    public AddButton(button: MessageButton): void {
        button.Message = this;
        this._buttons.push(button);
    }

    /**
     * 檢查Message中是否有Button
     */
    public get HasButton(): boolean {
        return this._buttons.length > 0;
    }

    /**
     * 
     */
    public get Buttons(): MessageButton[] {
        return this._buttons;
    }

    /**
     * 設定Message所屬Manager
     */
    public set Manager(manager: MessageManager) {
        this._manager = manager;
    }

    /**
     * 移除Message
     */
    public Remove(): void {
        if (!this._manager) return;
        this._manager.Remove(this._id);
    }
}

type MessageManagerEventPayloads = {
    "messages_change": MessageEvents.MessagesChangeEvent
};

type MessageManagerEventHandlers = {
    "messages_change": MessageEventHandlers.MessagesChangeEventHandler
}

class MessageManager {
    private messages: Message[] = [];

    private static get CreateId(): string {
        const buf = new Uint16Array(8);
        crypto.getRandomValues(buf);
        return Array.from(buf).map((num) => (num < 0x10000 ? '0' : '') + num.toString(16)).join('-');
    }

    public get Messages(): Message[] {
        return this.messages;
    }

    /**
     * 添加Message至Manager中
     * @param message 
     */
    public Append(message: Message): void {
        
        message.Id = MessageManager.CreateId;
        message.Manager = this;

        let autoRemove = 0;
        switch (message.Type) {
            case "alert": {
                if (!message.HasButton) {
                    const button = new MessageButton("");
                    message.AddButton(button);
                }
                break;
            }
            case "normal": {
                autoRemove = 3000;
                break;
            }
            case "error": {
                autoRemove = 5000;
                break;
            }
        }

        this.messages.push(message);

        if (!message.HasButton && autoRemove !== 0) {
            setTimeout(() => this.Remove(message.Id), autoRemove);
        }
        
        this.emit("messages_change", { detail: this.messages });
    }

    /**
     * 移除Message
     * @param messageId 
     */
    public Remove(messageId: string): void {
        const { messages } = this;
        const index = messages.findIndex((message) => message.Id === messageId);

        if (index > -1) {
            this.messages = [...messages.slice(0, index), ...messages.slice(index + 1)];

            this.emit("messages_change", { detail: this.messages });
        }
    }

    private events: { [K in keyof MessageManagerEventHandlers]?: Array<any> } = {};

    public on<K extends keyof MessageManagerEventHandlers>(event: K, listener: MessageManagerEventHandlers[K]) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event]!.push(listener);
    }

    public off<K extends keyof MessageManagerEventHandlers>(event: K, listener: MessageManagerEventHandlers[K]) {
        if (!this.events[event]) return;

        this.events[event] = this.events[event]!.filter(l => l !== listener);
    }

    private emit<K extends keyof MessageManagerEventPayloads>(event: K, value: MessageManagerEventPayloads[K]) {
        if (!this.events[event]) return;

        for (const listener of this.events[event]!) {
            listener(value);
        }
    }
}

export {
    MessageType,
    MessageButton,
    Message,
    MessageManager,
    MessageEvents,
    MessageEventHandlers
}