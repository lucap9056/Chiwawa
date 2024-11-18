/**
 * This file defines the configuration for message notifications, including global and guild-specific settings.
 * It includes functionality to manage message templates and notification settings, handling prefix, content, and suffix.
 */

interface MessageTemplate {
    prefix: string; // The prefix to prepend to the message.
    content: string; // The main content of the message.
    suffix?: string; // Optional suffix to append to the message. If undefined, no suffix will be appended.
    language?: string; // Optional language for the message.
    voice?: string;  // Optional voice model to use for text-to-speech.
}

interface Notification {
    inheritGlobal: boolean; // Indicates whether to use global settings.
    muted: boolean; // Indicates whether notifications are muted.
    joinMessage: MessageTemplate; // Message template for joining a Discord channel.
    leaveMessage: MessageTemplate; // Message template for leaving a Discord channel.
}

class Notification {
    public static Global = "global"; // Identifier for global notifications.
    public static Empty: Notification = {
        inheritGlobal: true,
        muted: false,
        joinMessage: {
            prefix: "",
            content: "",
            suffix: "" // Default suffix is an empty string.
        },
        leaveMessage: {
            prefix: "",
            content: "",
            suffix: "" // Default suffix is an empty string.
        },
    } as Notification;

    /**
     * Creates an instance of the Notification class.
     * @param notification - An object containing the notification settings.
     */
    constructor(notification: Notification) {
        Object.assign(this, notification);
    }

    /**
     * Checks if the notification is a simple notification.
     * A notification is considered simple if the joinMessage and leaveMessage have no content,
     * and their prefix and suffix are either not set or are empty strings.
     * @returns `true` if the notification is simple; otherwise, `false`.
     */
    public get IsSimpleNotification(): boolean {
        const { joinMessage, leaveMessage } = this;

        // Check if both joinMessage and leaveMessage have empty or undefined prefix and suffix.
        return leaveMessage.content === ""
            && joinMessage.prefix === ""
            && joinMessage.prefix === leaveMessage.prefix
            && (joinMessage.suffix === "" || joinMessage.suffix === undefined)
            && joinMessage.suffix === leaveMessage.suffix;
    }
}

interface Notifications {
    id: string; // The Discord user ID for which the notification settings apply.
    globalSettings: Notification; // Global notification settings.
    guildSettings: { [guildId: string]: Notification }; // Guild-specific notification settings. Uses globalSettings if inheritGlobal is true.
}

export {
    Notifications,
    Notification,
    MessageTemplate
}

export default Notifications;
