import { API_URL } from "@utils/config";
import { apiFetch } from "@utils/apiFetch";
import get_error_message from "@utils/error";

export async function get_username() {
    try {
        const response = await apiFetch(`${API_URL}/c/me`, {
            method: "GET",
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
        const data = await response.text();
        return data;
    } catch (err) {
        console.error("Error fetching /c/me:", err);
        return null;
    }
}

export async function get_login_status() {
    try {
        const response = await apiFetch(`${API_URL}/user_info`, {
            method: "GET",
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
    } catch (err) {
        console.error("Error fetching /user_info:", err);
        return null;
    }
}
