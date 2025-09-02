import { encodePath } from "@utils/func";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

export default async function getList(dirPath, showHidden, setData, signal, batchSize = 200) {
    const epath = encodePath(dirPath);
    const url =
        `${API_URL}/dir${epath}` +
        `?show_hidden=${showHidden ? "on" : "off"}&long_format=on&time_format=full&output_format=json`;

    const response = await fetch(url, {
        credentials: "include",
        signal,
    });

    if (!response.ok) {
        const error = await response.json();
        const message = get_error_message(response.status, error?.detail);
        throw new Error(message);
    }

    const useStreamAPI = typeof TextDecoderStream !== "undefined" && response.body?.pipeThrough;
    const batch = [];
    let lastYield = 0;

    const flushBatch = async () => {
        if (batch.length === 0) return;
        const now = performance.now();
        if (now - lastYield > 16) {
            await new Promise((r) => requestAnimationFrame(r));
            lastYield = performance.now();
        }
        setData(batch.splice(0, batch.length));
    };

    const handleLine = async (line) => {
        if (!line) return;
        let json;
        try {
            json = JSON.parse(line);
        } catch (e) {
            console.warn("Failed to parse line", e);
            return;
        }
        if (json?.error) {
            throw new Error(`500 ${json.error}`);
        }
        batch.push(json);
        if (batch.length >= batchSize) {
            await flushBatch();
        }
    };

    if (useStreamAPI) {
        // ---- Recommended: Native Stream path ----
        const lineSplitter = new TransformStream({
            start() {
                this.buffer = "";
            },
            transform(chunk, controller) {
                this.buffer += chunk;
                let idx;
                while ((idx = this.buffer.indexOf("\n")) !== -1) {
                    controller.enqueue(this.buffer.slice(0, idx));
                    this.buffer = this.buffer.slice(idx + 1);
                }
            },
            flush(controller) {
                if (this.buffer) controller.enqueue(this.buffer);
            },
        });

        const textStream = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(lineSplitter);

        const reader = textStream.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await handleLine(value);
            }
            await flushBatch();
        } finally {
            reader.releaseLock();
        }
    } else {
        // ---- Fallback: Manual Decoding ----
        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let start = 0;
                while (true) {
                    const nl = buffer.indexOf("\n", start);
                    if (nl === -1) break;
                    const line = buffer.slice(start, nl);
                    await handleLine(line);
                    start = nl + 1;
                }
                // Keep only the last incomplete line
                buffer = buffer.slice(start);
            }
            // Last line (ends without a line break)
            if (buffer) await handleLine(buffer);
            await flushBatch();
        } finally {
            reader.releaseLock();
        }
    }
}
