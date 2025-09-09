import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function dirCommon(path, method, message, params = null) {
    if (!path) {
        return "path is empty";
    }
    const epath = encodePath(path);
    try {
        const url = `${API_URL}/dir${epath}?${params || ""}`;
        const response = await apiFetch(url, {
            credentials: "include",
            method: method,
        });
        if (!response.ok) {
            const error = await response.json();
            console.debug(`dirCommon: ${error.detail}`);
            const message = get_error_message(response.status, error.detail);
            throw new Error(message);
        }
        console.debug(`dirCommon: Success (${message})`);
        return null;
    } catch (error) {
        console.error(error);
        return `${error.name} : ${error.message}`;
    }
}

export async function createDir(path, params = null) {
    // console.debug("createDir:", path);
    return await dirCommon(path, "PUT", "created", params);
}

export async function removeDir(path) {
    // console.debug("removeDir:", path);
    return await dirCommon(path, "DELETE", "removed");
}
