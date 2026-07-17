import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Err, Ok } from "resultant.js/rustify";
import { Toaster, toast } from "sonner";
import api from "#/api";
import { Dashboard } from "#/components/dashboard";
import { LoaderProvider, useLoader } from "#/components/global/loader";
import { ProfileProvider, useProfile } from "#/components/global/profile";
import { Retry } from "#/components/global/profile/retry";
import { TTSProvider, useTTS } from "#/components/global/tts";
import { Unauthenticated } from "#/components/unauthenticated";
import { type ErrorCode, isUnauthenticated } from "#/errors";
import type { Profile } from "#/server/profile";
import { DEFAULT_LANGUAGES, type Languages, resolveDefaultVoiceModel } from "#/services/microsoft-tts";

type ProfileOutcome = { status: "success"; profile: Profile } | { status: "error"; error: ErrorCode };

interface LoaderData {
    profileOutcome: ProfileOutcome;
    // Raw catalog, independent of whether the profile fetch itself succeeded — resolving
    // it against a defaultVoiceModel happens in Body() using the live profile, not here.
    languages: Languages;
}

export const Route = createFileRoute("/")({
    loader: async (): Promise<LoaderData> => {
        const [profileResult, voiceModelsResult] = await Promise.all([api.retrieveProfile(), api.getVoiceModels()]);

        const profileOutcome: ProfileOutcome = profileResult.isOk()
            ? { status: "success", profile: profileResult.unwrap() }
            : { status: "error", error: profileResult.unwrapErr() };

        return { profileOutcome, languages: voiceModelsResult.unwrapOr(DEFAULT_LANGUAGES) };
    },
    component: Home,
});

function Content() {
    const { t } = useTranslation();
    const loader = useLoader();
    const { profile } = useProfile();
    const tts = useTTS();

    useEffect(() => {
        if (tts.loaded) return;

        const loading = loader.append();
        const loadingToast = toast.loading(t("app.initializing"));

        return () => {
            loading.remove();
            toast.dismiss(loadingToast);
        };
    }, [tts.loaded, loader, t]);

    return <Dashboard profile={profile} />;
}

// Reads the live profile context (not the SSR loader's snapshot) so a successful
// login/retry after an unauthenticated SSR render switches straight to Content.
// TTSProvider only mounts once profile status is "success", so TTS never loads
// for a profile that ended up in an error/unauthenticated state.
function Body() {
    const { profile, request } = useProfile();
    const { languages } = Route.useLoaderData();

    if (request.status === "error") {
        return isUnauthenticated(request.error) ? <Unauthenticated /> : <Retry initialError={request.error} />;
    }

    return (
        <TTSProvider
            defaultVoiceModel={profile.appConfig.defaultVoiceModel}
            initialLanguages={resolveDefaultVoiceModel(languages, profile.appConfig.defaultVoiceModel)}
        >
            <Content />
        </TTSProvider>
    );
}

function Home() {
    const { profileOutcome } = Route.useLoaderData();
    const profileResult =
        profileOutcome.status === "success"
            ? Ok<Profile, ErrorCode>(profileOutcome.profile)
            : Err<Profile, ErrorCode>(profileOutcome.error);

    return (
        <ProfileProvider initialResult={profileResult}>
            <ClientOnly>
                <LoaderProvider>
                    <Body />
                    <Toaster
                        position="bottom-left"
                        richColors
                        expand
                        toastOptions={{ style: { background: "#edcca8", color: "#432b1f" } }}
                    />
                </LoaderProvider>
            </ClientOnly>
        </ProfileProvider>
    );
}
