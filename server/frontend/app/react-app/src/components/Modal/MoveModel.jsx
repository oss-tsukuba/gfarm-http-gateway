import React, { useEffect, useState, useMemo } from "react";
import ModalWindow from "@components/Modal/Modal";
import SuggestInput from "@components/SuggestInput";
import ConflictResolutionModal from "@components/Modal/ConflictResolutionModal";
import useFileList from "@hooks/useFileList";
import { useShowHidden } from "@context/ShowHiddenContext";
import { useNotifications } from "@context/NotificationContext";
import { useOverlay } from "@context/OverlayContext";
import { getParentPath, checkConflicts } from "@utils/func";
import moveItems from "@utils/move";
import { ErrorCodes, get_ui_error } from "@utils/error";
import { BsArrowBarUp, BsFolder } from "react-icons/bs";
import PropTypes from "prop-types";

function MoveModal({ setShowModal, currentDir, itemsToMove, setItemsToMove, refresh }) {
    const title = "Move";
    const { showHidden } = useShowHidden();
    const [visible, setVisible] = useState(true);
    const [suggestDir, setSuggestDir] = useState(currentDir);
    const [targetPath, setTargetPath] = useState(currentDir);
    const {
        currentItems,
        listGetError,
        loading: listLoading,
    } = useFileList(suggestDir, showHidden);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Loading suggestions...");
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingItems, setPendingItems] = useState([]);
    const [pendingConfirm, setPendingConfirm] = useState(false);
    const suggestions = useMemo(() => currentItems.filter((f) => f.is_dir), [currentItems]);
    const { addNotification } = useNotifications();
    const { showOverlay, hideOverlay } = useOverlay();

    useEffect(() => {
        if (itemsToMove.length < 1 && pendingItems.length < 1) {
            setShowModal(false);
        }
    }, [itemsToMove, pendingItems]);

    useEffect(() => {
        if (listGetError) {
            setLoadingText(listGetError);
        } else {
            setLoadingText("Loading suggestions...");
            setLoading(false);
        }
    }, [currentItems]);

    useEffect(() => {
        if (targetPath.endsWith("/")) {
            setLoading(true);
            setSuggestDir(targetPath);
        }
    }, [targetPath]);

    const setError = (error) => {
        console.debug("error", error);
        addNotification(title, error, "error");
    };

    const handleMove = async (items) => {
        showOverlay("Moving files... please wait");
        await moveItems(items, setError);
        hideOverlay();
        setTargetPath("");
        setPendingItems([]);
        setItemsToMove([]);
        refresh();
    };

    useEffect(() => {
        if (!loading && !listLoading && pendingConfirm) {
            const res = checkConflicts(pendingItems, currentItems);
            console.debug("res", res);
            if (res.hasConflict) {
                setPendingItems(res.incomingItems);
                setShowConflictModal(true);
                setPendingConfirm(false);
                return;
            }
            setPendingConfirm(false);
            handleMove(pendingItems);
        }
    }, [loading, listLoading, pendingConfirm]);

    const handleChange = (input) => {
        setTargetPath(input);
    };

    const handleSelectSuggestion = (path) => {
        console.debug("handleSelectSuggestion", path);
        if (path === "..") {
            const parent = getParentPath(suggestDir);
            setTargetPath(parent);
            setSuggestDir(parent);
        } else {
            setTargetPath(path);
            setSuggestDir(path);
        }
        setLoading(true);
    };

    const handleConfirm = () => {
        if (targetPath === "") {
            addNotification(
                title,
                get_ui_error([ErrorCodes.EMPTY_PATH]).message,
                get_ui_error([ErrorCodes.EMPTY_PATH]).type
            );
            return;
        }
        if (targetPath === currentDir) {
            addNotification(
                title,
                get_ui_error([ErrorCodes.SAME_DESTINATION]).message,
                get_ui_error([ErrorCodes.SAME_DESTINATION]).type
            );
            setTargetPath("");
            return;
        }
        setVisible(false);

        showOverlay("Moving files... please wait");

        if (suggestDir !== targetPath) {
            setSuggestDir(targetPath);
            setLoading(true);
        }

        const items = itemsToMove.map((item) => {
            return {
                ...item,
                destPath: targetPath.replace(/\/$/, "") + "/" + item.name,
                uploadDir: targetPath.replace(/\/$/, ""),
            };
        });

        setPendingItems(items);
        setPendingConfirm(true);
    };

    const handleCancel = () => {
        setVisible(false);
        setTargetPath("");
        setPendingItems([]);
        setItemsToMove([]);
    };

    return (
        <div>
            <ModalWindow
                testid="move-modal"
                show={visible}
                onCancel={() => handleCancel()}
                onConfirm={() => handleConfirm()}
                confirmText="Move"
                size="large"
                title={
                    <div className="d-flex modal-title">
                        <h5 className="">
                            {title + " "}
                            {itemsToMove.length === 1
                                ? '"' + itemsToMove[0].name + '"'
                                : itemsToMove.length + " items"}
                        </h5>
                    </div>
                }
            >
                <div>
                    <div className="mb-3">
                        <label htmlFor="move-dest-input" className="form-label fw-semibold">
                            Enter Destination Path:
                        </label>
                        <SuggestInput
                            id="move-dest-input"
                            value={targetPath}
                            onChange={(val) => handleChange(val)}
                            suggestions={suggestions.map((item) => ({
                                name: item.path,
                                value: item.path,
                            }))}
                        />
                    </div>
                    <div className="mb-3">
                        <div className="form-label">or select a directory below:</div>
                        <div className="form-text">{suggestDir}</div>
                        {loading ? (
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="spinner-border spinner-border-sm text-secondary"
                                    role="status"
                                />
                                <span className="text-secondary">{loadingText}</span>
                            </div>
                        ) : (
                            <ul className="list-group mt-2 shadow-sm">
                                {suggestDir !== "/" && (
                                    <li
                                        className="list-group-item list-group-item-action"
                                        onClick={() => handleSelectSuggestion("..")}
                                    >
                                        <BsArrowBarUp className="me-2" />
                                        ..
                                    </li>
                                )}
                                {currentItems.length > 0 &&
                                    suggestions.map(
                                        (item, i) =>
                                            item.is_dir && (
                                                <li
                                                    key={i}
                                                    className="list-group-item list-group-item-action"
                                                    onClick={() =>
                                                        handleSelectSuggestion(item.path)
                                                    }
                                                >
                                                    <BsFolder className="me-2" />
                                                    {item.name}
                                                </li>
                                            )
                                    )}
                            </ul>
                        )}
                    </div>
                </div>
            </ModalWindow>
            {showConflictModal && (
                <ConflictResolutionModal
                    setShowModal={setShowConflictModal}
                    incomingItems={pendingItems}
                    setIncomingItems={setPendingItems}
                    existingNames={currentItems.map((item) => item.name)}
                    onCancel={() => {
                        handleCancel();
                    }}
                    onConfirm={(items) => {
                        handleMove(items);
                    }}
                />
            )}
        </div>
    );
}

export default MoveModal;

MoveModal.propTypes = {
    setShowModal: PropTypes.func,
    currentDir: PropTypes.string,
    itemsToMove: PropTypes.array,
    setItemsToMove: PropTypes.func,
    refresh: PropTypes.func,
};
