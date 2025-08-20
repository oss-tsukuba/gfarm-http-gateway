import React from "react";
import "@css/FileListView.css";
import { BsArrowUpShort, BsArrowDownShort } from "react-icons/bs";
import PropTypes from "prop-types";

function SortDropDownMenu({ sortDirection, setSortDirection }) {
    const changeSortDirection = ({ column, order }) => {
        setSortDirection((prevSort) => {
            return {
                column: column ?? prevSort.column,
                order: order ?? prevSort.order,
            };
        });
    };

    const getSortIcon = (col) => {
        if (sortDirection.column !== col) return null;
        return sortDirection.order === "asc" ? (
            <BsArrowUpShort size="1.1rem" className="ms-1" data-testid="sort-icon-asc" />
        ) : (
            <BsArrowDownShort size="1.1rem" className="ms-1" data-testid="sort-icon-desc" />
        );
    };

    return (
        <div className="dropdown">
            <button
                className="btn btn-sm dropdown-toggle fw-bold"
                type="button"
                id="action-menu-dropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                data-testid="sort-menu-dropdown"
            >
                Sort by {sortDirection.column}
                {getSortIcon(sortDirection.column)}
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
