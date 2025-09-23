import { useLocation } from "react-router-dom";
import { GFARM_PREFIX } from "@utils/config";

function useGetPath(urlPrefix = "/storage") {
    const location = useLocation();
    const fullPath = decodeURIComponent(location.pathname);

    let pathHead = "";
    let gfarmPath = fullPath;

    if (fullPath.startsWith(urlPrefix)) {
        pathHead = urlPrefix;
        gfarmPath = fullPath.slice(urlPrefix.length) || "/";
        if (gfarmPath.startsWith(`/${GFARM_PREFIX}:`)) {
            gfarmPath = gfarmPath.replace(/^\/+/, "");
        }
    }

    return { pathHead, gfarmPath };
}

export default useGetPath;
