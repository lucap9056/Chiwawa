import type React from "react";
import { createContext, useContext, useRef } from "react";
import type { Result } from "resultant.js/rustify";
import api from "#/api";
import type { ErrorCode } from "#/errors";
import type { DiscordGuildMember } from "#/services/oauth2-provider";

export interface GuildsMember {
    getMember: (guildId: string) => Promise<Result<DiscordGuildMember, ErrorCode>> | undefined;
    loadMember: (guildId: string) => Promise<Result<DiscordGuildMember, ErrorCode>>;
}

const GuildsMemberContext = createContext<GuildsMember | null>(null);

export const useGuildsMember = (): GuildsMember => {
    const context = useContext(GuildsMemberContext);
    if (!context) {
        throw new Error("useGuildsMember must be used within a GuildsMemberProvider.");
    }
    return context;
};

export const GuildsMemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const guildsMember = useRef<Map<string, Promise<Result<DiscordGuildMember, ErrorCode>>>>(new Map());

    const getMember = (guildId: string) => guildsMember.current.get(guildId);

    const loadMember = async (guildId: string): Promise<Result<DiscordGuildMember, ErrorCode>> => {
        const request = api.getGuildMember(guildId);
        guildsMember.current.set(guildId, request);
        return request;
    };

    return <GuildsMemberContext.Provider value={{ getMember, loadMember }}>{children}</GuildsMemberContext.Provider>;
};
