import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function getAttribute(filepath, cksum, symlink) {
    const epath = encodePath(filepath);
    const fullpath = `${API_URL}/attr${epath}?check_sum=${cksum ? "on" : "off"}&check_symlink=${symlink ? "on" : "off"}`;

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
    const json = await response.json();
    return json;
}

export default getAttribute;
