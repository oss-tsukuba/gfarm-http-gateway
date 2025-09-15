import { closeAllModals } from "@utils/func";
const EXCLUDE_PATHS = [
    /^.*\/login(?:\?.*)?$/,
    /^.*\/logout(?:\?.*)?$/,
    /^.*\/user_info(?:\?.*)?$/,
    /^.*\/users(?:\?.*)?$/,
    /^.*\/groups(?:\?.*)?$/,
];

export async function apiFetch(api_url, options = {}) {
    const req = new Request(api_url, options);

    const path = new URL(req.url, window.location.origin).pathname;
    const res = await fetch(req);

    if (res.status === 401 && !EXCLUDE_PATHS.some((re) => re.test(path))) {
        console.debug("jump to #auth_error");
        closeAllModals();
        window.location.href = "#auth_error";
    }

    return res;
}
