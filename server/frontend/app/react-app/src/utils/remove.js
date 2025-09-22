import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function removeItem(path, isFile = true) {
    if (!path) {
        alert("Please input Gfarm path");
    }
    const epath = encodePath(path);
    try {
        const url = isFile
            ? `${API_URL}/file${epath}`
            : `${API_URL}/file${epath}?force=on&recursive=on`;
        console.debug("delete url", url);
        const response = await apiFetch(url, {
            credentials: "include",
            method: "DELETE",
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
        console.debug("Success (removed)");
        return null;
    } catch (error) {
        console.error(error);
        return `${error.name} : ${error.message}`;
    }
}

export default async function removeItems(files, refresh) {
    if (!files) {
        return null;
    }

    for (const file of files) {
        const error = await removeItem(file.path, file.is_file);
        if (error) {
            return error;
        }
    }
    refresh();
    return null;
}
