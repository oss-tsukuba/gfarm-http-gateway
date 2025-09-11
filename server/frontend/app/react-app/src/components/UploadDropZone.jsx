import React, { useState, useEffect } from "react";
import ModalWindow from "@components/Modal/Modal";
import ConflictResolutionModal from "@components/Modal/ConflictResolutionModal";
import { CollectPathsFromItems, formatFileSize, getTimeStr, checkConflicts } from "@utils/func";
import { useOverlay } from "@context/OverlayContext";
import "@css/DropZone.css";
import PropTypes from "prop-types";

function UploadDropZone({ onUpload, uploadDir, currentItems }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [visibleModal, setVisibleModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showReConfirm, setShowReConfirm] = useState(false);
    const [selectedItems, setSelectedItems] = useState(null);
    const [modalText, setModalText] = useState(null);
    const { showOverlay, hideOverlay } = useOverlay();

    useEffect(() => {
        setShowConfirm(visibleModal);
    }, [visibleModal]);

    useEffect(() => {
        const handleDragEnter = async (e) => {
            e.preventDefault();

            const isFileDrag = Array.from(e.dataTransfer.types).includes("Files");

            if (isFileDrag) {
                setIsDragActive(true);
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
        };

        const handleDragLeave = (e) => {
            if (e.relatedTarget === null) {
                setIsDragActive(false);
            }
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setIsDragActive(false);
        };

        window.addEventListener("dragenter", handleDragEnter);
        window.addEventListener("dragover", handleDragOver);
        window.addEventListener("dragleave", handleDragLeave);
        window.addEventListener("drop", handleDrop);

        return () => {
            window.removeEventListener("dragenter", handleDragEnter);
            window.removeEventListener("dragover", handleDragOver);
            window.removeEventListener("dragleave", handleDragLeave);
            window.removeEventListener("drop", handleDrop);
        };
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        setIsDragActive(false);
        showOverlay();
        // const files = Array.from(e.dataTransfer.files);
        const items = e.dataTransfer.items;
        const result = await CollectPathsFromItems(items);
        console.debug("result", result);
        const collectedItems = result.map((file) => {
            return {
                ...file,
                destPath: uploadDir.replace(/\/$/, "") + "/" + file.path,
                uploadDir: uploadDir.replace(/\/$/, ""),
            };
        });
        console.debug("Collected files:", collectedItems);
        if (collectedItems.length === 0) {
            hideOverlay();
            return;
        }

        setSelectedItems(collectedItems);
        setModalText(
            <ul className="modal-body">
                {collectedItems !== null &&
                    collectedItems.map((item, idx) => (
                        <li key={idx}>
                            <strong className="text-break">{item.path}</strong> —{" "}
                            {formatFileSize(item.size, item.is_dir) || "unknown size"}{" "}
                            {getTimeStr(item.mtime)}
                        </li>
                    ))}
            </ul>
        );
        setVisibleModal(true);
        hideOverlay();
    };

    const confirmUpload = () => {
        setVisibleModal(false);
        setIsDragActive(false);
        if (selectedItems.length > 0) {
            showOverlay();
            const res = checkConflicts(selectedItems, currentItems);

            console.debug("res", res);
            console.debug("collectedFiles", res.incomingItems);
            if (res.hasConflict) {
                setSelectedItems(res.incomingItems);
                setShowReConfirm(true);
                hideOverlay();
                return;
            }
            onUpload(res.incomingItems);
            hideOverlay();
        }
    };

    const re_confirmUpload = (incomingItems) => {
        if (incomingItems.length > 0) {
            console.debug("incomingItems:", incomingItems);
            onUpload(incomingItems); // pass to upload function
        }
    };

    const cancelUpload = () => {
        setIsDragActive(false);
        setVisibleModal(false);
    };

    return (
        <div>
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
            {showConfirm && (
                <ModalWindow
                    testid="dropzone-modal"
                    show={visibleModal}
                    onCancel={cancelUpload}
                    onConfirm={confirmUpload}
                    size="large"
                    title={
                        <p className="modal-title">
                            Are you sure you want to upload the following files?
                        </p>
                    }
                >
                    {modalText}
                </ModalWindow>
            )}
            {showReConfirm && (
                <ConflictResolutionModal
                    setShowModal={setShowReConfirm}
                    incomingItems={selectedItems}
                    setIncomingItems={setSelectedItems}
                    existingNames={currentItems.map((item) => item.name)}
                    onCancel={cancelUpload}
                    onConfirm={re_confirmUpload}
                />
            )}
        </div>
    );
}

export default UploadDropZone;

UploadDropZone.propTypes = {
    onUpload: PropTypes.func,
    uploadDir: PropTypes.string,
    currentItems: PropTypes.array,
};
