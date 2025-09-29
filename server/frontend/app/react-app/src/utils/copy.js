import { API_URL } from "@utils/config";
import { apiFetch } from "@utils/apiFetch";
import get_error_message from "@utils/error";
import { createLineSplitter } from "@utils/func";

// ---------- helpers ----------
function getProgress(copied, total) {
    if (!(total > 0) || !(copied > 0)) return undefined;
    return Math.floor((copied / total) * 100);
}

function formatBps(bytesPerSec) {
    if (!Number.isFinite(bytesPerSec)) return "- B/s";
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    let v = bytesPerSec;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function coerceMsg(x) {
    return Array.isArray(x) ? x.join(", ") : String(x ?? "");
}

// progressCallback({status, value, message, done, onCancel})
export default async function copyFile(srcpath, destpath, progressCallback) {
    const url = `${API_URL}/copy`;
    const ctrl = new AbortController();
    const startTime = Date.now();

    // expose cancel
    progressCallback?.({
        onCancel: () => {
            ctrl.abort();
            console.debug("copy: cancelled by user", { destpath });
        },
    });

    const req = {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: srcpath, destination: destpath }),
        signal: ctrl.signal,
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

        const lineSplitter = createLineSplitter();
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(lineSplitter)
            .getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value) continue;

                let obj;
                try {
                    obj = JSON.parse(value);
                } catch (e) {
                    console.warn("copy: failed to parse line:", value, e);
                    continue;
                }

                if (obj.warn) {
                    progressCallback?.({ message: coerceMsg(obj.warn) });
                }

                if (obj.error) {
                    const msg = coerceMsg(obj.error);
                    progressCallback?.({ status: "error", message: `500 ${msg}`, done: true });
                    // stop reading further lines
                    await reader.cancel();
                    throw new Error(`500 ${msg}`);
                }

                if (obj.done) {
                    console.debug("Copy complete", obj);
                    if (!obj.warn) progressCallback?.({ message: "" });
                    await reader.cancel(); // short-circuit remaining stream if any
                    break;
                }

                const { copied, total } = obj;
                if (typeof copied === "number" && typeof total === "number") {
                    const percent = getProgress(copied, total);
                    const elapsedMs = Date.now() - startTime;
                    const bps = formatBps(elapsedMs > 0 ? (copied / elapsedMs) * 1000 : 0);
                    const sec = Math.floor(elapsedMs / 1000);
                    const message =
                        percent != null ? `${percent}% | ${sec}s | ${bps}` : `${sec}s | ${bps}`;

                    progressCallback?.({ value: percent, message });
                }
            }
        } finally {
            try {
                reader.releaseLock();
            } catch {
                // no-op
            }
        }

        progressCallback?.({
            status: "completed",
            value: 100,
            done: true,
        });
    } catch (err) {
        const isAbort = err?.name === "AbortError";
        const message = isAbort
            ? "Copy cancelled"
            : `${err?.name ?? "Error"} : ${err?.message ?? "Unknown error"}`;
        progressCallback?.({ status: isAbort ? "cancelled" : "error", message, done: true });
        if (isAbort) console.warn("Copy cancelled", err);
        else console.error("Copy failed", err);
    }
}
