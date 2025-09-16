import React, { useState, useCallback, useEffect } from "react";
import ModalWindow from "@components/Modal/Modal";
import { useNotifications } from "@context/NotificationContext";
import { createDir } from "@utils/dircommon";
import { checkFileName } from "@utils/func";
import { ErrorCodes, get_ui_error } from "@utils/error";
import PropTypes from "prop-types";

function NewDirModal({ hideModalComponent, currentDir, refresh }) {
    const title = "New Directory";
    const [dirname, setDirname] = useState("");
    const [visible, setVisible] = useState(true);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible) {
            hideModalComponent();
        }
    }, [visible]);

    const handleCreateDir = useCallback(() => {
        console.debug("handleCreateDir dirname", dirname);
        if (dirname === "") {
            addNotification(
                title,
                get_ui_error([ErrorCodes.EMPTY_NAME]).message,
                get_ui_error([ErrorCodes.EMPTY_NAME]).type
            );
            return false;
        }
        const trimmedName = dirname.trim();
        if (!checkFileName(trimmedName)) {
            addNotification(
                title,
                get_ui_error([ErrorCodes.INVALID_NAME]).message,
                get_ui_error([ErrorCodes.INVALID_NAME]).type
            );
            return false;
        }
        const create = async () => {
            const path = currentDir.replace(/\/$/, "") + "/" + trimmedName;
            const error = await createDir(path);
            setVisible(false);
            setDirname("");
            if (error) addNotification(title, error, "error");
            refresh();
        };
        create();
        return true;
    }, [dirname]);

    return (
        <ModalWindow
            testid="newdir-modal"
            show={visible}
            onCancel={() => {
                setVisible(false);
                setDirname("");
            }}
            onConfirm={handleCreateDir}
            confirmText="Create"
            title={<h5 className="modal-title">{title}</h5>}
        >
            <input
                id="create-dir-input"
                type="text"
                className="form-control"
                value={dirname}
                onChange={(e) => {
                    setDirname(e.target.value);
                    console.debug("dirname", dirname, e.target.value);
                }}
                placeholder="Enter directory name"
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateDir();
                    }
                }}
            />
        </ModalWindow>
    );
}

export default NewDirModal;

NewDirModal.propTypes = {
    showModal: PropTypes.bool,
    hideModalComponent: PropTypes.func,
    currentDir: PropTypes.string,
    refresh: PropTypes.func,
};
