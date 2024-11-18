/**
 * Loading畫面
 */
import React, { useEffect, useState } from 'react';

import Loading from './script';
import "./style.css";

const LoadingComponent = () => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {

        const Change = (e) => {
            setLoading(e.detail);
        }

        setLoading(Loading.State);

        Loading.on("change", Change);

        return () => {
            Loading.off("change", Change);
        }
    }, []);

    if (!loading) return <></>;

    return <div id="loading_container">
        <div id="loading">
            <div className="loading triangle loading_1"></div>
            <div className="loading line loading_2"></div>
            <div className="loading triangle loading_3"></div>
            <div className="loading line loading_4"></div>
            <div className="loading triangle loading_5"></div>
            <div className="loading line loading_6"></div>
            <div className="loading triangle loading_7"></div>
            <div className="loading line loading_8"></div>
        </div>
    </div>
}

export {
    Loading as loadingManager
}

export default LoadingComponent;