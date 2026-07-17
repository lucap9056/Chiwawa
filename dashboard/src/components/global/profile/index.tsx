import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import type { Result } from "resultant.js/rustify";
import type { ErrorCode } from "#/errors";
import type { AppConfig } from "#/models";
import type { Profile } from "#/server/profile";

export type ProfileRequestState = { status: "idle" } | { status: "success" } | { status: "error"; error: ErrorCode };

interface ProfileContextValue {
    profile: Profile;
    request: ProfileRequestState;
    setResult: (result: Result<Profile, ErrorCode>) => void;
    updateAppConfig: (appConfig: AppConfig) => void;
}

const emptyProfile: Profile = {
    isAdmin: false,
    user: { id: "", username: "", discriminator: "", global_name: null, avatar: null },
    guilds: [],
    appConfig: {
        defaultJoinSuffix: "",
        defaultLeaveSuffix: "",
        defaultVoiceModel: "",
        ttsRegion: undefined,
        ttsApiKey: undefined,
        admins: [],
    },
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const useProfile = (): ProfileContextValue => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within a ProfileProvider.");
    }
    return context;
};

export const ProfileProvider: React.FC<{
    children: React.ReactNode;
    initialResult?: Result<Profile, ErrorCode>;
}> = ({ children, initialResult }) => {
    const [profile, setProfile] = useState<Profile>(initialResult?.isOk() ? initialResult.unwrap() : emptyProfile);
    const [request, setRequest] = useState<ProfileRequestState>(
        initialResult === undefined
            ? { status: "idle" }
            : initialResult.isOk()
              ? { status: "success" }
              : { status: "error", error: initialResult.unwrapErr() },
    );

    const setResult = useCallback((result: Result<Profile, ErrorCode>) => {
        if (result.isOk()) {
            setProfile(result.unwrap());
            setRequest({ status: "success" });
            return;
        }
        const error = result.unwrapErr();
        console.error("Profile request failed:", error);
        setRequest({ status: "error", error });
    }, []);

    const updateAppConfig = useCallback((appConfig: AppConfig) => {
        setProfile((p) => ({ ...p, appConfig }));
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, request, setResult, updateAppConfig }}>
            {children}
        </ProfileContext.Provider>
    );
};
