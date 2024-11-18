import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { AppInfo, User } from "@services/chiwawaAPI";

import { MessageTemplate, Notification } from "@utils/Notifications";
import { DiscordGuild } from "@utils/discordUser";
import { Message } from "@utils/message";
import TTS from "@utils/microsoftTTS";

import NotificationSetting from "./NotificationSetting";

import { loadingManager } from "@components/Loading";
import { messageManager } from "@components/Messages";
import { alertsManager } from "@components/Alerts";

import "./style.css";
import { useTranslation } from "react-i18next";

interface Props {
    tts: TTS
    user: User
}

const GuildSetting: React.FC<Props> = ({ tts, user }) => {
    const { t } = useTranslation();
    const { guildId } = useParams();
    const [guild, SetGuild] = useState<DiscordGuild>();
    const [userName, SetUserName] = useState(user.global_name);
    const [currentNotification, SetCurrentNotification] = useState<Notification>();

    useEffect(() => {
        SetCurrentNotification(null);
        (async () => {

            const loading = loadingManager.Append();

            if (guildId && !user.guildMemberNames[guildId]) {
                try {
                    const member = await user.GetGuildMe(guildId);
                    const userName = member.nick || member.user.global_name || member.user.username;
                    user.guildMemberNames[guildId] = userName;
                }
                catch {

                }
            }
            SetUserName(user.guildMemberNames[guildId] || user.global_name);

            const discordGuild: DiscordGuild | undefined = guildId ? user.guilds.map[guildId] || undefined : undefined;
            SetGuild(discordGuild);

            const { guildSettings, globalSettings } = user.notifications;

            const notification = guildId ?
                guildSettings[guildId] || Notification.Empty
                : globalSettings || Notification.Empty;

            SetCurrentNotification(notification);

            loading.Remove();

        })();

    }, [guildId]);

    if (!currentNotification) {
        return <div className="notification_setting"></div>;
    }

    const guildName = guild?.name || Notification.Global;

    const Save = async (newNotification: Notification) => {

        const saveAlert = new Message(Message.Type.Alert, t("saving"));
        alertsManager.Append(saveAlert);

        const saving = loadingManager.Append();

        await user.UpdateNotification(newNotification, guildId);

        saving.Remove();
        saveAlert.Remove();

        messageManager.Append(new Message(Message.Type.Alert, t("saved")));
    }

    return <div key={guild?.id || Notification.Global} className="notification_setting">
        <div className="guild_name">{guildName}</div>
        <NotificationSetting tts={tts} userName={userName} guild={guild} originNotification={currentNotification} Save={Save} />
    </div>;
}

export default GuildSetting;