import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

export async function set_acl(path, acl) {
    const epath = encodePath(path);
    const fullpath = `${API_URL}/acl${epath}`;
    try {
        const response = await apiFetch(fullpath, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acl }),
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
    } catch (err) {
        return `${err.name} : ${err.message}`;
    }
}

export async function get_acl(path) {
    const epath = encodePath(path);
    const fullpath = `${API_URL}/acl${epath}`;
    try {
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
        return { data, error: null };
    } catch (err) {
        return { data: null, error: `${err.name} : ${err.message}` };
    }
}
