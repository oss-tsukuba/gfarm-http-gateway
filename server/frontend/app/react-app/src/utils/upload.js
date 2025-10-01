import { encodePath } from "@utils/func";
import { apiFetch, TRANSIENT_STATUS } from "@utils/apiFetch";
import { API_URL, RETRY_COUNT, RETRY_INTERVAL } from "@utils/config";
import get_error_message, { ErrorCodes, get_ui_error } from "@utils/error";

// file: file + File
// progressCallback({status, value, message, done, onCancel})
async function upload(file, fullPath, progressCallback, setError) {
    if (!file) {
        setError("Upload", get_ui_error([ErrorCodes.EMPTY_PATH]).message);
        return;
    }

    const displayPath = fullPath.replace(file.uploadDir + "/", "");
    progressCallback({ value: 0, message: `0 % | 0 sec | 0 bytes/sec\n${displayPath}` });

    const epath = encodePath(fullPath);
    const uploadUrl = `${API_URL}/file` + epath;

    try {
        const uploadOnce = () => {
            const startTime = Date.now();
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl);
            xhr.withCredentials = true;
            xhr.responseType = "json";
            // timeout
            // xhr.timeout = 30 * 60 * 1000; // 30 minutes

            if (file.file.type) xhr.setRequestHeader("Content-Type", file.file.type);
            xhr.setRequestHeader("X-File-Timestamp", file.mtime);

            // ---- Progress (upload side) ----
            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) return;
                const percent = Math.floor((event.loaded / event.total) * 100);
                const elapsed = Date.now() - startTime; // msec.
                const speed = Math.round((event.loaded / elapsed) * 1000);
                const sec = Math.floor(elapsed / 1000);
                progressCallback({
                    value: percent,
                    message: `${percent} % | ${sec} sec | ${speed} bytes/sec\n${displayPath}`,
                });
            };
            // ---- Promise wrapper & cancel ----
            return new Promise((resolve, reject) => {
                // expose cancel BEFORE send to avoid race
                progressCallback({
                    onCancel: () => {
                        try {
                            xhr.abort();
                        } catch {
                            console.warn("abort error:", file.name);
                        }
                        console.warn("cancel:", file.name);
                        reject(new Error("cancelled"));
                    },
                });

                // Success path
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        progressCallback({ value: 100 });
                        console.debug("Upload: success");
                        resolve();
                    } else {
                        const detail = xhr.response?.detail;
                        const msg = get_error_message(xhr.status, detail);
                        console.error(file.name, msg);
                        const error = new Error(msg);
                        error.status = xhr.status;
                        reject(error);
                    }
                };
                // Network-layer failure (RST/offline/proxy)
                xhr.onerror = () => {
                    // status is 0 for network reset / DNS / CORS hard fail
                    reject(new Error("Network Error; Please check your connection and try again."));
                };

                // User or programmatic abort (distinct from network reset)
                xhr.onabort = () => {
                    console.warn("Upload: cancelled");
                    resolve();
                };
                // Slow link timeout (if timeout > 0)
                xhr.ontimeout = () => {
                    reject(new Error("Upload timed out. The connection was too slow or stalled."));
                };
                xhr.send(file.file);
            });
        };
        const maxAttempts = RETRY_COUNT + 1;

        let lastError;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                await uploadOnce();
                return;
            } catch (error) {
                if (error?.message === "cancelled") {
                    console.warn("Upload cancelled by user, skipping retries.");
                    return;
                }

                lastError = error;
                if (shouldNotRetryUpload(error)) {
                    throw error;
                }

                if (attempt < RETRY_COUNT) {
                    console.warn(
                        `Upload attempt ${attempt + 1} failed; retrying (${attempt + 2}/${maxAttempts}).`,
                        error
                    );
                    progressCallback({
                        value: 0,
                        message: `Retrying upload (attempt ${attempt + 2} of ${maxAttempts})\n${displayPath}`,
                    });
                    await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
                } else {
                    throw error;
                }
            }
        }

        if (lastError) throw lastError;
    } catch (error) {
        console.error("Cannot upload:", error);
        setError(file.name, `${error.name} : ${error.message}`);
    }
}

function shouldNotRetryUpload(err) {
    const status = err?.status ?? 0;
    if (status === 0) return false;
    if (TRANSIENT_STATUS.has(status)) return false;
    return true;
}

async function checkPermission(uploadDir) {
    const epath = encodePath(uploadDir);
    const fullPath = `${API_URL}/dir${epath}?show_hidden=on&effperm=on`;
    try {
        const response = await apiFetch(fullPath, {
            credentials: "include",
        });
        if (!response.ok) {
            let detail;
            try {
                const ct = response.headers.get("content-type") || "";
                detail = ct.includes("application/json")
                    ? (await response.json())?.detail
                    : await response.text();
            } catch {
                // no-op
            }
            const message = get_error_message(response.status, detail);
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
