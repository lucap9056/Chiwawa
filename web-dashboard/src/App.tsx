import React, { useEffect } from "react";

import Home from "@src/Home";

import LoadingComponent from '@components/Loading';
import Messages from '@components/Messages';
import Alerts from '@components/Alerts';

import { LoginResult } from '@services/chiwawaAPI';

const App = () => {

    useEffect(() => {
        const parentWindow: Window = window.opener;

        if (parentWindow) {
            const search = new URLSearchParams(location.search);

            const code = search.get("code");
            const err = search.get("error");


            const result: LoginResult = {
                success: code !== null,
                error: err ? new Error(err) : undefined,
                code
            }

            parentWindow.postMessage(result);

            window.close();
        }

    }, []);

    return <>
        <Home />
        <Messages />
        <LoadingComponent />
        <Alerts />
    </>;
}

export default App;