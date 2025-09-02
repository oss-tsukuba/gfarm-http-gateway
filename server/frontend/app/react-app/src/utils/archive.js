import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

/*
class Tar(BaseModel):
    command: str
    basedir: str
    source: List[str]
    outdir: str
    options: List[str] | None
*/
// progressCallback({status, value, message, done, onCancel})
async function gfptar(
    command,
    targetDir,
    targetItems,
    destDir,
    options,
    progressCallback,
    refresh
) {
    const dlurl = `${API_URL}/gfptar`;

    console.debug("gfptar", options, command, destDir, "-C", targetDir, targetItems);

    const controller = new AbortController();
    const signal = controller.signal;
    const request = {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            command,
            basedir: "gfarm:" + targetDir,
            source: targetItems,
            outdir: "gfarm:" + destDir,
            options,
        }),
        signal,
    };

    progressCallback({
        onCancel: () => {
            controller.abort();
            console.debug("cancel:", destDir);
        },
    });

    try {
        const response = await fetch(dlurl, request);

        if (!response.ok) {
            const error = await response.json();
            const message = get_error_message(response.status, error.detail);
            throw new Error(message, {
                cause: response.status,
            });
        }

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let buffer = "";
        const indirList = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let lines = buffer.split("\n");
                buffer = lines.pop();
                for (const line of lines) {
                    if (line.trim() === "") continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.error) {
                            throw new Error(`500 ${json.error}`);
                        }
                        if (command === "list") {
                            indirList.push(json.message);
                            progressCallback({
                                message: indirList,
                            });
                        } else {
                            progressCallback({
                                value: undefined,
                                message: json.message,
                            });
                        }
                    } catch (err) {
                        console.warn("Failed to parse line:", line, err);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        progressCallback({
            status: "completed",
            value: 100,
            done: true,
        });
        refresh();
    } catch (err) {
        const isAbort = err.name === "AbortError";
        const message = isAbort ? "Download cancelled" : `${err.name} : ${err.message}`;
        progressCallback({
            status: isAbort ? "cancelled" : "error",
            message,
            done: true,
        });
        if (isAbort) {
            console.warn("gfptar cancelled", err);
        } else {
            console.error("gfptar failed", err);
        }
    }
}

export default gfptar;
