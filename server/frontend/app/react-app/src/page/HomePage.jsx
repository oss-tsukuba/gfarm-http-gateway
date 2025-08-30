import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FileListView from "@components/FileListView/FileListView";
import CurrentDirView from "@components/CurrentDirView";
import SidePanel from "@components/SidePanel/SidePanel";
import ProgressView from "@components/ProgressView";
import UploadDropZone from "@components/UploadDropZone";
import UserMenu from "@components/UserMenu";
import MoveModal from "@components/Modal/MoveModel";
import ArchiveModal from "@components/Modal/ArchiveModal";
import DeleteModal from "@components/Modal/DeleteModal";
import NewDirModal from "@components/Modal/NewDirModal";
import NewSymlinkModal from "@components/Modal/NewSymlinkModal";
import RenameModal from "@components/Modal/RenameModal";
import SettingsModal from "@components/Modal/SettingsModal";
import useFileList from "@hooks/useFileList";
import useProgressTasks from "@hooks/useProgressTasks";
import useGetPath from "@hooks/useGetPath";
import { useUserInfo } from "@context/UserInfoContext";
import { useShowHidden } from "@context/ShowHiddenContext";
import { useNotifications } from "@context/NotificationContext";
import { ROUTE_STORAGE } from "@utils/config";
import displayFile from "@utils/display";
import { getSymlink } from "@utils/symlink";
import { getParentPath } from "@utils/func";
import { ErrorCodes, get_ui_error } from "@utils/error";
import LoginPage from "@page/LoginPage";
import ErrorPage from "@page/ErrorPage";
import PropTypes from "prop-types";

function HomePage() {
    const { userInfo, loading: userLoading } = useUserInfo();
    const { showHidden } = useShowHidden();
    const navigate = useNavigate();
    const { pathHead, gfarmPath: currentDir } = useGetPath(ROUTE_STORAGE);
    const {
        currentItems,
        loading: listLoading,
        listGetError,
        refreshItems,
    } = useFileList(currentDir, showHidden);
    const { addNotification } = useNotifications();
    const [selectedItems, setSelectedItems] = useState([]);
    const [lastSelectedItem, setLastSelectedItem] = useState(null);
    const {
        tasks,
        showProgressView,
        itemsToMove,
        itemsToDelete,
        setShowProgressView,
        addItemsToUpload,
        addItemsToDownload,
        setItemsToMove,
        setItemsToDelete,
        setItemToCopy,
        setItemForGfptar,
        removeDoneTasks,
        removeTasks,
    } = useProgressTasks(refreshItems, addNotification);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showNewDirModal, setShowNewDirModal] = useState(false);
    const [showSymlinkModal, setShowSymlinkModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showGfptarModal, setShowGfptarModal] = useState(false);
    const [showSidePanel, setShowSidePanel] = useState({ show: false, tab: "detail" });

    useEffect(() => {
        setSelectedItems((prev) =>
            prev.filter((selected) => currentItems.some((item) => item.path === selected.path))
        );
        if (currentItems.length === 1) {
            if (currentDir === currentItems[0].path) {
                setLastSelectedItem(currentItems[0]);
                setSelectedItems([currentItems[0]]);
                navigate(pathHead + getParentPath(currentDir));
                setShowSidePanel({ show: true, tab: "detail" });
            }
        }
    }, [currentItems]);

    useEffect(() => {
        if (itemsToDelete.length > 0) {
            setShowDeleteModal(true);
        }
    }, [itemsToDelete]);

    useEffect(() => {
        if (itemsToMove.length > 0) {
            setShowMoveModal(true);
        }
    }, [itemsToMove]);

    const jumpDirectory = useCallback(
        (newdir) => {
            if (currentDir === newdir) {
                refreshItems();
            } else {
                navigate(pathHead + newdir);
            }
        },
        [currentDir, pathHead, navigate]
    );

    const handleDisplayFile = useCallback((path) => {
        displayFile(path);
    }, []);

    const handleSymlink = useCallback(
        async (symlink) => {
            console.debug("handleSymlink", symlink);
            try {
                const info = await getSymlink(symlink, false);
                if (info.is_file) {
                    handleDisplayFile(info.path);
                } else if (info.is_sym) {
                    // Theoretically unreachable, added only for completeness/safety.
                    addNotification(
                        info.name,
                        get_ui_error([ErrorCodes.NOT_FOUND]).message,
                        get_ui_error([ErrorCodes.NOT_FOUND]).type
                    );
                } else {
                    jumpDirectory(info.path);
                }
            } catch (err) {
                addNotification(symlink, `${err.name} : ${err.message}`, "error");
            }
        },
        [handleDisplayFile, jumpDirectory, addNotification]
    );

    const handleItemClick = useCallback(
        (path, is_file, is_dir) => {
            if (is_file) {
                handleDisplayFile(path);
            } else if (is_dir) {
                jumpDirectory(path);
            } else {
                handleSymlink(path);
            }
        },
        [handleDisplayFile, jumpDirectory, handleSymlink]
    );

    const handleShowDetail = useCallback((item, tab) => {
        setLastSelectedItem(item);
        setShowSidePanel({ show: true, tab });
    }, []);

    const handleRename = useCallback((item) => {
        setLastSelectedItem(item);
        setShowRenameModal(true);
    }, []);

    const handleCopy = useCallback(
        async (item) => {
            setItemToCopy(
                item,
                currentItems.map((item) => item.name)
            );
        },
        [currentItems, setItemToCopy]
    );

    const ItemMenuActions = useMemo(
        () => ({
            download: addItemsToDownload,
            showDetail: (item) => {
                handleShowDetail(item, "detail");
            },
            display: handleDisplayFile,
            remove: setItemsToDelete,
            move: setItemsToMove,
            rename: handleRename,
            copy: handleCopy,
            permission: (item) => {
                handleShowDetail(item, "perms");
            },
            accessControl: (item) => {
                handleShowDetail(item, "acl");
            },
            share: (item) => {
                handleShowDetail(item, "url");
            },
            create_symlink: (item) => {
                setLastSelectedItem(item);
                setShowSymlinkModal(true);
            },
        }),
        [
            addItemsToDownload,
            handleShowDetail,
            handleDisplayFile,
            setItemsToDelete,
            setItemsToMove,
            handleRename,
            handleCopy,
        ]
    );

    const UploadMenuActions = useMemo(
        () => ({
            upload: addItemsToUpload,
            create: () => {
                setShowNewDirModal(true);
            },
            create_symlink: () => {
                setLastSelectedItem(null);
                setShowSymlinkModal(true);
            },
        }),
        [addItemsToUpload]
    );

    const SelectedMenuActions = useMemo(
        () => ({
            download: addItemsToDownload,
            remove: setItemsToDelete,
            move: setItemsToMove,
            archive: () => {
                setShowGfptarModal(true);
            },
        }),
        [addItemsToDownload, setItemsToDelete, setItemsToMove]
    );

    if (userLoading) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: "100vh" }}
            >
                <div className="spinner-border" role="status" aria-hidden="true" />
                <span className="ms-2">Loading...</span>
            </div>
        );
    }
    if (!userInfo) return <LoginPage />;
    if (listGetError) return <ErrorPage error={listGetError} />;

    return (
        <div className="container-fluid bg-body vh-100 d-flex flex-column">
            <div className="flex-shrink-0">
                <nav className="navbar">
                    <div className="container-fluid d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start w-100">
                            <div className="me-3 flex-grow-1">
                                <CurrentDirView
                                    currentDir={currentDir}
                                    onNavigate={jumpDirectory}
                                />
                            </div>
                            <div className="flex-shrink-0">
                                <UserMenu />
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
            <div className="flex-grow-1 d-flex flex-column overflow-hidden">
                {listLoading ? (
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="spinner-border" role="status" aria-hidden="true" />
                    </div>
                ) : (
                    <FileListView
                        parentName="HomePage"
                        currentDir={currentDir}
                        currentItems={currentItems}
                        selectedItems={selectedItems}
                        setSelectedItems={setSelectedItems}
                        setLastSelectedItem={setLastSelectedItem}
                        active={showSidePanel.show}
                        lastSelectedItem={lastSelectedItem}
                        handleItemClick={handleItemClick}
                        ItemMenuActions={ItemMenuActions}
                        UploadMenuActions={UploadMenuActions}
                        SelectedMenuActions={SelectedMenuActions}
                    />
                )}
            </div>
            <SidePanel
                show={showSidePanel.show}
                showTab={showSidePanel.tab}
                item={lastSelectedItem}
                onHide={() => {
                    setShowSidePanel({ show: false, tab: "" });
                }}
            />
            <ProgressView
                show={showProgressView}
                onHide={() => {
                    setShowProgressView(false);
                }}
                tasks={tasks}
                removeDoneTasks={removeDoneTasks}
                removeTasks={removeTasks}
            />
            {!showProgressView && tasks.length > 0 && (
                <button
                    className="btn btn-primary position-fixed end-0 bottom-0 m-3"
                    onClick={() => {
                        setShowProgressView(true);
                    }}
                >
                    <i className="bi bi-arrow-repeat me-2"></i> Show Progress
                </button>
            )}
            <UploadDropZone
                onUpload={addItemsToUpload}
                uploadDir={currentDir}
                currentItems={currentItems}
            />
            {showDeleteModal && (
                <DeleteModal
                    setShowModal={setShowDeleteModal}
                    itemsToDelete={itemsToDelete}
                    setItemsToDelete={setItemsToDelete}
                    refresh={() => {
                        setSelectedItems((prev) =>
                            prev.filter((item) =>
                                itemsToDelete.some((deletedItem) => deletedItem.path !== item.path)
                            )
                        );
                        setItemsToDelete([]);
                        refreshItems();
                    }}
                />
            )}
            {showNewDirModal && (
                <NewDirModal
                    setShowModal={setShowNewDirModal}
                    currentDir={currentDir}
                    refresh={() => refreshItems()}
                />
            )}
            {showSymlinkModal && (
                <NewSymlinkModal
                    setShowModal={setShowSymlinkModal}
                    currentDir={currentDir}
                    targetItem={lastSelectedItem}
                    refresh={() => refreshItems()}
                />
            )}
            {showRenameModal && (
                <RenameModal
                    setShowModal={setShowRenameModal}
                    renameItem={lastSelectedItem}
                    refresh={() => {
                        setSelectedItems((prev) =>
                            prev.filter((item) => lastSelectedItem.path !== item.path)
                        );
                        setLastSelectedItem(null);
                        refreshItems();
                    }}
                />
            )}
            {showMoveModal && (
                <MoveModal
                    setShowModal={setShowMoveModal}
                    itemsToMove={itemsToMove}
                    setItemsToMove={setItemsToMove}
                    currentDir={currentDir}
                    refresh={() => {
                        setSelectedItems((prev) =>
                            prev.filter((file) =>
                                itemsToMove.some((movedItem) => movedItem.path !== file.path)
                            )
                        );
                        setItemsToMove([]);
                        refreshItems();
                    }}
                />
            )}
            {showGfptarModal && (
                <ArchiveModal
                    setShowModal={setShowGfptarModal}
                    selectedItems={selectedItems}
                    setSelectedItems={setSelectedItems}
                    lastSelectedItem={lastSelectedItem}
                    currentDirItems={currentItems}
                    currentDir={currentDir}
                    setItemForGfptar={setItemForGfptar}
                />
            )}
            <SettingsModal />
        </div>
    );
}

export default HomePage;

HomePage.propTypes = {
    user: PropTypes.string,
    home_directory: PropTypes.string,
};
