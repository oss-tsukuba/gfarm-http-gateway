import React from "react";
import "@css/FileListView.css";
import { BsArrowUpShort, BsArrowDownShort } from "react-icons/bs";
import PropTypes from "prop-types";

export function getSortIcon(name, column, order) {
    if (column !== name) return null;
    return order === "asc" ? (
        <BsArrowUpShort
            style={{ fontSize: "1.1rem" }}
            className="ms-1"
            data-testid="sort-icon-asc"
        />
    ) : (
        <BsArrowDownShort
            style={{ fontSize: "1.1rem" }}
            className="ms-1"
            data-testid="sort-icon-desc"
        />
    );
}

function SortDropDownMenu({ sortDirection, setSortDirection }) {
    const changeSortDirection = ({ column, order }) => {
        setSortDirection((prevSort) => {
            return {
                column: column ?? prevSort.column,
                order: order ?? prevSort.order,
            };
        });
    };

    return (
        <div className="dropdown">
            <button
                className="btn btn-sm dropdown-toggle"
                type="button"
                id="action-menu-dropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="sort-menu-dropdown"
            >
                Sort by {sortDirection.column}
                {getSortIcon(sortDirection.column, sortDirection.column, sortDirection.order)}
            </button>
            <ul className="dropdown-menu" aria-labelledby="action-menu-dropdown">
                <li className="text-muted">
                    <h1 className="dropdown-header">Sort by</h1>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ column: "Name" })}
                        data-testid="action-menu-download-sm"
                    >
                        Name
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ column: "Size" })}
                        data-testid="action-menu-delete-sm"
                    >
                        Size
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ column: "Modified" })}
                        data-testid="action-menu-move-sm"
                    >
                        Modified
                    </button>
                </li>
                <li>
                    <hr className="dropdown-divider" />
                </li>
                <li className="text-muted">
                    <h1 className="dropdown-header">Order</h1>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ order: "asc" })}
                        data-testid="action-menu-gfptar-sm"
                    >
                        Asc
                    </button>
                </li>
                <li>
                    <button
                        className="dropdown-item"
                        onClick={() => changeSortDirection({ order: "desc" })}
                        data-testid="action-menu-gfptar-sm"
                    >
                        Desc
                    </button>
                </li>
            </ul>
        </div>
    );
}

export default SortDropDownMenu;

SortDropDownMenu.propTypes = {
    sortDirection: PropTypes.object,
    setSortDirection: PropTypes.func,
};
