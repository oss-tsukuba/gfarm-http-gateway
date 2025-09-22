import { encodePath, createLineSplitter } from "@utils/func";
import { apiFetch } from "@utils/apiFetch";
import { API_URL } from "@utils/config";
import get_error_message from "@utils/error";

export default async function getList(dirPath, showHidden, setData, signal, batchSize = 200) {
    const epath = encodePath(dirPath);
    const url =
        `${API_URL}/dir${epath}` +
        `?show_hidden=${showHidden ? "on" : "off"}&long_format=on&time_format=full&output_format=json`;

    const response = await apiFetch(url, {
        credentials: "include",
        signal,
    });

    if (!response.ok) {
        const error = await response.json();
        const message = get_error_message(response.status, error?.detail);
        throw new Error(message);
    }

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
            const message = get_error_message(json?.err_code || 500, json.error);
            throw new Error(message);
        }
        batch.push(json);
        if (batch.length >= batchSize) {
            await flushBatch();
        }
    };

    const lineSplitter = createLineSplitter();
    const textStream = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(lineSplitter);

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
}
