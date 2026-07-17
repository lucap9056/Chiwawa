import type React from "react";
import { useState } from "react";
import api from "#/api";
import { useProfile } from "#/components/global/profile";
import { Unauthenticated } from "#/components/unauthenticated";
import { type ErrorCode, isUnauthenticated } from "#/errors";
import styles from "./style.module.scss";

type RetryState = { status: "error"; error: ErrorCode } | { status: "unauthenticated" };

const classify = (error: ErrorCode): RetryState =>
    isUnauthenticated(error) ? { status: "unauthenticated" } : { status: "error", error };

interface Props {
    initialError: ErrorCode;
}

export const Retry: React.FC<Props> = ({ initialError }) => {
    const { setResult } = useProfile();
    const [state, setState] = useState<RetryState>(() => classify(initialError));
    const [loading, setLoading] = useState(false);

    const retry = async () => {
        setLoading(true);

        const result = await api.retrieveProfile();
        if (result.isOk()) {
            setResult(result);
            setLoading(false);
            return;
        }

        setState(classify(result.unwrapErr()));
        setLoading(false);
    };

    if (state.status === "unauthenticated") {
        return <Unauthenticated />;
    }

    return (
        <button type="button" className={styles.retry} disabled={loading} onClick={retry}>
            {state.error}
        </button>
    );
};
