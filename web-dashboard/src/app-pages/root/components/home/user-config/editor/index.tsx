"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import API from "app-pages/global-services/api";
import { GuildsMember, useGuildsMember } from "app-pages/global-services/guilds-member";
import { useProfile } from "app-pages/global-services/profile-cxt";

import { UserInfo } from "structs/profile";
import { DiscordGuild, DiscordGuildMember } from "structs/discord";
import { createEmptyMessage, createEmptySpeechNotice, MessageTemplate, SpeechNotice } from "structs/user-config";

import Toggle from "app-pages/global-components/form/toggle";
import VoiceSelector from "app-pages/root/components/voice-model-selector";
import { useTTS, VoiceModel } from "app-pages/global-services/tts";

import styles from "app-pages/root/components/home/user-config/editor/style.module.scss";
import { useLoader } from "app-pages/global-components/loader";
import { useNotifications } from "app-pages/global-components/notifications";
import { Message } from "app-pages/global-structs/message";
import { match, None, Option, Some } from "resultant.js/rustify";


const getGuild = ({ guilds }: UserInfo, guildId: string = ""): Option<DiscordGuild> => new Option(guilds.find((g: DiscordGuild) => g.id === guildId));

const getGlobalDisplayName = ({ user }: UserInfo) => user.global_name || user.username;

const getSpeechNotice = ({ config }: UserInfo, guild: Option<DiscordGuild>) => guild.map(({ id }) => config.guilds[id]).unwrapOr(createEmptySpeechNotice(true));

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

const getGuildMember = async (guildsMember: GuildsMember, guild: Option<DiscordGuild>): Promise<Option<DiscordGuildMember>> => {
    return match(guild.map(g => g.id), {
        async Some(guildId) {
            const guildMember = await (guildsMember.getMember(guildId) || guildsMember.loadMember(guildId));

            return match(guildMember, {
                Ok(member) {
                    return Some(member);
                },
                Err() {
                    return None<DiscordGuildMember>();
                }
            });

        },
        async None() {
            return None<DiscordGuildMember>();
        },
    });
}

const getDisplayName = async (guildsMember: GuildsMember, userInfo: UserInfo, guild: Option<DiscordGuild>): Promise<string> => {
    const member = await getGuildMember(guildsMember, guild);
    return match(member, {
        Some: ({ nick, user }) => (nick || user.global_name || user.username),
        None: () => getGlobalDisplayName(userInfo),
    });
}



const Editor: React.FC = () => {
    const { t } = useTranslation();
    const tts = useTTS();
    const loader = useLoader();
    const notifications = useNotifications();
    const guildsMember = useGuildsMember();
    const { getAppInfo, getUserInfo, updateSpeechNotice } = useProfile();

    const userInfo = getUserInfo();

    const [isLoaded, setIsLoaded] = useState(false);
    const [speechNotice, setSpeechNotice] = useState<SpeechNotice>(userInfo.config.global);
    const [displayName, setDisplayName] = useState<string>(getGlobalDisplayName(userInfo));

    const [advancedSpeechNotice, setIsAadvancedSpeechNotice] = useState(!isSimpleSpeechNotice(speechNotice));
    const [removeSuffix, setRemoveSuffix] = useState(isRemovedSuffix(speechNotice));
    const [joinMessage, setJoinMessage] = useState(getJoinMessage(speechNotice));
    const [leaveMessage, setLeaveMessage] = useState(getLeaveMessage(speechNotice));

    const { guildId } = useParams();
    const guild = getGuild(userInfo, guildId);

    const { defaultJoinSuffix, defaultLeaveSuffix } = getAppInfo().config;

    useEffect(() => {
        const loading = loader.append();

        setIsLoaded(false);
        tts.awaitLoaded().finally(async () => {
            loading.remove();

            const name = await getDisplayName(guildsMember, userInfo, guild);
            const s = getSpeechNotice(userInfo, guild);
            setSpeechNotice(s);
            setIsAadvancedSpeechNotice(!isSimpleSpeechNotice(s));
            setRemoveSuffix(isRemovedSuffix(s));
            setJoinMessage(getJoinMessage(s));
            setLeaveMessage(getLeaveMessage(s));

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
            leaveMessage: { ...createEmptyMessage(), suffix: removeSuffix ? undefined : "" }
        };

        const loading = loader.append();

        const saving = notifications.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("app.saving")
            })
        );

        API.updateUserSpeechNotice(updatedSpeechNotice, guildId).then((result) => {

            match(result, {
                Ok() {
                    updateSpeechNotice(updatedSpeechNotice, guildId);
                    notifications.append(
                        new Message({
                            type: Message.Type.NORMAL,
                            content: t("app.saved")
                        })
                    );
                },
                Err(err) {
                    console.error(err);
                    notifications.append(
                        new Message({
                            type: Message.Type.ERROR,
                            content: t("app.save-failed")
                        })
                    );
                }
            })

            loading.remove();
            saving.remove();

        });

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

    const updateJoinVoiceModel = (v: VoiceModel) => {
        const voiceModel = v.DisplayName;
        const language = v.Locale;
        setJoinMessage({ ...joinMessage, voiceModel, language });
    }

    const updateLeaveVoiceModel = (v: VoiceModel) => {
        const voiceModel = v.DisplayName;
        const language = v.Locale;
        setLeaveMessage({ ...leaveMessage, voiceModel, language });
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
            <div className={styles.guild_name}>{guild.map(g => g.name).unwrapOr(t("userconfig.global"))}</div>
        </div>
        {guild.isSome() && <>
            <Toggle key={guild.unwrap().id} label={t("userconfig.inherit-global")} value={speechNotice.inheritGlobal} onChange={setInheritGlobal} />
            <hr />
        </>
        }

        {(!speechNotice.inheritGlobal || guild.isNone()) && <>
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
                <VoiceSelector message={getJoinMessageText()} onChange={updateJoinVoiceModel} />
                {advancedSpeechNotice && <>
                    <div className={styles.message}>
                        <input type="text" className={styles.prefix} placeholder={joinMessage.prefix} defaultValue={leaveMessage.prefix} data-msg="leave" onChange={updatePrefix} />
                        <input type="text" className={styles.content} placeholder={joinMessage.content || displayName} defaultValue={leaveMessage.content} data-msg="leave" onChange={updateContent} />
                        {!removeSuffix && <input type="text" className={styles.suffix} placeholder={joinMessage.suffix || defaultLeaveSuffix} defaultValue={leaveMessage.suffix} data-msg="leave" onChange={updateSuffix} />}
                    </div>
                    <VoiceSelector message={getLeaveMessageText()} onChange={updateLeaveVoiceModel} />
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