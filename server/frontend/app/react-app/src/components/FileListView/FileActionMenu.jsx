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

function ItemMenu({ item, isOpen, onOpen, onClose }) {
    const btnRef = useRef(null);

    const openAtButton = () => {
        const r = btnRef.current.getBoundingClientRect();
        onOpen(r.left, r.bottom, item, "button");
    };

    return (
        <button
            ref={btnRef}
            type="button"
            className="btn p-0 border-0"
            aria-haspopup="menu"
            aria-expanded={isOpen ? "true" : "false"}
            data-testid="item-menu"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isOpen) {
                    onClose();
                } else {
                    openAtButton();
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen(e.clientX, e.clientY, item);
            }}
        >
            <BsThreeDots />
        </button>
    );
}

function ContextMenu({ x, y, item, actions, onClose }) {
    const ref = useRef(null);
    const [pos, setPos] = useState({ left: x, top: y });
    const EDGE = 8;

    useEffect(() => {
        const handle = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose?.();
        };
        window.addEventListener("click", handle);
        return () => window.removeEventListener("click", handle);
    }, [onClose]);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;

        // el.style.visibility = "hidden";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.maxWidth = `calc(100vw - ${EDGE * 2}px)`;
        void el.offsetHeight;

        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let nx = x;
        let ny = y;

        if (x + w + EDGE > vw) nx = x - w;
        if (y + h + EDGE > vh) ny = y - h;

        nx = Math.max(EDGE, Math.min(nx, vw - w - EDGE));
        ny = Math.max(EDGE, Math.min(ny, vh - h - EDGE));

        setPos({ left: nx, top: ny });
        el.style.visibility = "";
    }, [x, y]);

    useEffect(() => {
        const relayout = () => {
            const el = ref.current;
            if (!el) return;
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            setPos((p) => ({
                left: Math.max(EDGE, Math.min(p.left, vw - w - EDGE)),
                top: Math.max(EDGE, Math.min(p.top, vh - h - EDGE)),
            }));
        };
        window.addEventListener("resize", relayout);
        window.addEventListener("orientationchange", relayout);
        return () => {
            window.removeEventListener("resize", relayout);
            window.removeEventListener("orientationchange", relayout);
        };
    }, []);

    const items = buildMenuItems(item, actions, { onClose, withIcons: false });

    return (
        <ul
            ref={ref}
            className="dropdown-menu show"
            role="menu"
            style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                zIndex: 1050,
                display: "block",
                maxWidth: `min(360px, calc(100vw - ${EDGE * 2}px))`,
                wordBreak: "break-word",
                whiteSpace: "normal",
            }}
        >
            <MenuList items={items} testidPrefix={`menu-${item.name}`} />
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
    isOpen: PropTypes.bool.isRequired,
    onOpen: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

ContextMenu.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};
