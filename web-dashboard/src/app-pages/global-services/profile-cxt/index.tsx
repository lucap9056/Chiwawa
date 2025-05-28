"use client";
import { AppInfo, Profile, UserInfo } from "structs/profile";
import React, { createContext, useContext } from "react";
import { UserConfig } from "structs/user-config";
import { DiscordGuild } from "structs/discord";

interface Props {
    profile: Profile,
    children: React.ReactNode
}

interface ProfileFuncs {
    getAppInfo: () => AppInfo
    getUserInfo: () => UserInfo
    getGuilds: () => DiscordGuild[]
    setUserConfig: (config: UserConfig) => void
}

const ProfileContext = createContext<ProfileFuncs | null>(null);


export const useProfile = (): ProfileFuncs => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within an ProfileProvider.");
    }
    return context;
}

export const ProfileProvider: React.FC<Props> = ({ profile, children }) => {

    const getAppInfo = () => profile.appInfo;
    const getUserInfo = () => profile.userInfo;

    const getGuilds = (): DiscordGuild[] => profile.userInfo.guilds.filter(g => profile.userInfo.config.guilds[g.id]);

    const setUserConfig = (config: UserConfig) => { profile.userInfo = { ...profile.userInfo, config }; };

    return <ProfileContext.Provider value={{ getAppInfo, getUserInfo, getGuilds, setUserConfig }}>{children}</ProfileContext.Provider>
}