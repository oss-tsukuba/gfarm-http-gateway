import React from "react";
import { ESCAPED_PREFIX_FOR_REGEX, RE_HAS_SCHEME_PREFIX, normalizeGfarmUrl } from "@utils/func";
import PropTypes from "prop-types";

const RE_SCHEME_AUTHORITY = new RegExp(`^/?(${ESCAPED_PREFIX_FOR_REGEX}://[^/]+)`, "i");

const getAuthorityRoot = (path) => {
    const m = RE_SCHEME_AUTHORITY.exec(path);
    return m?.[1] ?? null;
};

const splitGfarmPath = (input) => {
    const path = String(input || "");
    console.log("splitGfarmPath input", input);
    console.log("splitGfarmPath path", path);
    const root = getAuthorityRoot(path); // "prefix://authority/"
    if (root) {
        const after = path.replace(/^\/?/, "").slice(root.length); // strip optional "/" then root
        const tail = after.split("/").filter(Boolean);
        return [root, ...tail];
    }
    if (RE_HAS_SCHEME_PREFIX.test(path)) {
        const normalized = normalizeGfarmUrl(path);
        return normalized.split("/").filter(Boolean);
    }
    // Relative path
    return path.split("/").filter(Boolean);
};

function CurrentDirView({ currentDir, onNavigate }) {
    // const parts = currentDir.split("/").filter(Boolean); // remove empty strings
    const parts = splitGfarmPath(currentDir);

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
