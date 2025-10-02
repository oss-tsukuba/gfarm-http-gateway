import { closeAllModals } from "@utils/func";
import { RETRY_COUNT, RETRY_INTERVAL } from "@utils/config";

const EXCLUDE_PATHS = [
    /^.*\/login(?:\?.*)?$/,
    /^.*\/logout(?:\?.*)?$/,
    /^.*\/user_info(?:\?.*)?$/,
    /^.*\/users(?:\?.*)?$/,
    /^.*\/groups(?:\?.*)?$/,
];

export const TRANSIENT_STATUS = new Set([408, 429, 502, 503, 504]);

async function fetch_retry(
    api_url,
    options,
    includeStatus,
    n = RETRY_COUNT,
    delay = RETRY_INTERVAL
) {
    try {
        const res = await fetch(api_url, options);
        if (!includeStatus || n < 1 || !TRANSIENT_STATUS.has(res.status)) {
            return res;
        }
        throw new Error(res.status);
    } catch (err) {
        console.debug("retry count=", n);
        if (n < 1) throw err;
        const jittered = Math.floor(delay * (0.5 + Math.random())); // 0.5x–1.5x
        await new Promise((r) => setTimeout(r, jittered));
        return await fetch_retry(api_url, options, includeStatus, n - 1, delay);
    }
}

export async function apiFetch(api_url, options = {}, includeStatus = true) {
    const res = await fetch_retry(api_url, options, includeStatus);

    const path = new URL(api_url, window.location.origin).pathname;
    if (res.status === 401 && !EXCLUDE_PATHS.some((re) => re.test(path))) {
        console.debug("jump to #auth_error");
        closeAllModals();
        window.location.href = "#auth_error";
    }

    return res;
}
