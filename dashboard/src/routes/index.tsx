import { toast } from "Sonner";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import api from "#/api";
import { useLoader } from "#/components/global/loader";
import { useProfile } from "#/components/global/profile";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
    const loader = useLoader();
    const { request, run } = useProfile();

    useEffect(() => {
        if (request.status === "idle") {
            const loading = loader.append();
            const load = run(api.retrieveProfile()).finally(() => {
                loading.remove();
            });
            toast.promise(load, {});
        }
    }, [loader, request, run]);

    switch (request.status) {
        case "idle": {
            return "";
        }
        case "error": {
            return <div>{request.error}</div>;
        }
        case "loading": {
            return <div>Loading...</div>;
        }
    }

    return <div></div>;
}
