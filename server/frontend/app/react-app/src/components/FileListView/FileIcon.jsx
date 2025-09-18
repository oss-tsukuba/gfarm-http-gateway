import React, { useEffect, useState } from "react";
import { getFileIcon } from "@utils/getFileCategory";
import PropTypes from "prop-types";

function FileIcon({ filename, is_dir, is_sym, size, onClick, onDoubleClick }) {
    const [iconClass, setIconClass] = useState("bi bi-file-earmark");
    const extension = filename.split(".").pop();

    useEffect(() => {
        let active = true;
        const loadIcons = async () => {
            const classname = await getFileIcon(extension, is_dir, is_sym);
            if (active) setIconClass(classname);
        };
        loadIcons();

        return () => {
            active = false;
        };
    }, []);

    return (
        <i
            className={iconClass || ""}
            style={{ fontSize: size || "1.5rem" }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
        ></i>
    );
}

export default FileIcon;

FileIcon.propTypes = {
    filename: PropTypes.string,
    is_dir: PropTypes.bool,
    is_sym: PropTypes.bool,
    size: PropTypes.string,
    onClick: PropTypes.func,
    onDoubleClick: PropTypes.func,
};
