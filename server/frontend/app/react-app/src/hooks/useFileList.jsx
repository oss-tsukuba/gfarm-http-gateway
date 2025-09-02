// useFileList.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import getList from "@utils/getList";
import PropTypes from "prop-types";

// Keep only the minimum fields needed in the list
const pickListFields = (x) => ({
    name: x.name,
    size: x.size,
    mtime: x.mtime,
    path: x.path,
    is_file: x.is_file,
    is_dir: x.is_dir,
    is_sym: x.is_sym,
});

function useFileList(dirPath, showHidden = true, { batchSize = 200 } = {}) {
    const [items, setItems] = useState([]);
    const [listGetError, setListGetError] = useState(null);
    const [loading, setLoading] = useState(false);

    // To prevent continuous calls and double fetches
    const abortRef = useRef(null);
    const seenRef = useRef(null);

    const fetchFiles = useCallback(async () => {
        if (!dirPath) return;

        // Cancel previous fetch
        if (abortRef.current) abortRef.current.abort();

        const ac = new AbortController();
        abortRef.current = ac;
        setLoading(true);
        setListGetError(null);
        setItems([]);
        seenRef.current = new Set();

        try {
            await getList(
                dirPath,
                showHidden,
                (batch) => {
                    // Discard "." ".." and duplicates and project to the minimum required fields
                    const next = [];
                    for (const r of Array.isArray(batch) ? batch : [batch]) {
                        if (!r || r.name === "." || r.name === "..") continue;
                        const key = r.path ?? r.full_path ?? r.name;
                        if (seenRef.current.has(key)) continue;
                        seenRef.current.add(key);
                        next.push(pickListFields(r));
                    }
                    if (next.length) {
                        setItems((prev) => [...prev, ...next]);
                    }
                },
                ac.signal,
                batchSize
            );
            setListGetError(null);
            setLoading(false);
            console.log("getList done");
        } catch (err) {
            if (err.name !== "AbortError") {
                const msg = `${err.name} : ${err.message}`;
                console.error("listGetError", msg);
                setListGetError(msg);
            }
        } finally {
            if (abortRef.current === ac) {
                abortRef.current = null;
            }
        }
    }, [dirPath, showHidden, batchSize]);

    useEffect(() => {
        fetchFiles();
        return () => abortRef.current?.abort();
    }, [fetchFiles]);

    return {
        currentItems: items,
        listGetError,
        loading,
        refreshItems: fetchFiles,
        abort: () => abortRef.current?.abort(),
    };
}

export default useFileList;

export const FileItemShape = PropTypes.shape({
    path: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    is_dir: PropTypes.bool,
    is_sym: PropTypes.bool,
    size: PropTypes.number,
    mtime: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.instanceOf(Date)]),
});
