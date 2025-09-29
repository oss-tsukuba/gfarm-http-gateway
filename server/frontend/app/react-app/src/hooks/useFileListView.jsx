import { useState, useCallback, useMemo, useEffect } from "react";
import {
    filterItems,
    getFileTypes,
    sortItemsByName,
    sortItemsBySize,
    sortItemsByUpdateDate,
} from "@utils/func";

const SORTERS = {
    Name: sortItemsByName,
    Size: sortItemsBySize,
    Modified: sortItemsByUpdateDate,
};

const DEFAULT_CONTEXT_MENU = {
    show: false,
    x: 0,
    y: 0,
    item: null,
    source: null,
};

export function useFilteredSortedItems(currentItems, filterTypes, dateFilter, sortDirection) {
    const fileTypes = useMemo(() => getFileTypes(currentItems), [currentItems]);

    const filteredItems = useMemo(
        () => filterItems(currentItems, filterTypes, dateFilter),
        [currentItems, filterTypes, dateFilter]
    );

    const sortedItems = useMemo(() => {
        const sorter = SORTERS[sortDirection.column] ?? sortItemsByName;
        return [...filteredItems].sort((a, b) => sorter(a, b, sortDirection.order));
    }, [filteredItems, sortDirection]);

    return { fileTypes, sortedItems };
}

export function useContextMenuState() {
    const [contextMenu, setContextMenu] = useState(DEFAULT_CONTEXT_MENU);

    const closeContextMenu = useCallback(() => setContextMenu(DEFAULT_CONTEXT_MENU), []);

    const openContextMenu = useCallback((x, y, item, source) => {
        setContextMenu((prev) => {
            if (prev.show) {
                requestAnimationFrame(() =>
                    setContextMenu({ show: true, x, y, item, source: source ?? "contextmenu" })
                );
                return DEFAULT_CONTEXT_MENU;
            }

            return { show: true, x, y, item, source: source ?? "contextmenu" };
        });
    }, []);

    const isButtonMenuOpenFor = useCallback(
        (item) =>
            !!contextMenu &&
            contextMenu.source === "button" &&
            contextMenu.item?.path === item.path,
        [contextMenu]
    );

    return { contextMenu, openContextMenu, closeContextMenu, isButtonMenuOpenFor };
}

export function useFileListKeyboardShortcuts({
    sortedItems,
    selectedItems,
    lastSelectedItem,
    setSelectedItems,
    SelectedMenuActions,
    ItemMenuActions,
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setSelectedItems(sortedItems);
                return;
            }

            if (e.key === "Escape") {
                e.preventDefault();
                setSelectedItems([]);
                return;
            }

            const tagName = (e.target?.tagName || "").toLowerCase();
            const isEditable =
                tagName === "input" || tagName === "textarea" || e.target?.isContentEditable;
            if (isEditable) {
                return;
            }

            if (e.key === "Delete") {
                e.preventDefault();
                SelectedMenuActions.remove(selectedItems);
                return;
            }

            if (e.key === "F2" && lastSelectedItem) {
                e.preventDefault();
                ItemMenuActions.rename(lastSelectedItem);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        sortedItems,
        selectedItems,
        lastSelectedItem,
        setSelectedItems,
        SelectedMenuActions,
        ItemMenuActions,
    ]);
}
