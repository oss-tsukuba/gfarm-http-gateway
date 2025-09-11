// OverlayContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import PropTypes from "prop-types";

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState("");

    const showOverlay = useCallback((msg) => {
        setMessage(msg || "Please wait...");
        setVisible(true);
    }, []);

    const hideOverlay = useCallback(() => {
        setVisible(false);
        setMessage("");
    }, []);

    return (
        <OverlayContext value={{ visible, message, showOverlay, hideOverlay }}>
            {children}
            {visible && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
                    style={{ zIndex: 1050 }}
                    data-testid="global-overlay"
                >
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-2" role="status"></div>
                        <div>{message}</div>
                    </div>
                </div>
            )}
        </OverlayContext>
    );
}

OverlayProvider.propTypes = {
    children: PropTypes.node,
};

export function useOverlay() {
    return useContext(OverlayContext);
}
