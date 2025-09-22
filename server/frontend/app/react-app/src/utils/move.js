import { API_URL } from "@utils/config";
import { apiFetch } from "@utils/apiFetch";
import get_error_message from "@utils/error";

async function moveItems(files, setError) {
    if (!files) {
        setError("no files");
    }
    console.debug("move", files);
    for (const file of files) {
        console.debug("move", file.path, "to", file.destPath);
        const data = JSON.stringify(
            {
                source: file.path,
                destination: file.destPath,
            },
            null,
            2
        );

        try {
            const url = `${API_URL}/move`;
            const response = await apiFetch(url, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: data,
            });
            if (!response.ok) {
                let detail;
                try {
                    const ct = response.headers.get("content-type") || "";
                    detail = ct.includes("application/json")
                        ? (await response.json())?.detail
                        : await response.text();
                } catch {
                    // no-op
                }
                const message = get_error_message(response.status, detail);
                throw new Error(message);
            }
            console.debug(`Success (moved)`);
        } catch (error) {
            console.error(error);
            setError(`${error.name} : ${error.message}`);
        }
    }
}

export default moveItems;
