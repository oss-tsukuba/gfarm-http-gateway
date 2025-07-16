import { API_URL, FETCH_INTERVAL } from "./config";
import get_error_message from "./error";

const cachedUsers = { users: [], lastFetch: 0 };
const cachedGroups = { groups: [], lastFetch: 0 };

export async function getUsers() {
    const now = Date.now();
    if (now - cachedUsers.lastFetch > FETCH_INTERVAL) {
        try {
            const response = await fetch(`${API_URL}/users?long_format=on`, {
                credentials: "include",
            });
            const data = await response.json();
            if (!response.ok) {
                const message = get_error_message(response.status, data.detail);
                throw new Error(message);
            }
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
            const response = await fetch(`${API_URL}/groups`, {
                credentials: "include",
            });
            const data = await response.json();
            if (!response.ok) {
                const message = get_error_message(response.status, data.detail);
                throw new Error(message);
            }
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
