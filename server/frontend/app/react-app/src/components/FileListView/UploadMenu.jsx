import React, { useRef, useState } from "react";
import { CollectPathsFromFiles, checkConflicts } from "@utils/func";
import ConflictResolutionModal from "@components/Modal/ConflictResolutionModal";
import {
    BsFileEarmarkArrowUp,
    BsFolder,
    BsFolderPlus,
    BsUpload,
    BsLink45Deg,
} from "react-icons/bs";
import PropTypes from "prop-types";

function UploadMenu({ actions, uploadDir, currentItems }) {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const handleFileChange = (e) => {
        const targetfiles = Array.from(e.target.files);
        console.debug("targetfiles:", targetfiles);
        const collectedItems = CollectPathsFromFiles(targetfiles).map((file) => {
            return {
                ...file,
                destPath: uploadDir.replace(/\/$/, "") + "/" + file.path,
                uploadDir: uploadDir.replace(/\/$/, ""),
            };
        });
        if (collectedItems) {
            const res = checkConflicts(collectedItems, currentItems);

            console.debug("res", res);
            console.debug("collectedFiles", res.incomingItems);
            if (res.hasConflict) {
                setSelectedItems(res.incomingItems);
                setShowConfirm(true);
                e.target.value = null;
                return;
            }
            actions.upload(res.incomingItems);
        }
        e.target.value = null;
    };

    const confirmUpload = (incomingItems) => {
        if (incomingItems.length > 0) {
            console.debug("incomingItems:", incomingItems);
            actions.upload(incomingItems);
        }
    };

    return (
        <div>
            <div className="dropdown">
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm dropdown-toggle"
                    id="upload-dropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    <BsUpload className="me-2" />
                    New
                </button>
                <ul className="dropdown-menu" aria-labelledby="upload-dropdown">
                    <li>
                        <h1 className="dropdown-header">Upload</h1>
                    </li>
                    <li>
                        <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="upload-file"
                        >
                            <BsFileEarmarkArrowUp className="me-2" />
                            File
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => folderInputRef.current?.click()}
                            data-testid="upload-directory"
                        >
                            <BsFolder className="me-2" />
                            Directory
                        </button>
                    </li>
                    <li>
                        <hr className="dropdown-divider" />
                    </li>
                    <li>
                        <h1 className="dropdown-header">Create</h1>
                    </li>
                    <li>
                        <button
                            type="button"
                            className="dropdown-item"
                            onClick={actions.create}
                            data-testid="create-directory"
                        >
                            <BsFolderPlus className="me-2" />
                            Directory
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            className="dropdown-item"
                            onClick={actions.create_symlink}
                            data-testid="create-symlink"
                        >
                            <BsLink45Deg className="me-2" />
                            Symlink
                        </button>
                    </li>
                </ul>

                <input
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />
                <input
                    type="file"
                    multiple
                    webkitdirectory="true"
                    style={{ display: "none" }}
                    ref={folderInputRef}
                    onChange={handleFileChange}
                />
            </div>
            {showConfirm && (
                <ConflictResolutionModal
                    setShowModal={setShowConfirm}
                    incomingItems={selectedItems}
                    setIncomingItems={setSelectedItems}
                    existingNames={currentItems.map((item) => item.name)}
                    onCancel={() => {}}
                    onConfirm={confirmUpload}
                />
            )}
        </div>
    );
}

export default UploadMenu;

UploadMenu.propTypes = {
    actions: PropTypes.array,
    uploadDir: PropTypes.string,
    currentItems: PropTypes.array,
};
