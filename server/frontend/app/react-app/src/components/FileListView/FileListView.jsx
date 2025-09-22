import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import FileTypeFilter from "@components/FileListView/FileTypeFilter";
import DateFilter from "@components/FileListView/DateFilter";
import UploadMenu from "@components/FileListView/UploadMenu";
import { FileActionMenu, ContextMenu } from "@components/FileListView/FileActionMenu";
import ListView from "@components/FileListView//ListView";
import IconView from "@components/FileListView//IconView";
import {
    filterItems,
    getFileTypes,
    sortItemsByName,
    sortItemsBySize,
    sortItemsByUpdateDate,
    hasTouchScreen,
} from "@utils/func";
import { useViewMode } from "@context/ViewModeContext";
import { useUserInfo } from "@context/UserInfoContext";
import "@css/FileListView.css";
import { BsHouse } from "react-icons/bs";
import { FileItemShape } from "@hooks/useFileList";
import useCloseOthersOnToggle from "@hooks/useCloseOthersOnToggle";
import PropTypes from "prop-types";

function FileListView({
    parentName,
    currentDir,
    currentItems,
    selectedItems,
    setSelectedItems,
    active,
    lastSelectedItem,
    setLastSelectedItem,
    ItemMenuActions,
    UploadMenuActions,
    SelectedMenuActions,
    handleItemClick,
}) {
    const { viewMode } = useViewMode();
    const { userInfo } = useUserInfo();
    const isTouchDevice = hasTouchScreen();
    const [sortDirection, setSortDirection] = useState({ column: "Name", order: "asc" });
    const [filterTypes, setFilterTypes] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const headerCheckboxRef = useRef(null);
    const fileTypes = getFileTypes(currentItems);
    const filteredItems = useMemo(
        () => filterItems(currentItems, filterTypes, dateFilter),
        [currentItems, filterTypes, dateFilter]
    );
    const sortedItems = useMemo(
        () =>
            [...filteredItems].sort((a, b) => {
                if (sortDirection.column === "Name") {
                    return sortItemsByName(a, b, sortDirection.order);
                } else if (sortDirection.column === "Size") {
                    return sortItemsBySize(a, b, sortDirection.order);
                } else if (sortDirection.column === "Modified") {
                    return sortItemsByUpdateDate(a, b, sortDirection.order);
                }
                return 0;
            }),
        [filteredItems, sortDirection]
    );
    const [contextMenu, setContextMenu] = useState({
        show: false,
        x: 0,
        y: 0,
        item: null,
    });

    useCloseOthersOnToggle();

    useEffect(() => {
        setSelectedItems([]);
    }, [filterTypes, dateFilter]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            if (selectedItems.length === 0) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = false;
            } else if (selectedItems.length === sortedItems.length) {
                headerCheckboxRef.current.indeterminate = false;
                headerCheckboxRef.current.checked = true;
            } else {
                headerCheckboxRef.current.indeterminate = true;
            }
        }
    }, [selectedItems, sortedItems]);

    const handleSelectAll = useCallback(
        (event) => {
            if (event.target.checked) {
                setSelectedItems(sortedItems);
            } else {
                setSelectedItems([]);
            }
        },
        [setSelectedItems, sortedItems]
    );

    const handleSelectItem = useCallback(
        (checked, item) => {
            console.debug("handleSelectItem item", item);
            setSelectedItems((prev) => {
                if (checked) {
                    return [...prev, item];
                } else {
                    return prev.filter((selected) => selected.path !== item.path);
                }
            });
            setLastSelectedItem(item);
        },
        [setSelectedItems, setLastSelectedItem]
    );

    const handleClick = useCallback(
        (checked, item) => {
            if (isTouchDevice) {
                handleItemClick(item.path, item.is_file, item.is_dir);
            } else {
                handleSelectItem(checked, item);
            }
        },
        [isTouchDevice, handleItemClick, handleSelectItem]
    );

    const handleDoubleClick = useCallback(
        (item) => {
            if (!isTouchDevice) {
                handleItemClick(item.path, item.is_file, item.is_dir);
            }
        },
        [isTouchDevice, handleItemClick]
    );

    useEffect(() => {
        const handleKeyDownWithSortedItems = (e) => {
            if (e.key === "a" || e.key === "A") {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    setSelectedItems(sortedItems);
                }
            } else if (e.key === "Escape") {
                e.preventDefault();
                setSelectedItems([]);
            }
        };

        window.addEventListener("keydown", handleKeyDownWithSortedItems);
        return () => {
            window.removeEventListener("keydown", handleKeyDownWithSortedItems);
        };
    }, [sortedItems]);

    useEffect(() => {
        const handleKeyDownWithSelectedItems = (e) => {
            // Ignore input elements
            const tag = (e.target?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) {
                return;
            }

            if (e.key === "Delete") {
                e.preventDefault();
                SelectedMenuActions.remove(selectedItems);
            }
        };

        window.addEventListener("keydown", handleKeyDownWithSelectedItems);
        return () => {
            window.removeEventListener("keydown", handleKeyDownWithSelectedItems);
        };
    }, [selectedItems, SelectedMenuActions]);

    useEffect(() => {
        const handleKeyDownWithLastSelectedItem = (e) => {
            if (e.key === "F2") {
                e.preventDefault();
                if (lastSelectedItem) {
                    ItemMenuActions.rename(lastSelectedItem);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDownWithLastSelectedItem);
        return () => {
            window.removeEventListener("keydown", handleKeyDownWithLastSelectedItem);
        };
    }, [lastSelectedItem, ItemMenuActions]);

    return (
        <div className="d-flex flex-column h-100" data-testid="storage-view">
            <div className="flex-shrink-0">
                <div className="d-flex mb-1">
                    <button
                        className="btn btn-sm me-2"
                        type="button"
                        onClick={() => handleItemClick(userInfo.home_directory, false, true)}
                        data-testid="home-button"
                    >
                        <BsHouse style={{ fontSize: "1.1rem" }} />
                    </button>
                    <div className="d-flex flex-wrap">
                        <div className="btn-group me-4" role="group">
                            <FileTypeFilter
                                parentName={parentName}
                                fileTypes={fileTypes}
                                filterTypes={filterTypes}
                                setFilterTypes={setFilterTypes}
                            />
                            <DateFilter dateFilter={dateFilter} setDateFilter={setDateFilter} />
                        </div>

                        <div className="d-flex gap-2">
                            {selectedItems.length === 0 && (
                                <UploadMenu
                                    actions={UploadMenuActions}
                                    uploadDir={currentDir}
                                    currentItems={currentItems}
                                />
                            )}
                            <FileActionMenu
                                selectedItems={selectedItems}
                                actions={SelectedMenuActions}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-grow-1 overflow-hidden" style={{ zIndex: 0 }}>
                {viewMode === "list" ? (
                    <ListView
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        active={active}
                        lastSelectedItem={lastSelectedItem}
                        ItemMenuActions={ItemMenuActions}
                        handleClick={handleClick}
                        handleDoubleClick={handleDoubleClick}
                        handleSelectItem={handleSelectItem}
                        handleSelectAll={handleSelectAll}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        setContextMenu={setContextMenu}
                    />
                ) : (
                    <IconView
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        active={active}
                        lastSelectedItem={lastSelectedItem}
                        ItemMenuActions={ItemMenuActions}
                        handleClick={handleClick}
                        handleDoubleClick={handleDoubleClick}
                        handleSelectItem={handleSelectItem}
                        iconSize={viewMode === "icon_rg" ? "regular" : "small"}
                        handleSelectAll={handleSelectAll}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        setContextMenu={setContextMenu}
                    />
                )}
            </div>
            {contextMenu.show && contextMenu.item && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    item={contextMenu.item}
                    actions={ItemMenuActions} // or whatever actions you pass
                    onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
                />
            )}
        </div>
    );
}

export default FileListView;

FileListView.propTypes = {
    parentName: PropTypes.string.isRequired,
    currentDir: PropTypes.string.isRequired,
    currentItems: PropTypes.arrayOf(FileItemShape).isRequired,
    selectedItems: PropTypes.arrayOf(FileItemShape).isRequired,
    setSelectedItems: PropTypes.func.isRequired,
    active: PropTypes.bool.isRequired,
    lastSelectedItem: FileItemShape.isRequired,
    setLastSelectedItem: PropTypes.func.isRequired,
    ItemMenuActions: PropTypes.array.isRequired,
    UploadMenuActions: PropTypes.array.isRequired,
    SelectedMenuActions: PropTypes.array.isRequired,
    handleItemClick: PropTypes.func.isRequired,
};
