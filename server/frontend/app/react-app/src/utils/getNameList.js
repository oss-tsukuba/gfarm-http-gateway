import { API_URL, FETCH_INTERVAL } from "@utils/config";
import { apiFetch } from "@utils/apiFetch";
import get_error_message from "@utils/error";

const cachedUsers = { users: [], lastFetch: 0 };
const cachedGroups = { groups: [], lastFetch: 0 };

export async function getUsers() {
    const now = Date.now();
    if (now - cachedUsers.lastFetch > FETCH_INTERVAL) {
        try {
            const response = await apiFetch(`${API_URL}/users?long_format=on`, {
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
            if (data.list) {
                cachedUsers.users = data.list;
            }
            cachedUsers.lastFetch = now;
            console.debug("data", data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    }
    return cachedUsers.users;
}

export async function getGroups() {
    const now = Date.now();
    if (now - cachedGroups.lastFetch > FETCH_INTERVAL) {
        try {
            const response = await apiFetch(`${API_URL}/groups`, {
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
            if (data.list) {
                cachedGroups.groups = data.list;
            }
            cachedGroups.lastFetch = now;
        } catch (err) {
            console.error("Failed to fetch groups:", err);
        }
    }
    return cachedGroups.groups;
}
