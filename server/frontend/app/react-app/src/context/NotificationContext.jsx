import React, { createContext, useState, useContext } from "react";
import PropTypes from "prop-types";

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (name, message, type = "warning") => {
        const id = Date.now() + Math.random();
        const notification = { id, name, message, type };

        setNotifications((prev) => [...prev, notification]);

        if (type === "warning") {
            setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== id));
            }, 10000);
        }
    };

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <NotificationContext value={{ addNotification, removeNotification }}>
            {children}
            <div className="position-fixed bottom-0 end-0" style={{ zIndex: 9999 }}>
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={`toast show mb-2 me-2 ${
                            n.type === "error"
                                ? "bg-danger text-white"
                                : n.type === "warning"
                                  ? "bg-warning"
                                  : "bg-info"
                        }`}
                        role="alert"
                        style={{ minWidth: "250px" }}
                        data-testid={`notification-${n.id}`}
                    >
                        <div className="d-flex justify-content-between align-items-center px-2 py-1">
                            <div className="text-break">
                                {n.name} : {n.message}
                            </div>
                            <button
                                className="btn-close btn-close-white ms-2"
                                onClick={() => removeNotification(n.id)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </NotificationContext>
    );
}

NotificationProvider.propTypes = {
    children: PropTypes.node,
};
