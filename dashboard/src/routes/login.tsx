import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import type { DiscordLoginResult } from "#/api/authorization";

export const Route = createFileRoute("/login")({ component: Login });

function Content() {
    useEffect(() => {
        const parentWindow: Window = window.opener;

        if (parentWindow) {
            const search = new URLSearchParams(location.search);

            const code = search.get("code") || "";
            const error = search.get("error") || "";
            const state = search.get("state") || "";
            const name = window.name;

            const success = !!code;

            const result: DiscordLoginResult = success
                ? { success, code, state, name }
                : { success, error, state, name };

            parentWindow.postMessage(result, window.location.origin);
        } else {
            window.location.replace(import.meta.env.BASE_URL);
        }
    }, []);

    return null;
}

function Login() {
    return (
        <ClientOnly>
            <Content />
        </ClientOnly>
    );
}
