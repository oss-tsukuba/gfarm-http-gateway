import React from "react";
import { escapeRegExp } from "@utils/func";
import { GFARM_PREFIX } from "@utils/config";
import PropTypes from "prop-types";

const hasPrefixedScheme = (path, prefix) => {
    const p = String(prefix);
    const re = new RegExp(`^/?${escapeRegExp(p)}://`, "i");
    return re.test(path || "");
};

const getAuthorityRoot = (path, prefix) => {
    const p = String(prefix);
    const re = new RegExp(`^/?(${escapeRegExp(p)}://[^/]+)`, "i");
    const m = (path || "").match(re);
    if (!m) return null;
    // Normalize to "prefix://authority/" (no leading slash, has trailing slash)
    const base = m[1].replace(/\/+$/, "");
    return base;
};

const splitGfarmPath = (input, prefix) => {
    const path = String(input || "");
    if (hasPrefixedScheme(path, prefix)) {
        const root = getAuthorityRoot(path, prefix); // "prefix://authority/"
        if (!root) return [];
        const after = path.replace(/^\/?/, "").slice(root.length); // strip optional "/" then root
        const tail = after.split("/").filter(Boolean);
        return [root, ...tail];
    }

    // Relative path
    return path.split("/").filter(Boolean);
};

function CurrentDirView({ currentDir, onNavigate }) {
    // const parts = currentDir.split("/").filter(Boolean); // remove empty strings
    const parts = splitGfarmPath(currentDir, GFARM_PREFIX);

    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
                <li className="breadcrumb-item">
                    <button
                        type="button"
                        className="btn p-0"
                        onClick={() => {
                            onNavigate("/");
                        }}
                    >
                        <img
                            src="./assets/Gfarm_logo_tate_color.svg"
                            alt="Logo"
                            width="30"
                            height="30"
                            className="d-inline-block align-text-top"
                        />
                    </button>
                </li>
                {parts.map((part, index) => {
                    const path = "/" + parts.slice(0, index + 1).join("/");
                    return (
                        <li key={index} className="breadcrumb-item">
                            <button
                                type="button"
                                className="btn p-0"
                                onClick={() => {
                                    onNavigate(path);
                                }}
                            >
                                {part}
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export default CurrentDirView;

CurrentDirView.propTypes = {
    currentDir: PropTypes.string,
    onNavigate: PropTypes.func,
};
