import React, { useEffect, useState, useMemo } from "react";
import ModalWindow from "@components/Modal/Modal";
import { useShowHidden } from "@context/ShowHiddenContext";
import { useNotifications } from "@context/NotificationContext";
import useFileList from "@hooks/useFileList";
import SuggestInput from "@components/SuggestInput";
import { getParentPath, joinPaths, normalizePath, checkFileName, getFileName } from "@utils/func";
import { setSymlink } from "@utils/symlink";
import { ErrorCodes, get_ui_error } from "@utils/error";
import PropTypes from "prop-types";

function NewSymlinkModal({ hideModalComponent, currentDir, targetItem, refresh }) {
    const title = "New Symlink";
    const { showHidden } = useShowHidden();
    const [visible, setVisible] = useState(true);
    const [linkName, setLinkName] = useState(currentDir.replace(/\/$/, "") + "/");
    const [linkPath, setLinkPath] = useState("");
    const [sourcePath, setSourcePath] = useState("");
    const [uploadDir, setUploadDir] = useState(currentDir);
    const [suggestDir, setSuggestDir] = useState(null);
    const { currentItems } = useFileList(uploadDir, showHidden);
    const { currentItems: targetSuggestions } = useFileList(suggestDir, showHidden);
    const linknameSuggestions = useMemo(() => currentItems.filter((f) => f.is_dir), [currentItems]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState(null);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible && !isCreating) {
            hideModalComponent();
        }
    }, [visible, isCreating]);

    useEffect(() => {
        setUploadDir(currentDir);
        setLinkName(currentDir.replace(/\/$/, "") + "/");
        if (targetItem) {
            setSourcePath(targetItem.path);
        } else {
            setSuggestDir(currentDir);
        }
    }, [targetItem, currentDir]);

    useEffect(() => {
        if (sourcePath.endsWith("/")) {
            setSuggestDir(sourcePath);
        }
    }, [sourcePath]);

    useEffect(() => {
        if (linkName) {
            let fullpath = linkName;
            if (!linkName.startsWith("/")) {
                fullpath = normalizePath(joinPaths(currentDir, linkName));
                console.debug("linkName", linkName);
                console.debug("currentDir", currentDir);
                console.debug("fullpath", fullpath);
            }
            setLinkPath(fullpath);
            const parent = getParentPath(fullpath);
            if (uploadDir !== parent) setUploadDir(parent);
        }
    }, [linkName]);

    useEffect(() => {
        if (linkPath) {
            if (currentItems.some((item) => item.path === linkPath)) {
                setError(get_ui_error([ErrorCodes.ALREADY_EXISTS]).message);
            } else {
                setError(null);
            }
        }
    }, [currentItems, linkPath]);

    const handleCreate = () => {
        if (!linkPath || !sourcePath) {
            addNotification(
                title,
                get_ui_error([ErrorCodes.REQUIRED_NOT_MET]).message,
                get_ui_error([ErrorCodes.REQUIRED_NOT_MET]).type
            );
            return false;
        }
        if (linkName === "") {
            addNotification(
                title,
                get_ui_error([ErrorCodes.EMPTY_NAME]).message,
                get_ui_error([ErrorCodes.EMPTY_NAME]).type
            );
            return false;
        }
        if (!checkFileName(getFileName(linkName))) {
            addNotification(
                title,
                get_ui_error([ErrorCodes.INVALID_NAME]).message,
                get_ui_error([ErrorCodes.INVALID_NAME]).type
            );
            return false;
        }
        if (error) {
            addNotification(
                title,
                get_ui_error([ErrorCodes.ALREADY_EXISTS]).message,
                get_ui_error([ErrorCodes.ALREADY_EXISTS]).type
            );
            return false;
        }
        const createSymlink = async () => {
            setIsCreating(true);
            try {
                await setSymlink(sourcePath, linkPath);
            } catch (err) {
                console.error("setSymlink failed:", err);
                addNotification(title, `${err.name} : ${err.message}`, "error");
            }
            refresh();
            setIsCreating(false);
            setVisible(false);
        };
        createSymlink();
        return true;
    };

    return (
        <div>
            <ModalWindow
                testid="newsym-modal"
                show={visible}
                onCancel={() => {
                    setLinkName("");
                    setLinkPath("");
                    setSourcePath("");
                    setUploadDir("");
                    setVisible(false);
                }}
                onConfirm={handleCreate}
                confirmText="Create"
                title={<h5 className="modal-title">{title}</h5>}
            >
                <div>
                    <div className="mb-3">
                        <label htmlFor="symlink-linkname-input" className="form-label fw-bold">
                            Link Name
                        </label>
                        <SuggestInput
                            id="symlink-linkname-input"
                            value={linkName}
                            onChange={(value) => setLinkName(value)}
                            suggestions={linknameSuggestions.map((item) => ({
                                name: item.path,
                                value: item.path,
                            }))}
                            placeholder="Enter link path"
                        />
                        {error && <div className="form-text alert-danger">{error}</div>}
                    </div>
                    <div className="mt-3">
                        <label htmlFor="symlink-target-input" className="form-label fw-bold">
                            Target
                        </label>
                        {targetItem ? (
                            <input
                                id="symlink-target-input"
                                type="text"
                                className="form-control"
                                value={sourcePath}
                                disabled
                            />
                        ) : (
                            <SuggestInput
                                id="symlink-target-input"
                                value={sourcePath}
                                onChange={(value) => setSourcePath(value)}
                                suggestions={targetSuggestions.map((item) => ({
                                    name: item.path,
                                    value: item.path,
                                }))}
                            />
                        )}
                    </div>
                </div>
            </ModalWindow>
            {isCreating && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
                    style={{ zIndex: 1050 }}
                >
                    <div className="spinner-border text-primary" role="status"></div>
                    <div>Creating symlink... please wait</div>
                </div>
            )}
        </div>
    );
}

export default NewSymlinkModal;

NewSymlinkModal.propTypes = {
    hideModalComponent: PropTypes.func,
    currentDir: PropTypes.string,
    targetItem: PropTypes.object,
    refresh: PropTypes.func,
};
