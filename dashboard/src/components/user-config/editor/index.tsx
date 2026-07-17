import { toast } from "Sonner";
import * as Collapsible from "@radix-ui/react-collapsible";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { match, None, Option, Some } from "resultant.js/rustify";
import api from "#/api";
import Switch from "#/components/form/switch";
import { type GuildsMember, useGuildsMember } from "#/components/global/guilds-member";
import { useLoader } from "#/components/global/loader";
import { useTTS, type VoiceModel } from "#/components/global/tts";
import VoiceModelSelector from "#/components/voice-model-selector";
import { ErrorCode } from "#/errors";
import type { MessageTemplate, SpeechNotice } from "#/models";
import type { Profile } from "#/server/profile";
import type { DiscordGuild, DiscordGuildMember, DiscordUser } from "#/services/oauth2-provider";
import styles from "./style.module.scss";

const getGuild = (guilds: DiscordGuild[], guildId: string = ""): Option<DiscordGuild> =>
    new Option(guilds.find((g) => g.id === guildId));

const getGlobalDisplayName = (user: DiscordUser) => user.global_name || user.username;

const createEmptyMessage = (): MessageTemplate => ({ prefix: "", content: "", suffix: "" });

const createEmptySpeechNotice = (inheritGlobal: boolean): SpeechNotice => ({
    inheritGlobal,
    muted: false,
    joinMessage: createEmptyMessage(),
    leaveMessage: createEmptyMessage(),
});

const getJoinMessage = (s: SpeechNotice): MessageTemplate => {
    const m = s.joinMessage ?? createEmptyMessage();
    return { ...m, suffix: (m.suffix || "").trim() };
};

const getLeaveMessage = (s: SpeechNotice): MessageTemplate => {
    const m = s.leaveMessage ?? createEmptyMessage();
    return { ...m, suffix: (m.suffix || "").trim() };
};

const isSimpleSpeechNotice = (s: SpeechNotice) => {
    const join = s.joinMessage ?? createEmptyMessage();
    const leave = s.leaveMessage ?? createEmptyMessage();
    return (
        leave.content === "" &&
        join.prefix === "" &&
        join.prefix === leave.prefix &&
        (join.suffix === "" || join.suffix === undefined) &&
        join.suffix === leave.suffix
    );
};

const isRemovedSuffix = (s: SpeechNotice) => {
    const join = s.joinMessage ?? createEmptyMessage();
    const leave = s.leaveMessage ?? createEmptyMessage();
    return join.suffix === undefined && (isSimpleSpeechNotice(s) || leave.suffix === undefined);
};

const getGuildMemberOption = async (
    guildsMember: GuildsMember,
    guild: Option<DiscordGuild>,
): Promise<Option<DiscordGuildMember>> =>
    match(
        guild.map((g) => g.id),
        {
            async Some(guildId) {
                const result = await (guildsMember.getMember(guildId) || guildsMember.loadMember(guildId));
                return match(result, {
                    Ok: (member) => Some(member),
                    Err: (error) => {
                        console.error("Failed to fetch guild member:", error);
                        return None<DiscordGuildMember>();
                    },
                });
            },
            async None() {
                return None<DiscordGuildMember>();
            },
        },
    );

const getDisplayName = async (
    guildsMember: GuildsMember,
    user: DiscordUser,
    guild: Option<DiscordGuild>,
): Promise<string> => {
    const member = await getGuildMemberOption(guildsMember, guild);
    return match(member, {
        Some: ({ nick, user: memberUser }) => nick || memberUser.global_name || memberUser.username,
        None: () => getGlobalDisplayName(user),
    });
};

interface Props {
    profile: Profile;
}

const Editor: React.FC<Props> = ({ profile }) => {
    const { t } = useTranslation();
    const tts = useTTS();
    const loader = useLoader();
    const guildsMember = useGuildsMember();

    const { guildId } = useParams();
    const guild = getGuild(profile.guilds, guildId);

    const [isLoaded, setIsLoaded] = useState(false);
    const [speechNotice, setSpeechNotice] = useState<SpeechNotice>(() => createEmptySpeechNotice(!!guildId));
    const [displayName, setDisplayName] = useState<string>(getGlobalDisplayName(profile.user));

    const [advancedSpeechNotice, setIsAdvancedSpeechNotice] = useState(false);
    const [removeSuffix, setRemoveSuffix] = useState(false);
    const [joinMessage, setJoinMessage] = useState<MessageTemplate>(createEmptyMessage());
    const [leaveMessage, setLeaveMessage] = useState<MessageTemplate>(createEmptyMessage());

    const { defaultJoinSuffix, defaultLeaveSuffix } = profile.appConfig;

    // biome-ignore lint/correctness/useExhaustiveDependencies: only refetch on guildId — `guild` is a fresh Option every render (would loop)
    useEffect(() => {
        const loading = loader.append();

        setIsLoaded(false);
        tts.awaitLoaded().finally(async () => {
            loading.remove();

            const [name, noticeResult] = await Promise.all([
                getDisplayName(guildsMember, profile.user, guild),
                api.getUserSpeechNotice(guildId),
            ]);

            const s = match(noticeResult, {
                Ok: (n) => n,
                Err: (err) => {
                    if (err !== ErrorCode.DATABASE_NOT_FOUND) {
                        console.error("Failed to fetch speech notice:", err);
                        toast.error(err);
                    }
                    return createEmptySpeechNotice(!!guildId);
                },
            });

            setSpeechNotice(s);
            setIsAdvancedSpeechNotice(!isSimpleSpeechNotice(s));
            setRemoveSuffix(isRemovedSuffix(s));
            setJoinMessage(getJoinMessage(s));
            setLeaveMessage(getLeaveMessage(s));

            setDisplayName(name);
            setIsLoaded(true);
        });
    }, [guildId]);

    if (!isLoaded) {
        return (
            <div className={styles.speech_notice}>
                <span className={styles.loader} />
            </div>
        );
    }

    const save = async () => {
        const updatedSpeechNotice: SpeechNotice = advancedSpeechNotice
            ? {
                  ...speechNotice,
                  joinMessage: {
                      ...joinMessage,
                      suffix: removeSuffix ? undefined : (joinMessage.suffix || "").replace(/ {2,}/, " "),
                  },
                  leaveMessage: {
                      ...leaveMessage,
                      suffix: removeSuffix ? undefined : (leaveMessage.suffix || "").replace(/ {2,}/, " "),
                  },
              }
            : {
                  ...speechNotice,
                  joinMessage: { ...joinMessage, prefix: "", suffix: removeSuffix ? undefined : "" },
                  leaveMessage: { ...createEmptyMessage(), suffix: removeSuffix ? undefined : "" },
              };

        const request = api.updateUserSpeechNotice(updatedSpeechNotice, guildId);
        const id = toast.promise(request, { loading: t("app.saving") }) as string;
        const result = await request;

        match(result, {
            Ok: () => {
                setSpeechNotice(updatedSpeechNotice);
                toast.success(t("app.saved"), { id });
            },
            Err: (error) => {
                console.error("Failed to save speech notice:", error);
                toast.error(t("app.save-failed"), { id });
            },
        });
    };

    const isLeaveMessage = (input: HTMLInputElement) => input.dataset.msg === "leave";

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
    };

    const updateContent = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const content = input.value;

        if (isLeaveMessage(input)) {
            setLeaveMessage({ ...leaveMessage, content });
        } else {
            setJoinMessage({ ...joinMessage, content });
        }
    };

    const updateSuffix = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const suffix = input.value;

        if (isLeaveMessage(input)) {
            setLeaveMessage({ ...leaveMessage, suffix });
        } else {
            setJoinMessage({ ...joinMessage, suffix });
        }
    };

    const updateJoinVoiceModel = (v: VoiceModel) => {
        setJoinMessage({ ...joinMessage, voiceModel: v.DisplayName, language: v.Locale });
    };

    const updateLeaveVoiceModel = (v: VoiceModel) => {
        setLeaveMessage({ ...leaveMessage, voiceModel: v.DisplayName, language: v.Locale });
    };

    const getJoinMessageText = () => {
        const { prefix, content, suffix } = joinMessage;

        if (!advancedSpeechNotice) {
            return (content || displayName) + (removeSuffix ? "" : defaultJoinSuffix);
        }

        return prefix + (content || displayName) + (removeSuffix ? "" : suffix || defaultJoinSuffix);
    };

    const getLeaveMessageText = () => {
        const prefix = leaveMessage.prefix || joinMessage.prefix;
        const content = leaveMessage.content || joinMessage.content || displayName;
        const suffix = removeSuffix ? "" : leaveMessage.suffix || joinMessage.suffix || defaultLeaveSuffix;
        return prefix + content + suffix;
    };

    return (
        <div className={styles.speech_notice}>
            <div className={styles.guild_info}>
                <div>{guild.map((g) => g.name).unwrapOr(t("userconfig.global"))}</div>
            </div>
            {guild.isSome() && (
                <>
                    <Switch
                        key={guild.unwrap().id}
                        label={t("userconfig.inherit-global")}
                        value={speechNotice.inheritGlobal}
                        onChange={setInheritGlobal}
                    />
                    <hr />
                </>
            )}

            {(!speechNotice.inheritGlobal || guild.isNone()) && (
                <>
                    <Switch label={t("userconfig.mute")} value={speechNotice.muted} onChange={setMute} />
                    <hr />
                    {!speechNotice.muted && (
                        <>
                            <Switch
                                label={t("userconfig.advanced-mode")}
                                value={advancedSpeechNotice}
                                onChange={setIsAdvancedSpeechNotice}
                            />
                            <hr />

                            <div className={styles.message}>
                                {advancedSpeechNotice && (
                                    <input
                                        type="text"
                                        className={styles.prefix}
                                        defaultValue={joinMessage.prefix}
                                        onChange={updatePrefix}
                                    />
                                )}
                                <input
                                    type="text"
                                    className={styles.content}
                                    placeholder={displayName}
                                    defaultValue={joinMessage.content}
                                    onChange={updateContent}
                                />
                                {advancedSpeechNotice && !removeSuffix && (
                                    <input
                                        type="text"
                                        className={styles.suffix}
                                        placeholder={defaultJoinSuffix}
                                        defaultValue={joinMessage.suffix}
                                        onChange={updateSuffix}
                                    />
                                )}
                            </div>
                            <VoiceModelSelector
                                message={getJoinMessageText()}
                                currentLanguage={joinMessage.language}
                                currentVoiceModel={joinMessage.voiceModel}
                                onChange={updateJoinVoiceModel}
                            />

                            <Collapsible.Root open={advancedSpeechNotice}>
                                <Collapsible.Content className={styles.advanced}>
                                    <div className={styles.message}>
                                        <input
                                            type="text"
                                            className={styles.prefix}
                                            placeholder={joinMessage.prefix}
                                            defaultValue={leaveMessage.prefix}
                                            data-msg="leave"
                                            onChange={updatePrefix}
                                        />
                                        <input
                                            type="text"
                                            className={styles.content}
                                            placeholder={joinMessage.content || displayName}
                                            defaultValue={leaveMessage.content}
                                            data-msg="leave"
                                            onChange={updateContent}
                                        />
                                        {!removeSuffix && (
                                            <input
                                                type="text"
                                                className={styles.suffix}
                                                placeholder={joinMessage.suffix || defaultLeaveSuffix}
                                                defaultValue={leaveMessage.suffix}
                                                data-msg="leave"
                                                onChange={updateSuffix}
                                            />
                                        )}
                                    </div>
                                    <VoiceModelSelector
                                        message={getLeaveMessageText()}
                                        currentLanguage={leaveMessage.language}
                                        currentVoiceModel={leaveMessage.voiceModel}
                                        onChange={updateLeaveVoiceModel}
                                    />
                                </Collapsible.Content>
                            </Collapsible.Root>

                            <Switch
                                label={t("userconfig.remove-suffix")}
                                value={removeSuffix}
                                onChange={setRemoveSuffix}
                            />
                            <hr />
                        </>
                    )}
                </>
            )}

            <div className={styles.options}>
                <button type="button" className={styles.option} onClick={save}>
                    {t("app.save")}
                </button>
            </div>
        </div>
    );
};

export default Editor;
