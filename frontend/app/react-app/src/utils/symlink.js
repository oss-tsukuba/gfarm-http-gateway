import { encodePath } from "@utils/func";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function getSymlink(symlink, get_fullpath) {
    const epath = encodePath(symlink);
    const fullpath = `${API_URL}/symlink${epath}?get_fullpath${get_fullpath ? "on" : "off"}`;
    const response = await fetch(fullpath, {
        credentials: "include",
    });
    if (!response.ok) {
        const error = await response.json();
        const message = get_error_message(response.status, error.detail);
        throw new Error(message);
    }
    const data = await response.json();
    return data;
}

async function setSymlink(source, destination) {
    const fullpath = `${API_URL}/symlink`;
    const response = await fetch(fullpath, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
    });
    if (!response.ok) {
        const error = await response.json();
        const message = get_error_message(response.status, error.detail);
        throw new Error(message);
    }
    return "";
}

export { getSymlink, setSymlink };
