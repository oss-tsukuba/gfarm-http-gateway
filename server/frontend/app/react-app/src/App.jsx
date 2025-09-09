import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import HomePage from "./page/HomePage";
import ErrorPage from "./page/ErrorPage";
import DownloadHandler from "./page/DownloadHandler";
import IndexHandler from "./page/IndexHandler";
import { getIconCSS } from "./utils/getFileCategory";
import { ROUTE_STORAGE, ROUTE_DOWNLOAD } from "./utils/config";
import { loadExternalCss } from "./utils/func";
import { NotificationProvider } from "./context/NotificationContext";
import { UserInfoProvider } from "./context/UserInfoContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ShowHiddenProvider } from "./context/ShowHiddenContext";
import { ViewModeProvider } from "./context/ViewModeContext";
import { DateFormatProvider } from "./context/DateFormatContext";

function App() {
    const [cssLoading, setCssLoading] = useState(true);

    useEffect(() => {
        const loadCSS = async () => {
            const css = await getIconCSS();
            loadExternalCss(css);
            setCssLoading(false);
        };
        loadCSS();
    }, []);

    if (cssLoading) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: "100vh" }}
            >
                <div className="spinner-border" role="status" aria-hidden="true" />
                <span className="ms-2">Loading...</span>
            </div>
        );
    }
    return (
        <UserInfoProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <ShowHiddenProvider>
                        <ViewModeProvider>
                            <DateFormatProvider>
                                <HashRouter>
                                    <Routes>
                                        <Route path="/" element={<IndexHandler />} />
                                        <Route path={`${ROUTE_STORAGE}/*`} element={<HomePage />} />
                                        <Route
                                            path={`${ROUTE_DOWNLOAD}/*`}
                                            element={<DownloadHandler />}
                                        />
                                        <Route
                                            path="/auth_error"
                                            element={
                                                <ErrorPage
                                                    error={"Authentication error"}
                                                    errorcode={401}
                                                />
                                            }
                                        />
                                        <Route
                                            path="*"
                                            element={<ErrorPage error={"Page not found"} />}
                                        />
                                    </Routes>
                                </HashRouter>
                            </DateFormatProvider>
                        </ViewModeProvider>
                    </ShowHiddenProvider>
                </NotificationProvider>
            </ThemeProvider>
        </UserInfoProvider>
    );
}

export default App;
