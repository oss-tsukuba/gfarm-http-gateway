import React, { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    BsSun,
    BsMoon,
    BsListUl,
    BsGrid3X3Gap,
    BsGrid,
    BsCalendarDate,
    BsUpload,
} from "react-icons/bs";
import { useTheme } from "@context/ThemeContext";
import { useShowHidden } from "@context/ShowHiddenContext";
import { useViewMode } from "@context/ViewModeContext";
import { useDateFormat } from "@context/DateFormatContext";
import { useUploadParallelLimit } from "@context/UploadParallelLimitContext";
import { PARALLEL_LIMIT } from "@utils/config";
import { getTimeStr } from "@utils/func";

const LIMIT_MIN = 1;
const LIMIT_MAX = 8;

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function SettingsModal({ id = "settingsModal" }) {
    const { theme, setTheme } = useTheme();
    const { showHidden, setShowHidden } = useShowHidden();
    const { viewMode, setViewMode } = useViewMode();
    const { dateFormat, setDateFormat } = useDateFormat();
    const [frozenNow, setFrozenNow] = useState(null);
    const { parallelLimit, setParallelLimit } = useUploadParallelLimit();
    const [limitInput, setLimitInput] = useState(String(parallelLimit));
    useEffect(() => setLimitInput(String(parallelLimit)), [parallelLimit]);

    useEffect(() => {
        setFrozenNow(Math.floor(Date.now() / 1000));
    }, []);

    const dateOptions = useMemo(
        () => [
            { value: "DMY", label: getTimeStr(frozenNow, "DMY") },
            { value: "YMD", label: getTimeStr(frozenNow, "YMD") },
            { value: "MDY", label: getTimeStr(frozenNow, "MDY") },
        ],
        [frozenNow]
    );

    const handleBlur = (e) => {
        const raw = e.target.value.trim();
        const n = Number(raw);
        if (!Number.isFinite(n)) {
            setLimitInput(String(parallelLimit));
            return;
        }
        const v = clamp(Math.trunc(n), LIMIT_MIN, LIMIT_MAX);
        if (v !== parallelLimit) setParallelLimit(v);
        setLimitInput(String(v));
    };

    const handleReset = () => {
        setParallelLimit(PARALLEL_LIMIT);
        setLimitInput(String(PARALLEL_LIMIT));
    };

    return (
        <div
            className="modal fade"
            id={id}
            tabIndex={-1}
            aria-labelledby="settingsModalLabel"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content rounded-4 border-0 shadow">
                    <div className="modal-header border-0">
                        <h5 className="modal-title" id="settingsModalLabel">
                            Settings
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body pt-0">
                        {/* Appearance */}
                        <section className="mb-4">
                            <div className="d-flex align-items-center mb-2">
                                <BsSun className="me-2" />
                                <h6 className="m-0">Appearance</h6>
                            </div>
                            <p className="text-muted small mb-3">
                                Choose theme and how items are displayed.
                            </p>

                            {/* Theme segmented */}
                            <div className="mb-3">
                                <div className="form-label fw-semibold mb-2">Theme</div>
                                <div className="btn-group" role="group" aria-label="Theme">
                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="theme-select-input"
                                        id="theme-select-input-light"
                                        autoComplete="off"
                                        checked={theme === "light"}
                                        onChange={() => setTheme("light")}
                                    />
                                    <label
                                        className="btn btn-outline-secondary"
                                        htmlFor="theme-select-input-light"
                                    >
                                        <BsSun className="me-2" /> Light
                                    </label>

                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="theme-select-input"
                                        id="theme-select-input-dark"
                                        autoComplete="off"
                                        checked={theme === "dark"}
                                        onChange={() => setTheme("dark")}
                                    />
                                    <label
                                        className="btn btn-outline-secondary"
                                        htmlFor="theme-select-input-dark"
                                    >
                                        <BsMoon className="me-2" /> Dark
                                    </label>
                                </div>
                            </div>

                            {/* View mode segmented */}
                            <div className="mb-3">
                                <div className="form-label fw-semibold mb-2">View mode</div>
                                <div className="btn-group" role="group" aria-label="View mode">
                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="view-mode-select"
                                        id="view-mode-select-list"
                                        checked={viewMode === "list"}
                                        onChange={() => setViewMode("list")}
                                    />
                                    <label
                                        className="btn btn-outline-secondary"
                                        htmlFor="view-mode-select-list"
                                    >
                                        <BsListUl className="me-2" /> List
                                    </label>

                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="view-mode-select"
                                        id="view-mode-select-icon_rg"
                                        checked={viewMode === "icon_rg"}
                                        onChange={() => setViewMode("icon_rg")}
                                    />
                                    <label
                                        className="btn btn-outline-secondary"
                                        htmlFor="view-mode-select-icon_rg"
                                    >
                                        <BsGrid3X3Gap className="me-2" /> Icon
                                    </label>

                                    <input
                                        type="radio"
                                        className="btn-check"
                                        name="view-mode-select"
                                        id="view-mode-select-icon_sm"
                                        checked={viewMode === "icon_sm"}
                                        onChange={() => setViewMode("icon_sm")}
                                    />
                                    <label
                                        className="btn btn-outline-secondary"
                                        htmlFor="view-mode-select-icon_sm"
                                    >
                                        <BsGrid className="me-2" /> Icon (small)
                                    </label>
                                </div>
                            </div>

                            {/* Show hidden */}
                            <div className="form-check form-switch">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="show-hidden-input"
                                    checked={showHidden}
                                    onChange={(e) => setShowHidden(e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="show-hidden-input">
                                    Show hidden files
                                </label>
                            </div>
                        </section>

                        <hr className="text-muted" />

                        {/* Date & Format */}
                        <section className="mb-4">
                            <div className="d-flex align-items-center mb-2">
                                <BsCalendarDate className="me-2" />
                                <h6 className="m-0">Date format</h6>
                            </div>
                            <p className="text-muted small mb-3">
                                Pick how timestamps appear across the app.
                            </p>

                            <div className="row g-3 align-items-center">
                                <div style={{ maxWidth: 360 }}>
                                    <label
                                        className="form-label fw-semibold"
                                        htmlFor="date-format-select"
                                    >
                                        Format
                                    </label>
                                    <select
                                        id="date-format-select"
                                        className="form-select"
                                        value={dateFormat}
                                        onChange={(e) => setDateFormat(e.target.value)}
                                    >
                                        {dateOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <hr className="text-muted" />

                        {/* Upload */}
                        <section>
                            <div className="d-flex align-items-center mb-2">
                                <BsUpload className="me-2" />
                                <h6 className="m-0">Uploads</h6>
                            </div>
                            <p className="text-muted small mb-3">
                                Control concurrency to balance speed and stability.
                            </p>

                            <label
                                className="form-label fw-semibold"
                                htmlFor="parallel-limit-input"
                            >
                                Max concurrent workers per task
                            </label>
                            <div className="mb-2" style={{ maxWidth: 360 }}>
                                <input
                                    id="parallel-limit-input"
                                    type="number"
                                    className="form-control"
                                    min={LIMIT_MIN}
                                    max={LIMIT_MAX}
                                    step={1}
                                    value={limitInput}
                                    onChange={(e) => setLimitInput(e.target.value)}
                                    onBlur={handleBlur}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") e.currentTarget.blur();
                                    }}
                                    inputMode="numeric"
                                />
                                <div className="d-flex align-items-center justify-content-between">
                                    <div className="form-text">
                                        Allowed range: {LIMIT_MIN} - {LIMIT_MAX}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={handleReset}
                                        data-testid="reset-parallel-limit"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="modal-footer border-0">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

SettingsModal.propTypes = { id: PropTypes.string };
export default SettingsModal;
