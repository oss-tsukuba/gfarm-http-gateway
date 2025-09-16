import React, { useState, useEffect } from "react";
import ModalWindow from "@components/Modal/Modal";
import { useNotifications } from "@context/NotificationContext";
import { getParentPath, checkFileName } from "@utils/func";
import moveItems from "@utils/move";
import { ErrorCodes, get_ui_error } from "@utils/error";
import PropTypes from "prop-types";

function RenameModal({ hideModalComponent, renameItem, refresh }) {
    const title = "Rename";
    const [newName, setNewName] = useState(renameItem?.name || "");
    const [visible, setVisible] = useState(true);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible) {
            hideModalComponent();
        }
    }, [visible]);

    const setError = (error) => {
        console.debug("error", error);
        addNotification(title, error, "error");
    };

    const handleRename = () => {
        if (!renameItem || !newName) {
            setNewName("");
            addNotification(
                title,
                get_ui_error([ErrorCodes.EMPTY_NAME]).message,
                get_ui_error([ErrorCodes.EMPTY_NAME]).type
            );
            return false;
        }
        const trimmedName = newName.trim();

        if (!checkFileName(trimmedName)) {
            addNotification(
                title,
                get_ui_error([ErrorCodes.INVALID_NAME]).message,
                get_ui_error([ErrorCodes.INVALID_NAME]).type
            );
            return false;
        }

        const rename = async () => {
            const destpath =
                getParentPath(renameItem.path).replace(/\/$/, "") +
                "/" +
                trimmedName.replace(/\/+/, "/");

            const item = {
                ...renameItem,
                destPath: destpath,
            };

            await moveItems([item], setError);
            setNewName("");
            setVisible(false);
            refresh();
        };
        rename();
    };

    return (
        <ModalWindow
            testid="rename-modal"
            show={visible}
            onCancel={() => {
                setNewName("");
                setVisible(false);
            }}
            onConfirm={handleRename}
            confirmText="Rename"
            title={<h5 className="modal-title">{title}</h5>}
        >
            <div>
                <input
                    id="rename-input"
                    type="text"
                    className="form-control"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter name"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleRename();
                        }
                    }}
                />
            </div>
        </ModalWindow>
    );
}

export default RenameModal;

RenameModal.propTypes = {
    hideModalComponent: PropTypes.func,
    renameItem: PropTypes.object,
    refresh: PropTypes.func,
};
