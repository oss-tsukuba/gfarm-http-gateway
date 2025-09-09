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
    const json = await response.json();
    if (!response.ok) {
        const message = get_error_message(response.status, json.detail);
        throw new Error(message);
    }
    return json;
}

export default getAttribute;
