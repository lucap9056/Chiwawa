"use client";
import { useEffect } from "react";
import { DiscordLoginResult } from "app-pages/global-services/api";

export default function Home() {

    useEffect(() => {
        const parentWindow: Window = window.opener;

        if (parentWindow) {
            const search = new URLSearchParams(location.search);

            const code = search.get("code");
            const err = search.get("error");

            const success = !!code;

            const result: DiscordLoginResult = (success) ?
                { success, code } :
                { success, error: new Error(err || "") }

            parentWindow.postMessage(result);

            window.close();
        }

    }, []);

    return <></>
}
