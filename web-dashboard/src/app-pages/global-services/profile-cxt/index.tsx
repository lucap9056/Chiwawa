"use client";
import { AppInfo, Profile, UserInfo } from "structs/profile";
import React, { createContext, useCallback, useContext, useState } from "react";
import { SpeechNotice } from "structs/user-config";
import { DiscordGuild } from "structs/discord";
import { AdminAppConfig } from "structs/app-config";

interface Props {
    profile: Profile,
    children: React.ReactNode
}

interface ProfileFuncs {
    getAppInfo: () => AppInfo
    getUserInfo: () => UserInfo
    getGuilds: () => DiscordGuild[]
    updateAppConfig: (config: AdminAppConfig) => void
    updateSpeechNotice: (speechNotice: SpeechNotice, guildId?: string) => void
}

const ProfileContext = createContext<ProfileFuncs | null>(null);


export const useProfile = (): ProfileFuncs => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within an ProfileProvider.");
    }
    return context;
}

export const ProfileProvider: React.FC<Props> = ({ children, ...props }) => {
    const [profile, setProfile] = useState<Profile>(props.profile);

    const getAppInfo = (): AppInfo => ({ ...profile.appInfo });
    const getUserInfo = (): UserInfo => ({ ...profile.userInfo });

    const getGuilds = (): DiscordGuild[] => profile.userInfo.guilds.filter(g => profile.userInfo.config.guilds[g.id]);

    const updateAppConfig = (config: AdminAppConfig) => {
        setProfile(({ appInfo, ...p }) => ({
            ...p,
            appInfo: {
                ...appInfo,
                config
            }
        }
        ));
    }

    const updateSpeechNotice = useCallback((speechNotice: SpeechNotice, guildId?: string) => {
        setProfile((p) => {
            const config = { ...p.userInfo.config };

            if (guildId) {
                config.guilds = {
                    ...config.guilds,
                    [guildId]: speechNotice,
                };
            } else {
                config.global = speechNotice;
            }

            return {
                ...p,
                userInfo: {
                    ...p.userInfo,
                    config,
                },
            };
        });
    }, []);

    return <ProfileContext.Provider value={{ getAppInfo, getUserInfo, getGuilds, updateAppConfig, updateSpeechNotice }}>{children}</ProfileContext.Provider>
}