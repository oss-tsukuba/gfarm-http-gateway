import React from "react";
import { Link } from "react-router-dom";
import { ROUTE_STORAGE, API_URL } from "@utils/config";
import { useUserInfo } from "@context/UserInfoContext";
import PropTypes from "prop-types";

function ErrorPage({ error, errorcode = 0 }) {
    const { userInfo } = useUserInfo();
    const reload = () => {
        window.location.reload();
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Error!</h1>
            <p>{error}</p>
            {errorcode === 401 && <p>Sign in again</p>}
            {errorcode !== 401 && (
                <div>
                    <p>
                        <a href="#" onClick={reload}>
                            Reload
                        </a>
                    </p>
                    <p>
                        <Link
                            to={`${ROUTE_STORAGE}${userInfo ? userInfo.home_directory || "" : ""}`}
                        >
                            Return to home
                        </Link>
                    </p>
                </div>
            )}
            <p>
                <a href={`${API_URL}/logout`}>{errorcode === 401 ? "Return to Login" : "Logout"}</a>
            </p>
        </div>
    );
}

export default ErrorPage;

ErrorPage.propTypes = {
    error: PropTypes.string,
    errorcode: PropTypes.number,
};
