"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";


import { GuildsMember, useGuildsMember } from "app-pages/global-services/guilds-member";
import { useProfile } from "app-pages/global-services/profile-cxt";

import { UserInfo } from "structs/profile";
import { DiscordGuild } from "structs/discord";
import { createEmptyMessage, MessageTemplate, SpeechNotice, UserConfig } from "structs/user-config";

import Toggle from "app-pages/global-components/form/toggle";
import VoiceSelector from "app-pages/root/components/home/user-config/editor/voice-selector";
import { useTTS, Voice } from "app-pages/global-services/tts";

import styles from "app-pages/root/components/home/user-config/editor/style.module.scss";
import { UpdateUserConfig } from "server/profile";
import { useLoader } from "app-pages/global-components/loader";
import { useNotifications } from "app-pages/global-components/notifications";
import { Message } from "app-pages/global-structs/message";
import { getOrThrow } from "structs/rs-result";


const getGuild = ({ guilds }: UserInfo, guildId: string = ""): DiscordGuild | undefined => guilds.find((g: DiscordGuild) => g.id === guildId);

const getGlobalDisplayName = ({ user }: UserInfo) => user.global_name || user.username;

const getSpeechNotice = ({ config }: UserInfo, guild?: DiscordGuild) => guild ? config.guilds[guild.id] : config.global;

const getJoinMessage = ({ joinMessage }: SpeechNotice): MessageTemplate => ({ ...joinMessage, suffix: (joinMessage.suffix || "").trim() });

const getLeaveMessage = ({ leaveMessage }: SpeechNotice): MessageTemplate => ({ ...leaveMessage, suffix: (leaveMessage.suffix || "").trim() });

const isSimpleSpeechNotice = (s: SpeechNotice) => (
    s.leaveMessage.content === ""
    && s.joinMessage.prefix === ""
    && s.joinMessage.prefix === s.leaveMessage.prefix
    && (s.joinMessage.suffix === "" || s.joinMessage.suffix === undefined)
    && s.joinMessage.suffix === s.leaveMessage.suffix
);

const isRemovedSuffix = (s: SpeechNotice) => s.joinMessage.suffix === undefined && (isSimpleSpeechNotice(s) || s.leaveMessage.suffix === undefined);

const getGuildName = (guild?: DiscordGuild): string | undefined => guild ? guild.name : undefined;

const getDisplayName = async (guildsMember: GuildsMember, userInfo: UserInfo, guild?: DiscordGuild): Promise<string> => {
    try {
        if (guild) {
            const getGuildMember = guildsMember.getMember(guild.id);

            const guildMember = (getGuildMember) ?
                await getGuildMember :
                await guildsMember.loadMember(guild.id);

            const { nick, user } = getOrThrow(guildMember);

            return nick || user.global_name || user.username;
        }
    }
    catch { }
    return getGlobalDisplayName(userInfo);
}

const Editor: React.FC = () => {
    const { t } = useTranslation();
    const tts = useTTS();
    const loader = useLoader();
    const notifications = useNotifications();
    const guildsMember = useGuildsMember();
    const { getAppInfo, getUserInfo, setUserConfig } = useProfile();

    const userInfo = getUserInfo();

    const [isLoaded, setIsLoaded] = useState(false);
    const [speechNotice, setSpeechNotice] = useState<SpeechNotice>(getSpeechNotice(userInfo));
    const [displayName, setDisplayName] = useState<string>(getGlobalDisplayName(userInfo));

    const [advancedSpeechNotice, setIsAadvancedSpeechNotice] = useState(!isSimpleSpeechNotice(speechNotice));
    const [removeSuffix, setRemoveSuffix] = useState(isRemovedSuffix(speechNotice));
    const [joinMessage, setJoinMessage] = useState(getJoinMessage(speechNotice));
    const [leaveMessage, setLeaveMessage] = useState(getLeaveMessage(speechNotice));

    const { guildId } = useParams();
    const guild = getGuild(userInfo, guildId);

    const { defaultJoinSuffix, defaultLeaveSuffix } = getAppInfo();

    useEffect(() => {
        const loading = loader.append();

        setIsLoaded(false);
        tts.awaitLoaded().finally(async () => {
            loading.remove();

            const s = getSpeechNotice(userInfo, guild);
            setSpeechNotice(s);
            setIsAadvancedSpeechNotice(!isSimpleSpeechNotice(s));
            setRemoveSuffix(isRemovedSuffix(s));
            setJoinMessage(getJoinMessage(s));
            setLeaveMessage(getLeaveMessage(s));

            const name = await getDisplayName(guildsMember, userInfo, guild);

            setDisplayName(name);
            setIsLoaded(true);

        });



    }, [guildId]);

    if (!isLoaded || !speechNotice) return <div className={styles.speech_notice}><span className={styles.loader}></span></div>;

    const save = () => {

        const updatedSpeechNotice: SpeechNotice = advancedSpeechNotice ? {
            ...speechNotice,
            joinMessage: { ...joinMessage, suffix: removeSuffix ? undefined : (joinMessage.suffix || "").replace(/  */, ' ') },
            leaveMessage: { ...leaveMessage, suffix: removeSuffix ? undefined : (leaveMessage.suffix || "").replace(/  */, ' ') }
        } : {
            ...speechNotice,
            joinMessage: { ...joinMessage, prefix: "", suffix: removeSuffix ? undefined : "" },
            leaveMessage: createEmptyMessage()
        };

        const updatedConfig: UserConfig = (guild) ?
            {
                ...userInfo.config,
                guilds: {
                    ...userInfo.config.guilds,
                    [guild.id]: updatedSpeechNotice
                }
            } :
            {
                ...userInfo.config,
                global: updatedSpeechNotice
            };


        const loading = loader.append();

        const saving = notifications.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("app.saving")
            })
        );

        UpdateUserConfig(updatedConfig).then(getOrThrow)
            .then(() => {

                notifications.append(
                    new Message({
                        type: Message.Type.NORMAL,
                        content: t("app.saved")
                    })
                );

            })
            .catch(() => {

                notifications.append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: t("app.save-failed")
                    })
                );

            })
            .finally(() => {
                setUserConfig(updatedConfig);
                loading.remove();
                saving.remove();
            })

    }

    const isLeaveMessage = (input: HTMLInputElement) => input.dataset["msg"] === "leave";

    const setInheritGlobal = (inheritGlobal: boolean) => setSpeechNotice({ ...speechNotice, inheritGlobal });

    const setMute = (muted: boolean) => setSpeechNotice({ ...speechNotice, muted });

    const updatePrefix = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const prefix = input.value;

        if (isLeaveMessage(input)) {
            setLeaveMessage({ ...leaveMessage, prefix });
        } else {
            setJoinMessage({ ...joinMessage, prefix });
        }
    }

    const updateContent = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const content = input.value;

        if (isLeaveMessage(input)) {
            setLeaveMessage({ ...leaveMessage, content });
        } else {
            setJoinMessage({ ...joinMessage, content });
        }
    }

    const updateSuffix = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const suffix = input.value;

        if (isLeaveMessage(input)) {
            setLeaveMessage({ ...leaveMessage, suffix });
        } else {
            setJoinMessage({ ...joinMessage, suffix });
        }
    }

    const updateJoinVoiceModule = (v: Voice) => {
        const voice = v.DisplayName;
        const language = v.Locale;
        setJoinMessage({ ...joinMessage, voice, language });
    }

    const updateLeaveVoiceModule = (v: Voice) => {
        const voice = v.DisplayName;
        const language = v.Locale;
        setLeaveMessage({ ...leaveMessage, voice, language });
    }

    const getJoinMessageText = () => {
        const { prefix, content, suffix } = joinMessage;

        if (!advancedSpeechNotice) {
            return (content || displayName) + (removeSuffix ? "" : defaultJoinSuffix);
        }

        return prefix + (content || displayName) + (removeSuffix ? "" : suffix || defaultJoinSuffix);
    }

    const getLeaveMessageText = () => {
        const prefix = leaveMessage.prefix || joinMessage.prefix;
        const content = leaveMessage.content || joinMessage.content || displayName;
        const suffix = removeSuffix ? "" : leaveMessage.suffix || joinMessage.suffix || defaultLeaveSuffix;
        return prefix + content + suffix;
    }

    return <div className={styles.speech_notice}>
        <div className={styles.guild_info}>
            <div className={styles.guild_name}>{getGuildName(guild) || t("userconfig.global")}</div>
        </div>
        {guild && <>
            <Toggle key={guild.id} label={t("userconfig.inherit-global")} value={speechNotice.inheritGlobal} onChange={setInheritGlobal} />
            <hr />
        </>
        }

        {(!speechNotice.inheritGlobal || !guild) && <>
            <Toggle label={t("userconfig.mute")} value={speechNotice.muted} onChange={setMute} />
            <hr />
            {!speechNotice.muted && <>
                <Toggle label={t("userconfig.advanced-mode")} value={advancedSpeechNotice} onChange={setIsAadvancedSpeechNotice} />
                <hr />

                <div className={styles.message}>
                    {advancedSpeechNotice && <input type="text" className={styles.prefix} defaultValue={joinMessage.prefix} onChange={updatePrefix} />}
                    <input type="text" className={styles.content} placeholder={displayName} defaultValue={joinMessage.content} onChange={updateContent} />
                    {advancedSpeechNotice && !removeSuffix && <input type="text" className={styles.suffix} placeholder={defaultJoinSuffix} defaultValue={joinMessage.suffix} onChange={updateSuffix} />}
                </div>
                <VoiceSelector message={getJoinMessageText()} onChange={updateJoinVoiceModule} />
                {advancedSpeechNotice && <>
                    <div className={styles.message}>
                        <input type="text" className={styles.prefix} placeholder={joinMessage.prefix} defaultValue={leaveMessage.prefix} data-msg="leave" onChange={updatePrefix} />
                        <input type="text" className={styles.content} placeholder={joinMessage.content || displayName} defaultValue={leaveMessage.content} data-msg="leave" onChange={updateContent} />
                        {!removeSuffix && <input type="text" className={styles.suffix} placeholder={joinMessage.suffix || defaultLeaveSuffix} defaultValue={leaveMessage.suffix} data-msg="leave" onChange={updateSuffix} />}
                    </div>
                    <VoiceSelector message={getLeaveMessageText()} onChange={updateLeaveVoiceModule} />
                </>}

                <Toggle label={t("userconfig.remove-suffix")} value={removeSuffix} onChange={setRemoveSuffix} />
                <hr />
            </>
            }
        </>
        }

        <div className={styles.options}>
            <button className={styles.option} onClick={save}>{t("app.save")}</button>
        </div>
    </div>
}

export default () => {
    const { guildId } = useParams();
    return <Editor key={guildId || "0"} />;
};