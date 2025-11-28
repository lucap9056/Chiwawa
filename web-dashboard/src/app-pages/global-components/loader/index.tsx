"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import EventDispatcher from "app-pages/global-structs/event-dispatcher";

import styles from "./style.module.scss";

const LoaderContext = createContext<Loader | null>(null);

const LoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const manager = new Loader();
    return <LoaderContext.Provider value={manager}>{children}</LoaderContext.Provider>;
};

const useLoader = (): Loader => {
    const context = useContext(LoaderContext);
    if (!context) {
        throw new Error("useLoader must be used within an LoaderProvider.");
    }
    return context;
};

export {
    Loader,
    LoaderProvider,
    useLoader
};

class Loading {
    private id: string;
    private state: Loader;

    constructor(id: string, state: Loader) {
        this.id = id;
        this.state = state;
    }

    public remove(): void {
        this.state.removeLoading(this.id);
    }
}

type EventDefinitions = {
    "StateChanged": { detail: boolean }
};

export type LoaderEvent<T extends keyof EventDefinitions> = EventDefinitions[T];

class Loader extends EventDispatcher<EventDefinitions> {

    public static readonly Component: React.FC = () => {
        const manager = useLoader();
        const [isLoading, setLoading] = useState(manager.isLoading);

        useEffect(() => {

            const stateChangedHandler = (e: LoaderEvent<"StateChanged">) => {
                setLoading(e.detail);
            }

            manager.on("StateChanged", stateChangedHandler);

            return () => {
                manager.off("StateChanged", stateChangedHandler);
            }

        }, []);

        return isLoading && <div className={styles.loader}>
            <div className={styles.loader_main}>
                <div className={styles.triangle}></div>
                <div className={styles.line}></div>
                <div className={styles.triangle}></div>
                <div className={styles.line}></div>
                <div className={styles.triangle}></div>
                <div className={styles.line}></div>
                <div className={styles.triangle}></div>
                <div className={styles.line}></div>
            </div>
        </div>
    }

    private loadings: { [loadingId: string]: Loading } = {};
    private state: boolean = false;

    public append(): Loading {
        const id = URL.createObjectURL(new Blob());
        URL.revokeObjectURL(id);
        const loading = new Loading(id, this);

        this.loadings[id] = loading;

        this.updateLoader();
        return loading;
    }

    public removeLoading(loadingId: string): void {
        delete this.loadings[loadingId];

        this.updateLoader();
    }

    private updateLoader(): void {
        const newState = Object.keys(this.loadings).length > 0;
        if (newState !== this.state) {
            this.state = newState;
            this.emit("StateChanged", { detail: newState });
        }
    }

    public get isLoading(): boolean {
        return this.state;
    }
}

export default Loader;