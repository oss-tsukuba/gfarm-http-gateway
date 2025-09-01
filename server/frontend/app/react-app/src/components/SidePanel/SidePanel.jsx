import React, { useEffect, useState } from "react";
import "@css/SidePanel.css";
import ACLTab from "@components/SidePanel/ACLTab";
import DetailTab from "@components/SidePanel/DetailTab";
import URLTab from "@components/SidePanel/URLTab";
import PermsTab from "@components/SidePanel/PermsTab";
import useGetAttr from "@hooks/useGetAttr";
import useGetAcl from "@hooks/useGetAcl";
import { useNotifications } from "@context/NotificationContext";
import PropTypes from "prop-types";

function SidePanel({ show, item, onHide, showTab = "detail" }) {
    const [activeTab, setActiveTab] = useState("detail");
    const { detailContent, getAttrError, refreshAttr, attrLoading } = useGetAttr(
        show ? item : null,
        true,
        true
    );
    const { aclData, aclError, refreshAcl, aclLoading } = useGetAcl(show ? item : null);
    const { addNotification } = useNotifications();
    const tabs = [
        { key: "detail", label: "Detail" },
        { key: "perms", label: "Perms" },
        { key: "acl", label: "ACL" },
        { key: "url", label: "URL" },
    ];

    useEffect(() => {
        setActiveTab(showTab);
    }, [showTab]);

    useEffect(() => {
        if (getAttrError) {
            console.error("getAttribute failed:", getAttrError);
            addNotification("Detail", getAttrError, "error");
        }
    }, [getAttrError]);

    useEffect(() => {
        if (aclError) {
            addNotification("ACL", aclError, "error");
        }
    }, [aclError]);

    return (
        <div
            className={`custom-sidepanel ${!show ? "hide" : ""}`}
            style={{ maxWidth: "100vw", width: "400px", zIndex: 1050 }}
            data-testid="sidepanel"
        >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                {item && <h5 className="m-0">{item.name}</h5>}
                <button className="btn-close" onClick={onHide}></button>
            </div>
            <div className="px-3 pt-2">
                <ul className="nav nav-tabs">
                    {tabs.map(({ key, label }) => (
                        <li className="nav-item" key={key}>
                            <button
                                className={`nav-link ${activeTab === key ? "active" : ""}`}
                                onClick={() => setActiveTab(key)}
                            >
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="px-3 py-2 overflow-auto" style={{ maxHeight: "calc(100% - 100px)" }}>
                {attrLoading || aclLoading ? (
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="spinner-border" role="status" aria-hidden="true" />
                    </div>
                ) : (
                    <div>
                        <DetailTab
                            item={item}
                            active={activeTab === "detail"}
                            detailContent={detailContent}
                            refreshAttr={refreshAttr}
                        />
                        <PermsTab
                            item={item}
                            active={activeTab === "perms"}
                            detailContent={detailContent}
                            refreshAttr={refreshAttr}
                            refreshAcl={refreshAcl}
                        />
                        <ACLTab
                            item={item}
                            active={activeTab === "acl"}
                            aclData={aclData}
                            aclError={aclError}
                            refreshAcl={refreshAcl}
                            refreshAttr={refreshAttr}
                        />
                        <URLTab item={item} active={activeTab === "url"} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default SidePanel;

SidePanel.propTypes = {
    show: PropTypes.bool,
    item: PropTypes.object,
    onHide: PropTypes.func,
    showTab: PropTypes.string,
};
