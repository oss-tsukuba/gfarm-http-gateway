import { encodePath } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

async function changeMode(path, mode) {
    if (!path) {
        return "path is empty";
    }

    const epath = encodePath(path);
    const url = `${API_URL}/attr${epath}`;

    const data = JSON.stringify(
        {
            Mode: mode,
        },
        null,
        2
    );

    try {
        const response = await apiFetch(url, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: data,
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
    } catch (error) {
        console.error(error);
        return `${error.name} : ${error.message}`;
    }
    return null;
}

export default changeMode;
