// useFileList.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import getList from "@utils/getList";
import PropTypes from "prop-types";

// Keep only the minimum fields needed in the list
const pickListFields = (x) => ({
    name: x.name,
    linkname: x.linkname || null,
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

    // Refs to avoid stale closures
    const dirRef = useRef(dirPath);
    useEffect(() => {
        dirRef.current = dirPath;
    }, [dirPath]);

    const fetchFiles = useCallback(
        async (path = dirPath) => {
            if (!path) return;

            // cancel previous
            abortRef.current?.abort();
            const ac = new AbortController();
            abortRef.current = ac;

            setLoading(true);
            setListGetError(null);
            setItems([]);
            const seen = new Set();

            try {
                await getList(
                    path,
                    showHidden,
                    (batch) => {
                        // Discard "." ".." and duplicates and project to the minimum required fields
                        const next = [];
                        for (const r of Array.isArray(batch) ? batch : [batch]) {
                            if (!r || r.name === "." || r.name === "..") continue;
                            const key = r.path ?? r.full_path ?? r.name;
                            if (seen.has(key)) continue;
                            seen.add(key);
                            next.push(pickListFields(r));
                        }
                        if (next.length) setItems((prev) => [...prev, ...next]);
                    },
                    ac.signal,
                    batchSize
                );
                setListGetError(null);
            } catch (err) {
                if (err.name !== "AbortError") {
                    const msg = `${err.name} : ${err.message}`;
                    console.error("listGetError", msg);
                    setListGetError(msg);
                }
            } finally {
                if (abortRef.current === ac) abortRef.current = null;
                setLoading(false);
                console.debug("getList done");
            }
        },
        [dirPath, showHidden, batchSize]
    );

    const refreshItems = useCallback(() => fetchFiles(dirRef.current), [fetchFiles]);

    useEffect(() => {
        fetchFiles();
        return () => abortRef.current?.abort();
    }, [fetchFiles]);

    return {
        currentItems: items,
        listGetError,
        loading,
        refreshItems,
        abort: () => abortRef.current?.abort(),
    };
}

export default useFileList;

export const FileItemShape = PropTypes.shape({
    path: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    linkname: PropTypes.string,
    is_dir: PropTypes.bool,
    is_sym: PropTypes.bool,
    size: PropTypes.number,
    mtime: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.instanceOf(Date)]),
});
