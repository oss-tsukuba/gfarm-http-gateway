import { API_URL } from "@utils/config";
import { apiFetch } from "@utils/apiFetch";
import get_error_message from "@utils/error";

export async function get_username() {
    try {
        const res = await apiFetch(`${API_URL}/c/me`, { method: "GET", credentials: "include" });
        if (!res.ok) {
            const error = await res.json();
            const message = get_error_message(res.status, error.detail);
            throw new Error(message);
        }
        const data = await res.text();
        return data;
    } catch (err) {
        console.error("Error fetching /c/me:", err);
        return null;
    }
}

export async function get_login_status() {
    try {
        const res = await apiFetch(`${API_URL}/user_info`, {
            method: "GET",
            credentials: "include",
        });
        if (!res.ok) {
            const error = await res.json();
            const message = get_error_message(res.status, error.detail);
            throw new Error(message);
        }
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching /user_info:", err);
        return null;
    }
}
