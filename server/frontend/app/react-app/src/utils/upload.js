import { encodePath, getParentPath } from "@utils/func";
import { createDir } from "@utils/dircommon";
import { API_URL } from "@utils/config";
import get_error_message, { ErrorCodes, get_ui_error } from "@utils/error";

// file: file + File
// progressCallback({status, value, message, done, onCancel})
async function upload(file, fullPath, dirSet, progressCallback, setError) {
    if (!file) {
        setError("Upload", get_ui_error([ErrorCodes.EMPTY_PATH]).message);
        return;
    }
    const uploadDirPath = file.is_file ? getParentPath(file.destPath) : file.destPath;
    const startTime = Date.now();

    const displayPath = fullPath.replace(file.uploadDir + "/", "");
    const message = `0 % | 0 sec | 0 bytes/sec\n${displayPath}`;
    progressCallback({ value: 0, message });

    // console.debug("uploadDirPath", uploadDirPath);
    // console.debug("fullPath", fullPath);

    // createDir
    let createDirError = null;
    if (!dirSet.has(uploadDirPath)) {
        createDirError = await createDir(uploadDirPath, "p=on");
        dirSet.add(uploadDirPath);
        // console.debug("dirSet", dirSet);
    }

    if (createDirError) {
        setError(uploadDirPath, createDirError);
        return;
    }

    const epath = encodePath(fullPath);
    const uploadUrl = `${API_URL}/file` + epath;
    // console.debug("uploadUrl:", uploadUrl);

    try {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.withCredentials = true;
        xhr.responseType = "json";

        xhr.setRequestHeader("Content-Type", file.file.type);
        xhr.setRequestHeader("X-File-Timestamp", file.mtime);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsedTime = Date.now() - startTime; // msec.
                const speed = Math.round((event.loaded / elapsedTime) * 1000);
                const sec = Math.floor(elapsedTime / 1000);
                const value = percent;
                const message = `${percent} % | ${sec} sec | ${speed} bytes/sec\n${displayPath}`;
                progressCallback({ value, message });
                // console.debug("uploaded: %d / %d (%d %)", event.loaded, event.total, percent);
            }
        };
        return new Promise((resolve, reject) => {
            progressCallback({
                onCancel: () => {
                    xhr.abort();
                    console.warn("cancel:", file.name);
                    reject(new Error("cancelled"));
                },
            });
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progressCallback({
                        // status: "completed", set in handleUpload()
                        value: 100,
                        // message: "",         set in handleUpload()
                        // done: true,          set in handleUpload()
                    });
                    console.debug("Upload: success");
                    resolve();
                } else {
                    const detail = xhr.response?.detail;
                    const message = "Error : " + get_error_message(xhr.status, detail);
                    setError(file.name, message);
                    console.error(file.name, message);
                    reject(new Error(message));
                }
            };
            xhr.onerror = () => {
                setError(file.name, "Network error");
                reject(new Error("Network error"));
            };
            xhr.send(file.file);
        });
    } catch (error) {
        console.error("Cannot upload:", error);
        const message = `${error.name} : ${error.message}`;
        setError(file.name, message);
        return;
    }
}

async function checkPermission(uploadDir) {
    const epath = encodePath(uploadDir);
    const fullPath = `${API_URL}/dir${epath}?show_hidden=on&effperm=on`;
    let error = null;
    try {
        const response = await fetch(fullPath, {
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message);
        }
        const data = await response.json();
        if (data[0].perms.includes("w")) {
            console.debug("permission check", uploadDir, data[0].perms.includes("w"));
        } else {
            const message = get_error_message(403, `Permission denied : ${uploadDir}`);
            throw new Error(message);
        }
    } catch (err) {
        error = `${err.name}: ${err.message}`;
    }
    return error;
}

export { upload, checkPermission };
