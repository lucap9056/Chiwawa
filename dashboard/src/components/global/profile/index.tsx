import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { matchAsync, type Result } from "resultant.js/rustify";
import type { ErrorCode } from "#/errors";
import type { Profile } from "#/server/profile";

export type ProfileRequestState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success" }
    | { status: "error"; error: ErrorCode };

interface ProfileContextValue {
    profile: Profile | null;
    request: ProfileRequestState;
    run: (result: Promise<Result<Profile, ErrorCode>>) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const useProfile = (): ProfileContextValue => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within a ProfileProvider.");
    }
    return context;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [request, setRequest] = useState<ProfileRequestState>({ status: "idle" });

    const run = useCallback(async (result: Promise<Result<Profile, ErrorCode>>) => {
        setRequest({ status: "loading" });
        await matchAsync(result, {
            Ok: (value) => {
                setProfile(value);
                setRequest({ status: "success" });
            },
            Err: (error) => {
                setRequest({ status: "error", error });
            },
        });
    }, []);

    return <ProfileContext.Provider value={{ profile, request, run }}>{children}</ProfileContext.Provider>;
};
