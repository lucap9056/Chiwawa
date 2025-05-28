"use client";
import React, { createContext, useContext } from "react";
import { GetGuildMember } from "server/profile";

import { DiscordGuildMember } from "structs/discord";
import { RsResult } from "structs/rs-result";

export interface GuildsMember {
    getMember: (guildId: string) => Promise<RsResult<DiscordGuildMember>> | undefined
    loadMember: (guildId: string) => Promise<RsResult<DiscordGuildMember>>
}

const GuildsMemberContext = createContext<GuildsMember | null>(null);

export const useGuildsMember = (): GuildsMember => {
    const context = useContext(GuildsMemberContext);
    if (!context) {
        throw new Error("useGuildsMember must be used within an GuildsMemberProvider.");
    }
    return context;
}

export const GuildsMemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const guildsMember: Map<string, Promise<RsResult<DiscordGuildMember>>> = new Map();

    const getMember = (guildId: string) => guildsMember.get(guildId);

    const loadMember = async (guildId: string): Promise<RsResult<DiscordGuildMember>> => {
        const request = GetGuildMember(guildId);
        guildsMember.set(guildId, request);
        return request;
    }

    return <GuildsMemberContext.Provider value={{ getMember, loadMember }}>{children}</GuildsMemberContext.Provider>
}