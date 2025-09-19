import React from "react";
import { API_URL } from "@utils/config";
import { useUserInfo } from "@context/UserInfoContext";
import PropTypes from "prop-types";

function UserMenu() {
    const { userInfo } = useUserInfo();
    return (
        <div className="dropdown">
            <button
                id="usermenu"
                type="button"
                className="btn btn-outline-secondary dropdown-toggle btn-sm"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                {userInfo ? userInfo.username : "None"}
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
                <li>
                    <a
                        className="dropdown-item"
                        data-bs-toggle="modal"
                        data-bs-target="#settingsModal"
                    >
                        Settings
                    </a>
                </li>
                <li>
                    <div className="dropdown-divider"></div>
                </li>
                <li>
                    <a className="dropdown-item" href={`${API_URL}/logout`}>
                        {userInfo?.loginname ? "Logout" : "Login"}
                    </a>
                </li>
            </ul>
        </div>
    );
}

export default UserMenu;

UserMenu.propTypes = {
    user: PropTypes.string,
};
