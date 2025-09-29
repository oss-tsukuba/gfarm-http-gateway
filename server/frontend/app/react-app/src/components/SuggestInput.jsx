import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

function SuggestInput({ id, value, onChange, suggestions, placeholder = null, disabled = false }) {
    const [focused, setFocused] = useState(false);
    const [filtered, setFiltered] = useState([]);
    const [highlight, setHighlight] = useState(0);
    const [displayName, setDisplayName] = useState("");

    const inputRef = useRef(null);
    const blurTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof value !== "string") return;

        const matched = suggestions.find((s) => s.value === value);
        setDisplayName(matched ? matched.name : value);
    }, [value, suggestions]);

    useEffect(() => {
        const f = suggestions.filter(
            (s) =>
                typeof s.name === "string" &&
                s.name.toLowerCase().includes(displayName.toLowerCase()) &&
                s.value !== value
        );
        setFiltered(f);
        setHighlight(0);
    }, [displayName, suggestions, value]);

    const handleKeyDown = (e) => {
        if (filtered.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((prev) => (prev + 1) % filtered.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((prev) => (prev - 1 + filtered.length) % filtered.length);
        } else if (e.key === "Tab" || e.key === "Enter") {
            e.preventDefault();
            const selected = filtered[highlight];
            setDisplayName(selected.name);
            onChange(selected.value);
        }
    };

    const handleSelect = (s) => {
        setDisplayName(s.name);
        onChange(s.value);
    };

    return (
        <div style={{ position: "relative" }}>
            <input
                id={id}
                ref={inputRef}
                type="text"
                className="form-control"
                value={displayName}
                onFocus={() => {
                    if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                        blurTimeoutRef.current = null;
                    }
                    setFocused(true);
                }}
                onBlur={() => {
                    if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                    }
                    blurTimeoutRef.current = setTimeout(() => {
                        setFocused(false);
                        blurTimeoutRef.current = null;
                    }, 100);
                }}
                onChange={(e) => {
                    setDisplayName(e.target.value);
                    onChange(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={placeholder ? placeholder : ""}
            />
            {focused && filtered.length > 0 && (
                <ul
                    className="list-group position-absolute w-100 overflow-auto"
                    style={{ zIndex: 999, top: "100%", maxHeight: "200px" }}
                >
                    {filtered.map((s, i) => (
                        <li
                            key={i}
                            className={`list-group-item list-group-item-action text-break ${
                                i === highlight ? "active" : ""
                            }`}
                            onMouseDown={() => handleSelect(s)}
                        >
                            {s.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

SuggestInput.propTypes = {
    id: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    suggestions: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            value: PropTypes.string.isRequired,
        })
    ).isRequired,
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
};

export default SuggestInput;
