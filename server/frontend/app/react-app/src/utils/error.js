const looksLikeHTML = (msg) => /<\/?[a-z][\s\S]*>/i.test(msg) && /<[^>]+>/.test(msg);
const stripTags = (msg) =>
    msg
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ");

const decodeEntities = (msg) =>
    msg
        .replace(/&nbsp;?/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));

const collapse = (s) => s.replace(/\s+/g, " ").trim();

const getHtmlTitle = (msg) => {
    const m = msg.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m?.[1] ? collapse(decodeEntities(m[1])) : null;
};

const truncate = (s, max = 240) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

export default function get_error_message(status_code, detail) {
    console.error(status_code, detail);
    const code = status_code ?? "-";

    if (detail === null || detail === undefined) {
        return `${code} : Error`;
    }

    if (typeof detail === "string") {
        const s = detail.trim();
        try {
            detail = JSON.parse(s);
        } catch {
            if (looksLikeHTML(s)) {
                const title = getHtmlTitle(s);
                const bodyText = collapse(decodeEntities(stripTags(s)));
                const summary = truncate(title || bodyText || "Error");
                return `${code} : ${summary}`;
            }
            return `${code} : ${s}`;
        }
    }

    const buildFromFields = (obj) => {
        if (obj?.message) {
            let msg = `${code} : ${obj.message}`;
            // if (obj?.stdout) msg += ` : stdout: ${obj.stdout}`;
            // if (obj?.stderr) msg += ` : stderr: ${obj.stderr}`;
            return msg;
        }
        return null;
    };

    const fromFields = buildFromFields(detail);
    if (fromFields) return fromFields;

    try {
        const s = JSON.stringify(detail);
        return `${code} : ${truncate(s, 500)}`;
    } catch {
        return `${code} : ${truncate(String(detail), 500)}`;
    }
}

export const ErrorCodes = {
    EMPTY_NAME: 1001,
    EMPTY_PATH: 1002,
    INVALID_NAME: 1003,
    NOT_FOUND: 1004,
    SAME_DESTINATION: 1005,
    ALREADY_EXISTS: 1006,
    REQUIRED_NOT_MET: 1007,
};

const ErrorMap = {
    [ErrorCodes.EMPTY_NAME]: {
        type: "warning",
        message: "Empty name",
    },
    [ErrorCodes.EMPTY_PATH]: {
        type: "warning",
        message: "Empty path",
    },
    [ErrorCodes.INVALID_NAME]: {
        type: "warning",
        message: 'Invalid name. Avoid characters like <>:"/\\|?* or ending with space/dot.',
    },
    [ErrorCodes.NOT_FOUND]: {
        type: "warning",
        message: "Not found",
    },
    [ErrorCodes.SAME_DESTINATION]: {
        type: "warning",
        message: "Destination is the same as current path",
    },
    [ErrorCodes.ALREADY_EXISTS]: {
        type: "warning",
        message: "Already exists",
    },
    [ErrorCodes.REQUIRED_NOT_MET]: {
        type: "warning",
        message: "All fields are required",
    },
};

export function get_ui_error(code) {
    return ErrorMap[code] ?? { type: "warning", message: "Unknown error" };
}
