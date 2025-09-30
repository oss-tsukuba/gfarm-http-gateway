import React, { createContext, useState, useContext, useEffect } from "react";
import { normalizeParallelLimit } from "@utils/func";
import { PARALLEL_LIMIT } from "@utils/config";
import PropTypes from "prop-types";

const UploadParallelLimitContext = createContext();

export function useUploadParallelLimit() {
    return useContext(UploadParallelLimitContext);
}

export function UploadParallelLimitProvider({ children }) {
    const [parallelLimit, setParallelLimit] = useState("");

    useEffect(() => {
        const savedParallelLimit = localStorage.getItem("parallelLimit");
        console.debug("savedParallelLimit", savedParallelLimit);
        if (savedParallelLimit) {
            setParallelLimit(savedParallelLimit);
        } else {
            setParallelLimit(PARALLEL_LIMIT);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("parallelLimit", normalizeParallelLimit(parallelLimit));
    }, [parallelLimit]);

    return (
        <UploadParallelLimitContext value={{ parallelLimit, setParallelLimit }}>
            {children}
        </UploadParallelLimitContext>
    );
}

UploadParallelLimitProvider.propTypes = {
    children: PropTypes.node,
};
