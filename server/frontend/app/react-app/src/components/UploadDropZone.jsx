import React, { useState, useEffect, useCallback, useMemo } from "react";
import ModalWindow from "@components/Modal/Modal";
import ConflictResolutionModal from "@components/Modal/ConflictResolutionModal";
import { CollectPathsFromItems, formatFileSize, getTimeStr, checkConflicts } from "@utils/func";
import { useOverlay } from "@context/OverlayContext";
import "@css/DropZone.css";
import PropTypes from "prop-types";

const MODAL_STATES = {
    NONE: "none",
    UPLOAD_CONFIRM: "upload_confirm",
    CONFLICT_RESOLUTION: "conflict_resolution",
};

function UploadDropZone({ onUpload, uploadDir, currentItems }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [modalState, setModalState] = useState(MODAL_STATES.NONE);
    const [showModal, setShowModal] = useState(false);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const { showOverlay, hideOverlay } = useOverlay();

    useEffect(() => {
        setShowModal(modalState === MODAL_STATES.UPLOAD_CONFIRM);
        setShowConflictModal(modalState === MODAL_STATES.CONFLICT_RESOLUTION);
    }, [modalState]);

    const setupGlobalDragListeners = useCallback(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
            const isFileDrag = Array.from(e.dataTransfer.types).includes("Files");
            if (isFileDrag) {
                setIsDragActive(true);
            }
        };

        const handleDragOver = (e) => e.preventDefault();

        const handleDragLeave = (e) => {
            if (e.relatedTarget === null) {
                setIsDragActive(false);
            }
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setIsDragActive(false);
        };

        const events = [
            ["dragenter", handleDragEnter],
            ["dragover", handleDragOver],
            ["dragleave", handleDragLeave],
            ["drop", handleDrop],
        ];

        events.forEach(([event, handler]) => {
            window.addEventListener(event, handler);
        });

        return () => {
            events.forEach(([event, handler]) => {
                window.removeEventListener(event, handler);
            });
        };
    }, []);

    useEffect(setupGlobalDragListeners, [setupGlobalDragListeners]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    }, []);

    const processDroppedItems = useCallback(
        async (items) => {
            try {
                showOverlay();
                const result = await CollectPathsFromItems(items);
                const normalizedUploadDir = uploadDir.replace(/\/$/, "");

                const collectedItems = result.map((file) => ({
                    ...file,
                    destPath: `${normalizedUploadDir}/${file.path}`,
                    uploadDir: normalizedUploadDir,
                }));

                if (collectedItems.length === 0) {
                    hideOverlay();
                    return;
                }

                setSelectedItems(collectedItems);
                setModalState(MODAL_STATES.UPLOAD_CONFIRM);
            } catch (error) {
                console.error("Error processing dropped files:", error);
            } finally {
                hideOverlay();
            }
        },
        [uploadDir, showOverlay, hideOverlay]
    );

    const handleDrop = useCallback(
        async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
            setIsDragActive(false);

            if (e.dataTransfer.items) {
                await processDroppedItems(e.dataTransfer.items);
            }
        },
        [processDroppedItems]
    );

    const confirmUpload = useCallback(() => {
        if (selectedItems.length === 0) return;

        try {
            showOverlay();
            const conflictResult = checkConflicts(selectedItems, currentItems);

            if (conflictResult.hasConflict) {
                setSelectedItems(conflictResult.incomingItems);
                setModalState(MODAL_STATES.CONFLICT_RESOLUTION);
                return;
            }

            onUpload(conflictResult.incomingItems);
            setModalState(MODAL_STATES.NONE);
        } catch (error) {
            console.error("Error confirming upload:", error);
        } finally {
            hideOverlay();
        }
    }, [selectedItems, currentItems, onUpload, showOverlay, hideOverlay]);

    const handleConflictResolution = useCallback(
        (resolvedItems) => {
            if (resolvedItems.length > 0) {
                onUpload(resolvedItems);
            }
            setModalState(MODAL_STATES.NONE);
        },
        [onUpload]
    );

    const cancelUpload = useCallback(() => {
        setModalState(MODAL_STATES.NONE);
        setSelectedItems([]);
    }, []);

    const fileListContent = useMemo(() => {
        if (!selectedItems.length) return null;

        return (
            <div className="modal-body p-0">
                <ul
                    className="list-unstyled m-0 p-3"
                    style={{ maxHeight: "40vh", overflowY: "auto", overscrollBehavior: "contain" }}
                >
                    {selectedItems.map((item) => (
                        <li key={item.path} className="py-1">
                            <strong className="text-break">{item.path}</strong> —{" "}
                            {formatFileSize(item.size, item.is_dir) || "unknown size"}{" "}
                            {getTimeStr(item.mtime)}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }, [selectedItems]);

    const existingItemNames = useMemo(() => currentItems.map((item) => item.name), [currentItems]);

    return (
        <>
            {isDragActive && (
                <div
                    style={{ position: "fixed", top: 0, left: 0, zIndex: 1000, width: "100%" }}
                    className={`drop-zone ${dragging ? "dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <p>Drag and drop files here to upload</p>
                </div>
            )}

            {showModal && (
                <ModalWindow
                    testid="dropzone-modal"
                    show={modalState === MODAL_STATES.UPLOAD_CONFIRM}
                    onCancel={cancelUpload}
                    onConfirm={confirmUpload}
                    size="large"
                    title={
                        <p className="modal-title">
                            Are you sure you want to upload the following files?
                        </p>
                    }
                >
                    {fileListContent}
                </ModalWindow>
            )}

            {showConflictModal && (
                <ConflictResolutionModal
                    hideModalComponent={() => setModalState(MODAL_STATES.NONE)}
                    incomingItems={selectedItems}
                    setIncomingItems={setSelectedItems}
                    existingNames={existingItemNames}
                    onCancel={cancelUpload}
                    onConfirm={handleConflictResolution}
                />
            )}
        </>
    );
}

export default UploadDropZone;

UploadDropZone.propTypes = {
    onUpload: PropTypes.func,
    uploadDir: PropTypes.string,
    currentItems: PropTypes.array,
};
