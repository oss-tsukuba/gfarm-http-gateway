import React, { useRef, useEffect } from "react";
import FileIcon from "@components/FileListView/FileIcon";
import { ItemMenu } from "@components/FileListView/FileActionMenu";
import SortDropDownMenu from "@components/FileListView/SortDropDownMenu";
import { formatFileSize, getTimeStr } from "@utils/func";
import { useViewMode } from "@context/ViewModeContext";
import { useDateFormat } from "@context/DateFormatContext";
import "@css/FileListView.css";
import {
    BsArrowUpShort,
    BsArrowDownShort,
    BsListTask,
    BsGridFill,
    BsGrid3X3GapFill,
} from "react-icons/bs";
import PropTypes from "prop-types";

function ListView({
    sortedItems,
    selectedItems,
    active,
    lastSelectedItem,
    ItemMenuActions,
    handleDoubleClick,
    handleClick,
    handleSelectItem,
    handleSelectAll,
    sortDirection,
    setSortDirection,
    setContextMenu,
}) {
    const headerCheckboxRef = useRef(null);
    const { viewMode, setViewMode } = useViewMode();
    const { dateFormat } = useDateFormat();
    const selectedSet = React.useMemo(
        () => new Set(selectedItems?.map((x) => x.path)),
        [selectedItems]
    );

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

    const toggleSortDirection = (column) => {
        setSortDirection((prevSort) => {
            return {
                column,
                order: prevSort.column === column && prevSort.order === "asc" ? "desc" : "asc",
            };
        });
    };

    const toggleViewMode = (mode) => {
        if (mode === "list") {
            return "icon_rg";
        } else if (mode === "icon_rg") {
            return "icon_sm";
        } else {
            return "list";
        }
    };

    const toggleViewModeIcon = (mode) => {
        if (mode === "list") {
            return <BsGridFill />;
        } else if (mode === "icon_rg") {
            return <BsGrid3X3GapFill />;
        } else {
            return <BsListTask />;
        }
    };

    const getSortIcon = (col) => {
        if (sortDirection.column !== col) return null;
        return sortDirection.order === "asc" ? (
            <BsArrowUpShort size="1.1rem" className="ms-1" data-testid="sort-icon-asc" />
        ) : (
            <BsArrowDownShort size="1.1rem" className="ms-1" data-testid="sort-icon-desc" />
        );
    };

    return (
        <>
            <div className="d-none d-sm-block">
                <table className="table file-table table-hover" data-testid="listview">
                    <thead className="bg-body sticky-top">
                        <tr>
                            <th className="align-middle">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    ref={headerCheckboxRef}
                                    onChange={handleSelectAll}
                                    checked={
                                        selectedItems.length === sortedItems.length &&
                                        sortedItems.length > 0
                                    }
                                    id="header-checkbox"
                                    data-testid="header-checkbox"
                                />
                            </th>
                            {/* <th onClick={() => toggleSortDirection("name")}></th> */}
                            <th
                                className="text-nowrap"
                                colSpan={2}
                                onClick={() => toggleSortDirection("Name")}
                                data-testid="header-name"
                            >
                                Name {getSortIcon("Name")}
                            </th>
                            <th
                                className="text-nowrap"
                                onClick={() => toggleSortDirection("Size")}
                                data-testid="header-size"
                            >
                                Size {getSortIcon("Size")}
                            </th>
                            <th
                                className="text-nowrap"
                                onClick={() => toggleSortDirection("Modified")}
                                data-testid="header-date"
                            >
                                Modified {getSortIcon("Modified")}
                            </th>
                            <th
                                onClick={() => setViewMode(toggleViewMode(viewMode))}
                                data-testid="header-viewmode"
                            >
                                {toggleViewModeIcon(viewMode)}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const isSelected = selectedSet.has(item.path);
                            const isLastSelected = active && lastSelectedItem?.path === item.path;
                            return (
                                <tr
                                    key={item.path}
                                    className={`align-middle ${isLastSelected ? "table-active" : ""}`}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setContextMenu({
                                            show: true,
                                            x: e.pageX,
                                            y: e.pageY,
                                            item,
                                        });
                                    }}
                                    data-testid={`row-${item.name}`}
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            id={"checkbox-" + item.name}
                                            className="form-check-input"
                                            onChange={(event) =>
                                                handleSelectItem(event.target.checked, item)
                                            }
                                            checked={isSelected}
                                        />
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        <span className="me-2">
                                            <FileIcon
                                                filename={item.name}
                                                is_dir={item.is_dir}
                                                is_sym={item.is_sym}
                                                size={"1.8rem"}
                                            />
                                        </span>
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        <div className="text-break">{item.name}</div>
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        {formatFileSize(item.size, item.is_dir)}
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        {getTimeStr(item.mtime, dateFormat)}
                                    </td>
                                    <td>
                                        <ItemMenu item={item} actions={ItemMenuActions} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="d-block d-sm-none">
                <table className="table file-table table-hover" data-testid="listview-sm">
                    <thead className="bg-body sticky-top">
                        <tr>
                            <th className="align-middle">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    ref={headerCheckboxRef}
                                    onChange={handleSelectAll}
                                    checked={
                                        selectedItems.length === sortedItems.length &&
                                        sortedItems.length > 0
                                    }
                                    id="header-checkbox-sm"
                                    data-testid="header-checkbox-sm"
                                />
                            </th>
                            <th data-testid="header-name-sm">
                                <SortDropDownMenu
                                    sortDirection={sortDirection}
                                    setSortDirection={setSortDirection}
                                />
                            </th>
                            <th
                                onClick={() => setViewMode(toggleViewMode(viewMode))}
                                data-testid="header-viewmode-sm"
                            >
                                {toggleViewModeIcon(viewMode)}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item) => {
                            const isSelected = selectedSet.has(item.path);
                            const isLastSelected = active && lastSelectedItem?.path === item.path;
                            return (
                                <tr
                                    key={item.path}
                                    className={`align-middle ${isLastSelected ? "table-active" : ""}`}
                                    data-testid={`row-sm-${item.name}`}
                                >
                                    <td>
                                        <input
                                            type="checkbox"
                                            id={"checkbox-" + item.name + "-sm"}
                                            className="form-check-input"
                                            onChange={(event) =>
                                                handleSelectItem(event.target.checked, item)
                                            }
                                            checked={isSelected}
                                        />
                                    </td>
                                    <td
                                        onClick={() => handleClick(!isSelected, item)}
                                        onDoubleClick={() => handleDoubleClick(item)}
                                    >
                                        <div className="d-flex">
                                            <span className="me-2">
                                                <FileIcon
                                                    filename={item.name}
                                                    is_dir={item.is_dir}
                                                    is_sym={item.is_sym}
                                                    size={"1.8rem"}
                                                />
                                            </span>
                                            <div>
                                                <div className="text-break">{item.name}</div>
                                                <div className="small-info">
                                                    <div
                                                        className="text-muted"
                                                        style={{ fontSize: "0.8rem" }}
                                                    >
                                                        {formatFileSize(item.size, item.is_dir)}
                                                        {item.is_dir ? " " : " | "}
                                                        {getTimeStr(item.mtime, dateFormat)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <ItemMenu item={item} actions={ItemMenuActions} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default ListView;

ListView.propTypes = {
    sortedItems: PropTypes.array,
    selectedItems: PropTypes.array,
    active: PropTypes.bool,
    lastSelectedItem: PropTypes.object,
    ItemMenuActions: PropTypes.array,
    handleClick: PropTypes.func,
    handleDoubleClick: PropTypes.func,
    handleSelectItem: PropTypes.func,
    handleSelectAll: PropTypes.func,
    sortDirection: PropTypes.object,
    setSortDirection: PropTypes.func,
    setContextMenu: PropTypes.func,
};
