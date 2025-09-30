import { createLineSplitter } from "@utils/func";
import { API_URL, GFARM_PREFIX } from "@utils/config";
import { apiFetch } from "@utils/apiFetch";
import get_error_message from "@utils/error";

function ensureGfarmScheme(path) {
    if (path.startsWith(`${GFARM_PREFIX}:`)) return path;
    return `${GFARM_PREFIX}:${path}`;
}

/*
class Tar(BaseModel):
    command: str
    basedir: str
    source: List[str]
    outdir: str
    options: List[str] | None
*/
// progressCallback({status, value, message, done, onCancel})
export default async function gfptar(
    command,
    targetDir,
    targetItems,
    destDir,
    options,
    progressCallback,
    refresh
) {
    const url = `${API_URL}/gfptar`;
    const controller = new AbortController();
    const isList = command === "list";
    const listResults = [];

    // expose cancel hook
    progressCallback?.({
        onCancel: () => {
            controller.abort();
            console.debug("gfptar cancelled:", { command, destDir });
        },
    });

    const req = {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            command,
            basedir: ensureGfarmScheme(targetDir),
            source: targetItems,
            outdir: ensureGfarmScheme(destDir),
            options,
        }),
        signal: controller.signal,
    };

    try {
        const response = await apiFetch(url, req, false);

        if (!response.ok) {
            // best-effort detail extraction
            let detail;
            try {
                const ct = response.headers.get("content-type") || "";
                detail = ct.includes("application/json")
                    ? (await response.json())?.detail
                    : await response.text();
            } catch {
                // no-op
            }
            throw new Error(get_error_message(response.status, detail), { cause: response.status });
        }

        const handleLine = (line) => {
            if (!line) return;
            let json;
            try {
                json = JSON.parse(line);
            } catch (e) {
                console.warn("Failed to parse line:", line, e);
                return;
            }
            if (json?.error) {
                if (Array.isArray(json.error)) {
                    const joined = json.error
                        .map((e) => e?.msg || e?.message || String(e))
                        .join("; ");
                    throw new Error(`500 ${joined}`);
                } else {
                    throw new Error(`500 ${json.error}`);
                }
            }
            if (isList) {
                listResults.push(String(json.message ?? ""));
                progressCallback?.({ message: [...listResults] });
            } else {
                progressCallback?.({ message: json?.message });
            }
        };

        const lineSplitter = createLineSplitter();
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(lineSplitter)
            .getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                handleLine(value);
            }
        } finally {
            try {
                reader.releaseLock();
            } catch {
                // no-op
            }
        }

        progressCallback?.({ status: "completed", value: 100, done: true });
    } catch (err) {
        const isAbort = err?.name === "AbortError";
        const message = isAbort
            ? "gfptar cancelled"
            : `${err?.name ?? "Error"} : ${err?.message ?? "Unknown error"}`;
        progressCallback?.({
            value: 100,
            status: isAbort ? "cancelled" : "error",
            message,
            done: true,
        });
        if (isAbort) console.warn("gfptar aborted:", err);
        else console.error("gfptar failed:", err);
    } finally {
        if (!isList) refresh?.();
    }
}
