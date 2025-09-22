import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import {
    BsThreeDots,
    BsInfoCircle,
    BsEye,
    BsPencil,
    BsArrowRightSquare,
    BsFiles,
    BsDownload,
    BsTrash,
    BsArchive,
    BsCardChecklist,
    BsShieldLock,
    BsLink45Deg,
    BsFileEarmarkPlus,
} from "react-icons/bs";
import PropTypes from "prop-types";

function FileActionMenu({ actions, selectedItems }) {
    if (selectedItems.length === 0) return null;

    const rawButtons = [
        {
            label: (
                <>
                    <BsDownload className="me-2" /> Download
                </>
            ),
            onClick: () => actions.download(selectedItems),
            testid: "download",
        },
        {
            label: (
                <>
                    <BsTrash className="me-2" /> Delete
                </>
            ),
            onClick: () => actions.remove(selectedItems),
            testid: "delete",
        },
        {
            label: (
                <>
                    <BsArrowRightSquare className="me-2" /> Move
                </>
            ),
            onClick: () => actions.move(selectedItems),
            testid: "move",
        },
        {
            label: (
                <>
                    <BsArchive className="me-2" /> gfptar
                </>
            ),
            onClick: () => actions.archive(),
            testid: "gfptar",
        },
    ];

    return (
        <div className="d-flex align-items-center" data-testid="action-menu">
            <div className="d-none d-md-flex btn-group" role="group">
                {rawButtons.map(({ label, onClick, testid }) => (
                    <button
                        key={testid}
                        className="btn btn-outline-primary btn-sm"
                        onClick={onClick}
                        data-testid={`action-menu-${testid}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="dropdown d-md-none">
                <button
                    className="btn btn-outline-primary btn-sm dropdown-toggle"
                    type="button"
                    id="action-menu-dropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    data-testid="action-menu-dropdown"
                >
                    Actions
                </button>
                <ul className="dropdown-menu" aria-labelledby="action-menu-dropdown">
                    {rawButtons.map(({ label, onClick, testid }) => (
                        <li key={testid}>
                            <button
                                className="dropdown-item"
                                onClick={onClick}
                                data-testid={`action-menu-${testid}-sm`}
                            >
                                {label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <span className="badge bg-light text-dark ms-2">{selectedItems.length} selected</span>
        </div>
    );
}

function buildMenuItems(item, actions, { onClose } = {}) {
    const wrap = (fn) => () => {
        onClose?.();
        fn();
    };

    const base = [
        {
            key: "detail",
            label: "Detail",
            icon: <BsInfoCircle />,
            onClick: () => actions.showDetail(item),
        },
        item.is_file && {
            key: "view",
            label: "View",
            icon: <BsEye />,
            onClick: () => actions.display(item.path),
        },
        { key: "rename", label: "Rename", icon: <BsPencil />, onClick: () => actions.rename(item) },
        {
            key: "move",
            label: "Move",
            icon: <BsArrowRightSquare />,
            onClick: () => actions.move([item]),
        },
        item.is_file && {
            key: "copy",
            label: "Copy",
            icon: <BsFiles />,
            onClick: () => actions.copy(item),
        },
        {
            key: "download",
            label: "Download",
            icon: <BsDownload />,
            onClick: () => actions.download([item]),
        },
        {
            key: "symlink",
            label: "Create Symlink",
            icon: <BsFileEarmarkPlus />,
            onClick: () => actions.create_symlink(item),
        },
        {
            key: "permissions",
            label: "Permissions",
            icon: <BsShieldLock />,
            onClick: () => actions.permission(item),
        },
        {
            key: "acl",
            label: "ACL",
            icon: <BsCardChecklist />,
            onClick: () => actions.accessControl(item),
        },
        { key: "url", label: "URL", icon: <BsLink45Deg />, onClick: () => actions.share(item) },
        {
            key: "delete",
            label: "Delete",
            icon: <BsTrash />,
            onClick: () => actions.remove([item]),
        },
    ].filter(Boolean);

    // ContextMenu では onClose を前段に、ItemMenu ではそのまま
    return base.map(({ key, label, icon, onClick }) => ({
        key,
        label,
        icon,
        onClick: onClose ? wrap(onClick) : onClick,
    }));
}

function MenuList({ items, testidPrefix }) {
    return (
        <>
            {items.map(({ key, label, icon, onClick }) => (
                <li key={key}>
                    <button
                        className="dropdown-item"
                        onClick={onClick}
                        data-testid={testidPrefix ? `${key}-${testidPrefix}` : undefined}
                    >
                        {icon ? (
                            <>
                                {icon} <span className="ms-2">{label}</span>
                            </>
                        ) : (
                            label
                        )}
                    </button>
                </li>
            ))}
        </>
    );
}

function ItemMenu({ item, actions }) {
    const items = buildMenuItems(item, actions, {});

    return (
        <div className="dropdown">
            <button
                type="button"
                className="btn p-0 border-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="item-menu"
                data-bs-auto-close="true"
            >
                <BsThreeDots />
            </button>

            <ul className="dropdown-menu">
                <MenuList items={items} testidPrefix={`menu-${item.name}`} />
            </ul>
        </div>
    );
}

function ContextMenu({ x, y, item, onClose, actions }) {
    const menuRef = useRef(null);
    const [pos, setPos] = useState({ left: x, top: y });
    const PADDING = 8;

    useEffect(() => {
        const handle = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose?.();
        };
        window.addEventListener("click", handle);
        return () => window.removeEventListener("click", handle);
    }, [onClose]);

    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;

        el.style.visibility = "hidden";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.maxWidth = "calc(100vw - 2 * var(--pad))";
        el.style.setProperty("--pad", `${PADDING}px`);
        el.offsetHeight;

        const { offsetWidth: w, offsetHeight: h } = el;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let nx = x,
            ny = y;

        if (x + w + PADDING > vw) nx = x - w;
        if (y + h + PADDING > vh) ny = y - h;

        nx = Math.max(PADDING, Math.min(nx, vw - w - PADDING));
        ny = Math.max(PADDING, Math.min(ny, vh - h - PADDING));

        setPos({ left: nx, top: ny });

        el.style.visibility = "";
    }, [x, y]);

    const items = buildMenuItems(item, actions, { onClose });

    return (
        <ul
            ref={menuRef}
            className="dropdown-menu show position-absolute"
            style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                zIndex: 1050,
                display: "block",
            }}
        >
            <MenuList items={items} />
        </ul>
    );
}

export { FileActionMenu, ItemMenu, ContextMenu };

FileActionMenu.propTypes = {
    selectedItems: PropTypes.array,
    actions: PropTypes.array,
};

MenuList.propTypes = {
    items: PropTypes.array,
    testidPrefix: PropTypes.string,
};

ItemMenu.propTypes = {
    item: PropTypes.object,
    actions: PropTypes.array,
};

ContextMenu.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};
