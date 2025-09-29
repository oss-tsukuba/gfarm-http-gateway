import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import FileTypeFilter from "@components/FileListView/FileTypeFilter";
import DateFilter from "@components/FileListView/DateFilter";
import UploadMenu from "@components/FileListView/UploadMenu";
import { FileActionMenu, ContextMenu } from "@components/FileListView/FileActionMenu";
import ListView from "@components/FileListView/ListView";
import IconView from "@components/FileListView/IconView";
import { hasTouchScreen } from "@utils/func";
import { useViewMode } from "@context/ViewModeContext";
import { useUserInfo } from "@context/UserInfoContext";
import "@css/FileListView.css";
import { BsHouse } from "react-icons/bs";
import {
    useFilteredSortedItems,
    useContextMenuState,
    useFileListKeyboardShortcuts,
} from "@hooks/useFileListView";
import { FileItemShape } from "@hooks/useFileList";
import {
    ItemMenuActionsShape,
    UploadMenuActionsShape,
    SelectedMenuActionsShape,
} from "@components/FileListView/propTypes";
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
    const isTouchDevice = useMemo(() => hasTouchScreen(), []);
    const [sortDirection, setSortDirection] = useState({ column: "Name", order: "asc" });
    const [filterTypes, setFilterTypes] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const headerCheckboxRef = useRef(null);
    const { fileTypes, sortedItems } = useFilteredSortedItems(
        currentItems,
        filterTypes,
        dateFilter,
        sortDirection
    );
    const { contextMenu, openContextMenu, closeContextMenu, isButtonMenuOpenFor } =
        useContextMenuState();

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
        (checked, item, force = false) => {
            if (isTouchDevice || force) {
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

    useFileListKeyboardShortcuts({
        sortedItems,
        selectedItems,
        lastSelectedItem,
        setSelectedItems,
        SelectedMenuActions,
        ItemMenuActions,
    });

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
                        handleClick={handleClick}
                        handleDoubleClick={handleDoubleClick}
                        handleSelectItem={handleSelectItem}
                        handleSelectAll={handleSelectAll}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        openContextMenu={openContextMenu}
                        closeContextMenu={closeContextMenu}
                        isButtonMenuOpenFor={isButtonMenuOpenFor}
                    />
                ) : (
                    <IconView
                        sortedItems={sortedItems}
                        selectedItems={selectedItems}
                        active={active}
                        lastSelectedItem={lastSelectedItem}
                        handleClick={handleClick}
                        handleDoubleClick={handleDoubleClick}
                        handleSelectItem={handleSelectItem}
                        iconSize={viewMode === "icon_rg" ? "regular" : "small"}
                        handleSelectAll={handleSelectAll}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        openContextMenu={openContextMenu}
                        closeContextMenu={closeContextMenu}
                        isButtonMenuOpenFor={isButtonMenuOpenFor}
                    />
                )}
            </div>
            {contextMenu.show && contextMenu.item && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    item={contextMenu.item}
                    actions={ItemMenuActions}
                    onClose={() => closeContextMenu()}
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
    lastSelectedItem: PropTypes.oneOfType([FileItemShape, PropTypes.oneOf([null])]).isRequired,
    setLastSelectedItem: PropTypes.func.isRequired,
    ItemMenuActions: ItemMenuActionsShape.isRequired,
    UploadMenuActions: UploadMenuActionsShape.isRequired,
    SelectedMenuActions: SelectedMenuActionsShape.isRequired,
    handleItemClick: PropTypes.func.isRequired,
};
