import React, { useEffect, useState } from "react";
import ModalWindow from "@components/Modal/Modal";
import SuggestInput from "@components/SuggestInput";
import MiniFileListView from "@components/FileListView/MiniFileListView";
import useFileList from "@hooks/useFileList";
import { useShowHidden } from "@context/ShowHiddenContext";
import { useNotifications } from "@context/NotificationContext";
import gfptar from "@utils/archive";
import PropTypes from "prop-types";

function ArchiveModal({
    setShowModal,
    currentDir,
    selectedItems,
    lastSelectedItem,
    currentDirItems,
    setSelectedItems,
    setItemForGfptar,
    refresh,
}) {
    const { showHidden } = useShowHidden();
    const [visible, setVisible] = useState(true);
    const [activeTab, setActiveTab] = useState("archive");
    const [compressMode, setCompressMode] = useState("create");
    const [suggestDir, setSuggestDir] = useState("");
    const [destDir, setDestDir] = useState(currentDir.replace(/\/$/, "") + "/");
    const { currentItems } = useFileList(suggestDir, showHidden);
    const [error, setError] = useState(null);
    const [targetDir, setTargetDir] = useState(currentDir);
    const [targetItems, setTargetItems] = useState(selectedItems);
    const [options, setOptions] = useState("");
    const [indirList, setIndirList] = useState([]);
    const [selectedFromList, setSelectedFromList] = useState([]);
    const suggestions = currentItems.filter((file) => file.is_dir);
    const { addNotification } = useNotifications();

    useEffect(() => {
        if (!visible) {
            setShowModal(false);
        }
    }, [visible]);

    useEffect(() => {
        setTargetItems(selectedItems);
    }, [selectedItems]);

    useEffect(() => {
        if (
            (compressMode === "create" || activeTab === "extract") &&
            currentItems.some((item) => item.path === destDir)
        ) {
            setError("! already exists !");
        } else {
            setError(null);
        }
        if (destDir.endsWith("/")) {
            setSuggestDir(destDir);
        }
    }, [destDir]);

    const handleChange = (input) => {
        setDestDir(input);
    };

    const handleGfptar = async (command) => {
        if (command === "list") {
            await gfptar(
                command,
                lastSelectedItem.path,
                selectedFromList.map((item) => item.path),
                destDir,
                options.split(" ").filter(Boolean),
                ({ status, message }) => {
                    if (status === "error") {
                        addNotification("Gfptar", message, "error");
                        console.error("useEffect gfptar failed", message);
                        return;
                    }
                    if (message) {
                        const indirList = [];
                        console.debug(message);
                        for (const item of message) {
                            const [file_type, path] = item.trim().split(" ", 2);
                            indirList.push({
                                is_dir: file_type === "D",
                                is_file: file_type === "F",
                                is_sym: file_type === "S",
                                path,
                                name: path,
                            });
                        }
                        setIndirList(indirList);
                    }
                },
                refresh
            );
        } else {
            setItemForGfptar(
                command,
                activeTab === "archive" ? targetDir : lastSelectedItem.path,
                activeTab === "archive"
                    ? targetItems.map((item) => item.name)
                    : selectedFromList.map((item) => item.path),
                destDir,
                options.split(" ").filter(Boolean)
            );
            setIndirList([]);
            setSelectedItems([]);
            setOptions("");
            setActiveTab("archive");
        }
    };

    const handleConfirm = () => {
        setVisible(false);

        handleGfptar(activeTab === "archive" ? compressMode : activeTab);
    };

    const handleCancel = () => {
        setTargetDir("");
        setDestDir("");
        setTargetItems([]);
        setIndirList([]);
        setOptions("");
        setVisible(false);
        setActiveTab("archive");
    };

    return (
        <ModalWindow
            show={visible}
            onCancel={() => handleCancel()}
            onConfirm={() => handleConfirm()}
            comfirmText="Run"
            size="large"
            title={<h5 className="modal-title">Gfptar</h5>}
        >
            <div data-testid="gfptar-modal">
                <div className="mb-3">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === "archive" ? "active" : ""}`}
                                onClick={() => setActiveTab("archive")}
                            >
                                Archive
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === "extract" ? "active" : ""}`}
                                onClick={() => setActiveTab("extract")}
                            >
                                Extract
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="mb-3">
                    <div htmlFor="outdir-input" className="form-label fw-bold">
                        {activeTab === "archive" ? "Output Archive Directory" : "Output Directory"}
                    </div>
                    <SuggestInput
                        id="outdir-input"
                        value={destDir}
                        onChange={(val) => handleChange(val)}
                        suggestions={suggestions.map((item) => ({
                            name: item.path,
                            value: item.path,
                        }))}
                    />
                    {error && <div className="form-text alert-danger">{error}</div>}
                </div>
                {activeTab === "archive" && (
                    <div>
                        <div className="mb-3 d-flex">
                            <div className="form-label fw-bold me-2">Operation</div>
                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="compressMode"
                                    id="mode-create"
                                    value="create"
                                    checked={compressMode === "create"}
                                    onChange={() => setCompressMode("create")}
                                />
                                <label className="form-check-label" htmlFor="mode-create">
                                    Create
                                </label>
                            </div>
                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="compressMode"
                                    id="mode-update"
                                    value="update"
                                    checked={compressMode === "update"}
                                    onChange={() => setCompressMode("update")}
                                />
                                <label className="form-check-label" htmlFor="mode-update">
                                    Update
                                </label>
                            </div>
                            <div className="form-check form-check-inline">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="compressMode"
                                    id="mode-append"
                                    value="append"
                                    checked={compressMode === "append"}
                                    onChange={() => setCompressMode("append")}
                                />
                                <label className="form-check-label" htmlFor="mode-append">
                                    Append
                                </label>
                            </div>
                        </div>
                        <div className="mb-3 d-flex">
                            <div className="form-label fw-bold me-4">Base Directory</div>
                            <div className="form-text">{targetDir}</div>
                        </div>

                        <div className="form-label fw-bold">Members</div>
                        <div
                            className="mb-3 overflow-auto"
                            style={{
                                minHeight: "calc(30vh - 100px)",
                                maxHeight: "calc(30vh - 100px)",
                            }}
                        >
                            <MiniFileListView
                                currentItems={currentDirItems}
                                selectedItems={targetItems}
                                setSelectedItems={setTargetItems}
                            />
                        </div>
                    </div>
                )}

                {activeTab === "extract" && (
                    <div>
                        <div className="mb-2 d-flex">
                            <div className="form-label fw-bold me-4">Input Archive Directory</div>
                            <div className="form-text">{lastSelectedItem.name}</div>
                        </div>

                        <div className="mb-2">
                            <div className="form-label fw-bold me-2">List of Contents</div>
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={async () => {
                                    await handleGfptar("list");
                                }}
                            >
                                Get
                            </button>
                        </div>

                        {indirList.length > 0 && (
                            <div className="mb-3">
                                <div
                                    className="mb-3 overflow-auto"
                                    style={{
                                        minHeight: "calc(30vh - 100px)",
                                        maxHeight: "calc(30vh - 100px)",
                                    }}
                                >
                                    <MiniFileListView
                                        currentItems={indirList}
                                        selectedItems={selectedFromList}
                                        setSelectedItems={setSelectedFromList}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-3">
                    <div htmlFor="option-input" className="form-label fw-bold">
                        Options
                    </div>
                    <input
                        id="option-input"
                        type="text"
                        className="form-control form-control-sm"
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                        placeholder="e.g. --jobs=4"
                    />
                </div>
            </div>
        </ModalWindow>
    );
}

export default ArchiveModal;

ArchiveModal.propTypes = {
    showModal: PropTypes.bool,
    setShowModal: PropTypes.func,
    handleMove: PropTypes.func,
    currentDir: PropTypes.string,
    selectedItems: PropTypes.array,
    lastSelectedItem: PropTypes.object,
    currentDirItems: PropTypes.array,
    setSelectedItems: PropTypes.func,
    setItemForGfptar: PropTypes.func,
    refresh: PropTypes.func,
};
