import { useState, useEffect, useCallback } from "react";
import getAttribute from "@utils/getAttribute";

function useGetAttr(item, getSymlinkPath = false, Checksum = false) {
    const [detailContent, setDetailContent] = useState(null);
    const [getAttrError, setGetAttrError] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAttr = useCallback(async () => {
        if (!item?.path) return;
        try {
            setLoading(true);
            const detail = await getAttribute(item.path, Checksum, getSymlinkPath);
            setDetailContent(detail);
            setGetAttrError(null);
        } catch (err) {
            console.error("getAttribute failed:", err);
            setGetAttrError(`${err.name} : ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [item]);

    useEffect(() => {
        fetchAttr();
    }, [fetchAttr]);

    return { detailContent, getAttrError, refreshAttr: fetchAttr, attrLoading: loading };
}

export default useGetAttr;
