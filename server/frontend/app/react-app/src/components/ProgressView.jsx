import React, { useEffect, useRef } from "react";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import { BsArrowUpSquare, BsArrowDownSquare, BsExclamationSquare } from "react-icons/bs";
import PropTypes from "prop-types";

function ProgressView({ show, onHide, tasks, removeDoneTasks, removeTasks }) {
    const canvasRef = useRef(null);
    const instanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        const handleHide = () => {
            console.debug("debug handleHide");
            removeDoneTasks();
            onHide();
        };

        if (!instanceRef.current) {
            instanceRef.current = Offcanvas.getOrCreateInstance(canvasRef.current);
            canvasRef.current.addEventListener("hidden.bs.offcanvas", handleHide);
        }

        return () => {
            if (canvasRef.current) {
                canvasRef.current.removeEventListener("hidden.bs.offcanvas", handleHide);
            }
        };
    }, []);

    useEffect(() => {
        if (!instanceRef.current) return;

        if (show) {
            instanceRef.current.show();
        }
    }, [show]);

    const removeTask = (taskId) => {
        console.debug(taskId + " deleted");
        removeTasks(taskId);
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            ref={canvasRef}
            aria-labelledby="transferProgressLabel"
        >
            <div className="offcanvas-header" data-testid="progress-header">
                <h5 className="offcanvas-title" id="transferProgressLabel">
                    Transfers
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                    data-testid="progress-header-button-close"
                ></button>
            </div>
            <div className="offcanvas-body" data-testid="progress-view">
                {tasks.length === 0 ? (
                    <p className="text-muted">No active transfers.</p>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {tasks.map((task, index) => (
                            <div
                                className="card shadow-sm"
                                key={`${task.taskId}-${index}`}
                                data-testid={`progress-card-${task.taskId}-${index}`}
                            >
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0 text-truncate">
                                            {task.type === "upload" ? (
                                                <BsArrowUpSquare className="me-2" />
                                            ) : task.type === "download" ? (
                                                <BsArrowDownSquare className="me-2" />
                                            ) : (
                                                <BsExclamationSquare className="me-2" />
                                            )}
                                            {task.name}
                                        </h6>
                                        <div className="d-flex justify-content-end mb-2">
                                            <small
                                                className={`badge rounded-pill ${
                                                    task.status === "completed"
                                                        ? "bg-success"
                                                        : task.status === "error"
                                                          ? "bg-danger"
                                                          : "bg-secondary"
                                                }`}
                                            >
                                                {task.status}
                                            </small>
                                            {(task.done || task.status === "error") && (
                                                <div className="d-flex justify-content-end">
                                                    <button
                                                        type="button"
                                                        className="btn-close"
                                                        aria-label="Close"
                                                        onClick={() => removeTask(task.taskId)}
                                                    ></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="progress" style={{ height: "8px" }}>
                                        <div
                                            className={`progress-bar ${
                                                task.status === "completed"
                                                    ? "bg-success"
                                                    : task.status === "error"
                                                      ? "bg-danger"
                                                      : "bg-info"
                                            } ${
                                                task.value === undefined
                                                    ? "progress-bar-striped progress-bar-animated"
                                                    : ""
                                            }`}
                                            role="progressbar"
                                            style={{
                                                width:
                                                    task.value === undefined
                                                        ? "100%"
                                                        : `${task.value}%`,
                                            }}
                                            aria-valuenow={task.value}
                                            aria-valuemin="0"
                                            aria-valuemax="100"
                                        ></div>
                                    </div>
                                    <div
                                        className="d-flex justify-content-between mt-2"
                                        data-testid={`task-message-${index}`}
                                    >
                                        <small
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {task.message}
                                        </small>
                                        {!task.done && task.onCancel && (
                                            <div style={{ alignSelf: "start" }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={task.onCancel}
                                                    data-testid={`progress-button-cancel-${task.taskId}-${index}`}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProgressView;

ProgressView.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    tasks: PropTypes.array,
    removeDoneTasks: PropTypes.func,
    removeTasks: PropTypes.func,
};
