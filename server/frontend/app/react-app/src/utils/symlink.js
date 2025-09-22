import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function getSymlink(symlink, get_fullpath) {
    const epath = encodePath(symlink);
    const fullpath = `${API_URL}/symlink${epath}?get_fullpath${get_fullpath ? "on" : "off"}`;
    const response = await apiFetch(fullpath, {
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
    const data = await response.json();
    return data;
}

async function setSymlink(source, destination) {
    const fullpath = `${API_URL}/symlink`;
    const response = await apiFetch(fullpath, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
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
    return "";
}

export { getSymlink, setSymlink };
