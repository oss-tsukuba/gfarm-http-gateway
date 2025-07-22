import { API_URL } from "./config";
import get_error_message from "./error";

function getProgress(copied, total) {
    if (!total || total === 0) return undefined;
    if (!copied || copied === 0) return undefined;
    return Math.floor((copied / total) * 100);
}

// progressCallbeck({status, value, message, done, onCancel})
async function copyFile(srcpath, destpath, progressCallbeck) {
    const dlurl = `${API_URL}/copy`;
    const controller = new AbortController();
    const signal = controller.signal;
    const request = {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
            {
                source: srcpath,
                destination: destpath,
            },
            null,
            2
        ),
        signal,
    };

    const startTime = Date.now();
    progressCallbeck({
        onCancel: () => {
            controller.abort();
            console.debug("cancel:", destpath);
        },
    });

    try {
        const response = await fetch(dlurl, request);

        console.debug("response", response);
        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message);
        }

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
                if (line.trim() === "") continue;
                let json = "";
                try {
                    json = JSON.parse(line);
                } catch (err) {
                    console.warn("Failed to parse line:", line, err);
                    continue;
                }

                if (json.warn) {
                    progressCallbeck({
                        message: json.warn,
                    });
                }
                if (json.error) {
                    throw new Error(`500 ${json.error}`);
                }
                if (json.done) {
                    console.debug("Copy complete", json);
                    if (!json.warn) progressCallbeck({ message: "" });
                    break;
                }
                const copied = json.copied;
                const total = json.total;
                if (copied && total) {
                    const percent = getProgress(copied, total);
                    const elapsed = Date.now() - startTime; // msec.
                    const speed = Math.round((copied / elapsed) * 1000);
                    const sec = Math.floor(elapsed / 1000);
                    const message = percent
                        ? `${percent} % | ${sec} sec | ${speed} bytes/sec`
                        : `${sec} sec | ${speed} bytes/sec`;
                    progressCallbeck({
                        value: percent,
                        message,
                    });
                }
            }
        }
        progressCallbeck({
            status: "completed",
            value: 100,
            done: true,
        });
    } catch (err) {
        const isAbort = err.name === "AbortError";
        const message = isAbort ? "Copy cancelled" : `${err.name} : ${err.message}`;
        progressCallbeck({
            status: isAbort ? "cancelled" : "error",
            message,
            done: true,
        });
        if (isAbort) {
            console.warn("Copy cancelled", err);
        } else {
            console.error("Copy failed", err);
        }
    }
}

export default copyFile;
