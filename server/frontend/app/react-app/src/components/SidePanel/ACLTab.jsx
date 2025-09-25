import React, { useState, useEffect } from "react";
import SuggestInput from "@components/SuggestInput";
import { set_acl } from "@utils/acl";
import { getUsers, getGroups } from "@utils/getNameList";
import { ErrorCodes, get_ui_error } from "@utils/error";
import { useNotifications } from "@context/NotificationContext";
import PropTypes from "prop-types";

function ACLTab({ item, active, aclData, refreshAcl, refreshAttr }) {
    const title = "ACL";
    const { addNotification } = useNotifications();
    const [entries, setEntries] = useState([]);
    const [userList, setUserList] = useState([]);
    const [groupList, setGroupList] = useState([]);

    useEffect(() => {
        let cancelled = false;
        if (active) {
            async function fetchSuggestions() {
                const users = await getUsers();
                const groups = await getGroups();
                console.debug("users", users);
                console.debug("groups", groups);
                if (!cancelled) {
                    setUserList(
                        users.map((entry) => ({
                            name: `${decodeURIComponent(entry.name)}`,
                            value: entry.id,
                        }))
                    );
                    setGroupList(groups.map((entry) => ({ name: entry, value: entry })));
                }
            }

            fetchSuggestions();
        }

        return () => {
            cancelled = true;
        };
    }, [active]);

    useEffect(() => {
        if (aclData) setEntries(aclData);
    }, [aclData]);

    const updateEntry = async () => {
        for (const entry of entries) {
            if (entry.base) continue;
            if (entry.is_default) continue;
            if (entry.acl_name) continue;
            addNotification(
                title,
                get_ui_error([ErrorCodes.EMPTY_NAME]).message,
                get_ui_error([ErrorCodes.EMPTY_NAME]).type
            );
            return;
        }

        const res = await set_acl(item.path, entries);
        if (res !== "") {
            console.error(res);
            addNotification(title, res, "error");
        }
        refreshAcl();
        refreshAttr();
    };

    const handleChange = (index, field, value) => {
        const updated = [...entries];
        if (field === "acl_type" || field === "acl_name" || field === "is_default") {
            updated[index][field] = value;
            if (field === "acl_type" && value === "other") {
                updated[index]["acl_name"] = "";
            }
        } else {
            updated[index].acl_perms[field] = value;
        }
        setEntries(updated);
    };

    const addEntry = () => {
        setEntries([
            ...entries,
            {
                acl_type: "user",
                acl_name: "",
                acl_perms: { r: false, w: false, x: false },
                is_default: false,
            },
        ]);
    };

    const removeEntry = (index) => {
        const updated = [...entries];
        updated.splice(index, 1);
        setEntries(updated);
    };

    if (!active) return null;

    return (
        <div data-testid="acl-tab">
            <div className="d-flex flex-column mt-4" style={{ maxHeight: "70vh" }}>
                <div className="flex-grow-1 overflow-auto pe-1" style={{ minHeight: 0 }}>
                    {entries.map((entry, i) => (
                        <div key={`acinfo-${i}`} className="border rounded p-2 mb-2">
                            {!entry.base && (
                                <div className="text-end">
                                    <button
                                        className="btn btn-sm btn-close"
                                        aria-label="Close"
                                        onClick={() => removeEntry(i)}
                                    ></button>
                                </div>
                            )}
                            <div className="row mb-2">
                                <div className="col-5">
                                    {entry.base ? (
                                        <input
                                            id={`acinfo-${i}-acl_type`}
                                            className="form-control"
                                            value={entry.acl_type}
                                            disabled
                                        />
                                    ) : (
                                        <div>
                                            <label
                                                htmlFor={`acinfo-${i}-acl_type`}
                                                className="form-label fw-bold"
                                            >
                                                Type
                                            </label>
                                            <select
                                                className="form-select"
                                                id={`acinfo-${i}-acl_type`}
                                                value={entry.acl_type}
                                                onChange={(e) =>
                                                    handleChange(i, "acl_type", e.target.value)
                                                }
                                            >
                                                <option value="user">User</option>
                                                <option value="group">Group</option>
                                                {entry.is_default && (
                                                    <option value="other">Other</option>
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="col-7">
                                    {entry.base ? (
                                        <></>
                                    ) : (
                                        <div>
                                            <label
                                                htmlFor={`acinfo-${i}-acl_name`}
                                                className="form-label fw-bold"
                                            >
                                                Name
                                            </label>
                                            <SuggestInput
                                                id={`acinfo-${i}-acl_name`}
                                                value={entry.acl_name}
                                                onChange={(val) => handleChange(i, "acl_name", val)}
                                                suggestions={
                                                    entry.acl_type === "user" ? userList : groupList
                                                }
                                                disabled={entry.acl_type === "other"}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="form-label fw-bold me-2">Permissions</div>
                                {["r", "w", "x"].map((perm) => (
                                    <div className="form-check form-check-inline" key={perm}>
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={entry.acl_perms[perm]}
                                            onChange={(e) =>
                                                handleChange(i, perm, e.target.checked)
                                            }
                                            id={`perm-${i}-${perm}`}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`perm-${i}-${perm}`}
                                        >
                                            {perm.toUpperCase()}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {!entry.base && item.is_dir && (
                                <div className="d-flex">
                                    <div className="form-label fw-bold me-2">Default</div>
                                    <div className="form-check form-check-inline">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={entry.is_default}
                                            onChange={(e) =>
                                                handleChange(i, "is_default", e.target.checked)
                                            }
                                            id={`default-${i}`}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`default-${i}`}
                                        ></label>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="d-flex justify-content-between mt-3">
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={addEntry}
                            data-testid="add-acl-button"
                        >
                            + Add Entry
                        </button>
                    </div>
                </div>
                <div className="text-end mt-3">
                    <button
                        className="btn btn-primary btn-sm "
                        onClick={updateEntry}
                        data-testid="update-acl-button"
                    >
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
}

ACLTab.propTypes = {
    item: PropTypes.object,
    active: PropTypes.bool,
    aclData: PropTypes.array,
    refreshAcl: PropTypes.func,
    refreshAttr: PropTypes.func,
};

export default ACLTab;
