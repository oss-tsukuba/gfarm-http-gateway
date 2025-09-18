import React, { createContext, useContext, useState, useEffect } from "react";
import { get_login_status } from "@utils/getUserInfo";
import PropTypes from "prop-types";

const UserInfoContext = createContext();

export function useUserInfo() {
    return useContext(UserInfoContext);
}

export function UserInfoProvider({ children }) {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const get_username = async () => {
            const data = await get_login_status();
            if (active) {
                setUserInfo(data);
                setLoading(false);
            }
            console.debug("user_info", data);
        };

        get_username();

        return () => {
            active = false;
        };
    }, []);

    return (
        <UserInfoContext
            value={{
                userInfo,
                loading,
            }}
        >
            {children}
        </UserInfoContext>
    );
}

UserInfoProvider.propTypes = {
    children: PropTypes.node,
};
