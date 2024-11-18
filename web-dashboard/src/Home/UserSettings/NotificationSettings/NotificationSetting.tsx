import React from "react";

import { MessageTemplate, Notification } from "@utils/Notifications";
import { DiscordGuild } from "@utils/discordUser";
import TTS, { Selector } from "@utils/microsoftTTS";

import Checkbox from "@components/Checkbox";
import VoiceSelector from "./VoiceSelector";
import { withTranslation, WithTranslation } from "react-i18next";


type AdvancedNames = "join_prefix" | "join_content" | "join_suffix" | "leave_prefix" | "leave_content" | "leave_suffix";

interface Props extends WithTranslation {
    tts: TTS
    userName: string
    guild?: DiscordGuild
    originNotification: Notification
    Save: (notification: Notification) => void
}

interface State {
    notification: Notification
    advancedMode: boolean
    removeSuffix: boolean
}

class NotificationSetting extends React.Component<Props, State> {
    constructor(props: Props) {

        super(props);
        const notification = new Notification(props.originNotification);

        const simple = notification.IsSimpleNotification;
        const removeSuffix = (notification.joinMessage && notification.joinMessage.suffix === undefined);

        this.state = {
            notification,
            advancedMode: !simple,
            removeSuffix: removeSuffix
        }

        this.Save = this.Save.bind(this);
        this.Simple = this.Simple.bind(this);
        this.SetMute = this.SetMute.bind(this);
        this.Advanced = this.Advanced.bind(this);
        this.SetAdvanced = this.SetAdvanced.bind(this);
        this.RemoveSuffix = this.RemoveSuffix.bind(this);
        this.SetInheritGlobal = this.SetInheritGlobal.bind(this);
        this.SetSimpleContent = this.SetSimpleContent.bind(this);
        this.SetAdvancedContent = this.SetAdvancedContent.bind(this);
    }

    public SetInheritGlobal(v: boolean): void {
        const { notification } = this.state;
        notification.inheritGlobal = v;
        this.setState({
            notification
        })
    }

    public SetMute(v: boolean): void {
        const { notification } = this.state;
        notification.muted = v;
        this.setState({
            notification
        })
    }

    public SetAdvanced(v: boolean): void {
        this.setState({
            advancedMode: v
        })
    }

    public SetAdvancedContent(e: React.ChangeEvent<HTMLInputElement>): void {
        const input = e.target as HTMLInputElement;
        const { notification } = this.state;

        const name: AdvancedNames = input.name as AdvancedNames;
        const value = input.value;

        switch (name) {
            case "join_prefix":
                notification.joinMessage.prefix = value;
                break;
            case "join_content":
                notification.joinMessage.content = value;
                break;
            case "join_suffix":
                notification.joinMessage.suffix = value;
                break;
            case "leave_prefix":
                notification.leaveMessage.prefix = value;
                break;
            case "leave_content":
                notification.leaveMessage.content = value;
                break;
            case "leave_suffix":
                notification.leaveMessage.suffix = value;
                break;
        }

        this.setState({ notification });
    }

    public SetSimpleContent(e: React.ChangeEvent<HTMLInputElement>): void {
        const input = e.target as HTMLInputElement;
        const { notification } = this.state;

        notification.joinMessage.content = input.value;
        notification.leaveMessage.content = input.value;

        this.setState({ notification });
    }

    public RemoveSuffix(v: boolean): void {
        this.setState({
            removeSuffix: v
        })
    }

    public Simple(): React.JSX.Element {
        const { tts, userName, originNotification } = this.props;
        const { removeSuffix, notification } = this.state;

        const suffix = tts.defaultMessages.joinSuffix;
        const name = notification.joinMessage.content || userName;
        const content = removeSuffix ? name : name + suffix;

        const SetVoice = (message: MessageTemplate) => {
            const { joinMessage, leaveMessage } = notification;
            const { language, voice } = message;
            notification.joinMessage = Object.assign(joinMessage, { language, voice });
            notification.leaveMessage = Object.assign(leaveMessage, { language, voice });
        }

        return <>
            <div className="notification_setting_message">

                <input type="text" name="join_content" className="nitification_setting_message_simple"
                    placeholder={userName} defaultValue={originNotification.joinMessage.content || ""}
                    onChange={this.SetSimpleContent}
                />

            </div>
            <VoiceSelector tts={tts} content={content} message={notification.joinMessage} onChange={SetVoice} />

            <input type="checkbox" name="remove_suffix" checked={removeSuffix} readOnly hidden />
        </>;
    }

    public Advanced(): React.JSX.Element {
        const { tts, userName } = this.props;
        const originNotification = this.props.originNotification;
        const { removeSuffix, notification } = this.state;
        const { joinMessage, leaveMessage } = notification;
        const { defaultMessages } = tts;

        const joinPrefix = joinMessage.prefix || "";
        const joinSuffix = removeSuffix ? "" : joinMessage.suffix || defaultMessages.joinSuffix;

        const joinContent = joinMessage.content || userName;

        const leavePrefux = leaveMessage.prefix || joinPrefix;
        const leaveSuffix = removeSuffix ? "" : leaveMessage.suffix || joinMessage.suffix || defaultMessages.leaveSuffix;
        const leaveContent = leaveMessage.content || joinContent;

        const SetJoinVoice = (message: MessageTemplate) => {
            const { joinMessage } = notification;
            const { language, voice } = message;
            notification.joinMessage = Object.assign(joinMessage, { language, voice });
        }

        const SetLeaveVoice = (message: MessageTemplate) => {
            const { leaveMessage } = notification;
            const { language, voice } = message;
            notification.leaveMessage = Object.assign(leaveMessage, { language, voice });
        }

        return <>
            <div className="notification_setting_message">

                <input type="text" name="join_prefix" className="notification_setting_message_prefix"
                    placeholder={joinPrefix} defaultValue={originNotification.joinMessage.prefix}
                    onChange={this.SetAdvancedContent}
                />

                <input type="text" name="join_content" className="notification_setting_message_content"
                    placeholder={userName} defaultValue={originNotification.joinMessage.content}
                    onChange={this.SetAdvancedContent}
                />
                {
                    removeSuffix ? <></> :
                        <input type="text" name="join_suffix" className="notification_setting_message_suffix"
                            placeholder={joinSuffix} defaultValue={originNotification.joinMessage.suffix}
                            onChange={this.SetAdvancedContent}
                        />
                }
            </div>
            <VoiceSelector tts={tts} content={joinPrefix + joinContent + joinSuffix} message={joinMessage} onChange={SetJoinVoice} />
            <div className="notification_setting_message">

                <input type="text" name="leave_prefix" className="notification_setting_message_prefix"
                    placeholder={joinMessage.prefix} defaultValue={originNotification.leaveMessage.prefix}
                    onChange={this.SetAdvancedContent}
                />

                <input type="text" name="leave_content" className="notification_setting_message_content"
                    placeholder={joinMessage.content || userName} defaultValue={originNotification.leaveMessage.content}
                    onChange={this.SetAdvancedContent}
                />
                {
                    removeSuffix ? <></> :
                        <input type="text" name="leave_suffix" className="notification_setting_message_suffix"
                            placeholder={joinMessage.suffix || tts.defaultMessages.leaveSuffix} defaultValue={originNotification.leaveMessage.suffix}
                            onChange={this.SetAdvancedContent}
                        />
                }
            </div>
            <VoiceSelector tts={tts} content={leavePrefux + leaveContent + leaveSuffix} message={leaveMessage} onChange={SetLeaveVoice} />
        </>;
    }

    public Save(e: React.FormEvent<HTMLFormElement>): void {
        e.stopPropagation();
        e.preventDefault();

        const formData = new FormData(e.target as HTMLFormElement);

        const { joinMessage, leaveMessage } = this.state.notification;

        const notification = {
            inheritGlobal: formData.get("inherit_global") !== null,
            muted: formData.get("mute") !== null,
            joinMessage: {
                prefix: (formData.get("join_prefix") || "").toString(),
                content: (formData.get("join_content") || "").toString(),
                suffix: (formData.get("join_suffix") || "").toString(),
                language: joinMessage.language,
                voice: joinMessage.voice
            },
            leaveMessage: {
                prefix: (formData.get("leave_prefix") || "").toString(),
                content: (formData.get("leave_content") || "").toString(),
                suffix: (formData.get("leave_suffix") || "").toString(),
                language: leaveMessage.language,
                voice: leaveMessage.voice
            },
        } as Notification;

        const removeSuffix = formData.get("remove_suffix") !== null;
        if (removeSuffix) {
            delete notification.joinMessage.suffix;
            delete notification.leaveMessage.suffix;
        }

        this.props.Save(notification);
    }

    public render(): React.ReactNode {
        const { Save, Simple, Advanced, SetMute, SetAdvanced, SetInheritGlobal } = this;
        const { guild, t } = this.props;
        const { advancedMode, notification, removeSuffix } = this.state;

        if (guild && notification.inheritGlobal) {
            return <form onSubmit={Save}>
                <Checkbox label={t("inherit_global")} name="inherit_global" onChange={SetInheritGlobal} value={notification.inheritGlobal} />

                <div className="notification_setting_options">
                    <button type="submit" className="notification_setting_option">{t("save")}</button>
                </div>
            </form>;
        }

        return <form onSubmit={Save}>
            {
                guild ?
                    <Checkbox label={t("inherit_global")} name="inherit_global" onChange={SetInheritGlobal} value={notification.inheritGlobal} />
                    : <></>
            }

            <Checkbox label={t("mute")} name="mute" onChange={SetMute} value={notification.muted} />

            {
                notification.muted ? <></> :
                    <>
                        <Checkbox label={t("advanced_mode")} name="advancedMode" onChange={SetAdvanced} value={advancedMode} />

                        {
                            advancedMode ? <Advanced /> : <Simple />
                        }

                        <Checkbox name="remove_suffix"
                            value={removeSuffix} label={t("remove_suffix")}
                            onChange={this.RemoveSuffix}
                        />
                    </>
            }

            <div className="notification_setting_options">
                <button type="submit" className="notification_setting_option">{t("save")}</button>
            </div>
        </form>;
    }
}

export default withTranslation()(NotificationSetting);