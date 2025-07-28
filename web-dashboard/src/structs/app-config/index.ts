const ADMINS = process.env["ADMINS"] || "";

export const getDefaultAdmins = () => ADMINS.split(/,/g);

export interface UserAppConfig {
    defaultJoinSuffix: string;
    defaultLeaveSuffix: string;
    defaultVoiceModel: string;
}

export const createEmptyUserAppConfig = (): UserAppConfig =>
({
    defaultJoinSuffix: "",
    defaultLeaveSuffix: "",
    defaultVoiceModel: "",
});

export const rebuildUserAppConfig = (appConfig: UserAppConfig): UserAppConfig => {
    const { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModel } = appConfig;
    return { defaultJoinSuffix, defaultLeaveSuffix, defaultVoiceModel };
}

export interface AdminAppConfig extends UserAppConfig {
    ttsRegion: string;
    ttsApiKey: string;
    admins: string[]
}

export const createEmptyAdminAppConfig = (): AdminAppConfig =>
({
    ...createEmptyUserAppConfig(),
    ttsRegion: "",
    ttsApiKey: "",
    admins: getDefaultAdmins()
});

export type AppConfig = UserAppConfig | AdminAppConfig;

export const isAdminAppConfig = (config: AppConfig): config is AdminAppConfig => "admins" in config;