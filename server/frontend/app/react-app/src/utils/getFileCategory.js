let fileMeta = null;

export const loadFileMeta = async () => {
    if (fileMeta) {
        return fileMeta;
    }
    try {
        const res = await fetch("./assets/file_icons.json");
        if (!res.ok) {
            console.debug("Failed to load file_icons.json");
            throw new Error("Failed to load file_icons.json");
        }
        console.debug("Load file_icons.json");

        fileMeta = await res.json();
        fileMeta._extensionToCategoryMap = {};
        for (const [category, extensions] of Object.entries(fileMeta.category)) {
            for (const ext of extensions) {
                fileMeta._extensionToCategoryMap[ext.toLowerCase()] = category;
            }
        }
    } catch (error) {
        console.error("Error :", error);
        fileMeta = null;
    }
    return fileMeta;
};

export const getIconCSS = async () => {
    const meta = await loadFileMeta();
    return meta.css;
};

export const getFileCategory = async (ext) => {
    const meta = await loadFileMeta();
    if (meta === null) {
        return "unknown";
    }
    ext = ext.toLowerCase();
    return meta._extensionToCategoryMap[ext] || "unknown";
};

const getFileIconDefault = (ext, is_dir, is_sym) => {
    ext = ext.toLowerCase();
    if (is_dir) {
        return "bi bi-folder";
    }
    if (is_sym) {
        return "bi bi-folder-symlink";
    }

    switch (ext) {
        case "pdf":
            return "bi bi-file-earmark-pdf";
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
            return "bi bi-file-earmark-image";
        case "mp4":
        case "webm":
            return "bi bi-file-earmark-play";
        case "mp3":
        case "wav":
            return "bi bi-file-earmark-music";
        case "js":
        case "py":
        case "html":
        case "css":
            return "bi bi-file-earmark-code";
        case "zip":
        case "rar":
        case "tar":
        case "gz":
            return "bi bi-file-earmark-zip";
        default:
            return "bi bi-file-earmark"; // Default file icon
    }
};

export const getFileIcon = async (ext, is_dir, is_sym) => {
    const meta = await loadFileMeta();
    if (meta == null) {
        return getFileIconDefault(ext, is_dir, is_sym);
    }
    if (is_dir) {
        return meta.icons?.["folder"] || getFileIconDefault(ext, is_dir, is_sym);
    }
    if (is_sym) {
        return meta.icons?.["symlink"] || getFileIconDefault(ext, is_dir, is_sym);
    }
    const category = await getFileCategory(ext);
    return meta.icons?.[category] || getFileIconDefault(ext, is_dir, is_sym);
};
