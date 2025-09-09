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
                const error = await response.json();
                const message = get_error_message(response.status, error.detail);
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
