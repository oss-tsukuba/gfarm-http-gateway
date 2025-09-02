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
    try {
        const response = await fetch(fullPath, {
            credentials: "include",
        });
        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty response body");

        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let perms = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const nl = buffer.indexOf("\n");
                if (nl !== -1) {
                    const firstLine = buffer.slice(0, nl).trim();
                    if (firstLine) {
                        let json;
                        try {
                            json = JSON.parse(firstLine);
                        } catch (e) {
                            console.warn("Failed to parse line", e);
                        }
                        if (json && typeof json.perms === "string") perms = json.perms;
                    }
                    break;
                }
            }
        } finally {
            try {
                reader.releaseLock();
            } catch {
                console.warn("upload: failed to releaseLock()");
            }
        }

        if (!perms) {
            try {
                const fallback = await response.clone().json();
                if (Array.isArray(fallback) && fallback[0]?.perms) {
                    perms = String(fallback[0].perms);
                }
            } catch (e) {
                console.warn("upload: Failed to get perms", e);
            }
        }

        if (!perms) {
            throw new Error("Failed to read permission info");
        }

        if (perms.includes("w")) {
            console.debug("permission check", uploadDir, true);
            return null;
        } else {
            throw new Error(get_error_message(403, `Permission denied : ${uploadDir}`));
        }
    } catch (err) {
        return `${err.name}: ${err.message}`;
    }
}

export { upload, checkPermission };
