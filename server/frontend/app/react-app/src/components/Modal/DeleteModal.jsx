import React, { useState, useEffect } from "react";
import ModalWindow from "@components/Modal/Modal";
import { useNotifications } from "@context/NotificationContext";
import { useOverlay } from "@context/OverlayContext";
import removeItems from "@utils/remove";
import PropTypes from "prop-types";

function DeleteModal({ setShowModal, itemsToDelete, setItemsToDelete, refresh }) {
    const title = "Delete";
    const [visible, setVisible] = useState(true);
    const { addNotification } = useNotifications();
    const { showOverlay, hideOverlay } = useOverlay();

    useEffect(() => {
        if (!visible) {
            setShowModal(false);
        }
    }, [visible]);

    const handleDelete = () => {
        const deleteFile = async () => {
            setVisible(false);
            showOverlay("Deleting files... please wait");
            const error = await removeItems(itemsToDelete, refresh);
            hideOverlay();
            if (error) addNotification(title, error, "error");
            setItemsToDelete([]);
        };
        deleteFile();
        return true;
    };

    return (
        <div>
            <ModalWindow
                testid="delete-modal"
                show={visible}
                onCancel={() => {
                    setItemsToDelete([]);
                    setVisible(false);
                }}
                onConfirm={handleDelete}
                confirmText="Delete"
                title={
                    <div>
                        <p className="modal-title">
                            Are you sure you want to permanently delete the following files?
                        </p>
                    </div>
                }
            >
                <div>
                    <ul>
                        {itemsToDelete.map((file, idx) => (
                            <li key={idx}>
                                &quot;{file.name}&quot; {file.is_dir && "and its contents"}
                            </li>
                        ))}
                    </ul>
                </div>
            </ModalWindow>
        </div>
    );
}

export default DeleteModal;

DeleteModal.propTypes = {
    setShowModal: PropTypes.func,
    itemsToDelete: PropTypes.array,
    setItemsToDelete: PropTypes.func,
    refresh: PropTypes.func,
};
