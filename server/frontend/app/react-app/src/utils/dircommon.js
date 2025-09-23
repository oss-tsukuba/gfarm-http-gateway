import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function dirCommon(path, method, message, params = null) {
    if (!path) {
        return "path is empty";
    }
    const epath = encodePath(path);

    const url = `${API_URL}/dir${epath}?${params || ""}`;
    const response = await apiFetch(url, {
        credentials: "include",
        method: method,
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
        console.debug(`dirCommon: ${detail}`);
        const message = get_error_message(response.status, detail);
        throw new Error(message);
    }
    console.debug(`dirCommon: Success (${message})`);
    return null;
}

export async function createDir(path, params = null) {
    // console.debug("createDir:", path);
    return await dirCommon(path, "PUT", "created", params);
}

export async function removeDir(path) {
    // console.debug("removeDir:", path);
    return await dirCommon(path, "DELETE", "removed");
}
