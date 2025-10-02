import { useState, useEffect, useRef } from "react";
import { upload, checkPermission } from "@utils/upload";
import download from "@utils/download";
import copyFile from "@utils/copy";
import gfptar from "@utils/archive";
import { createDir } from "@utils/dircommon";
import { useUploadParallelLimit } from "@context/UploadParallelLimitContext";
import { getParentPath, suggestNewName, normalizeParallelLimit } from "@utils/func";

function useProgressTasks(refreshItems, addNotification) {
    const [tasks, setTasks] = useState([]);
    const [showProgressView, setShowProgressView] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [itemsToMove, setItemsToMove] = useState([]);
    const uploadQueueRef = useRef([]);
    const [uploading, setUploading] = useState(false);
    const downloadQueueRef = useRef([]);
    const [downloading, setDownloading] = useState(false);
    const isUploadingRef = useRef(false);
    const isDownloadingRef = useRef(false);
    const { parallelLimit } = useUploadParallelLimit();

    const removeDoneTasks = () => {
        setTasks((prev) => prev.filter((t) => !t.done || t.status === "error"));
    };

    const removeTasks = (taskId) => {
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    };

    const updateTask = (task, updates) => {
        return {
            ...task,
            name: updates.name ?? task.name,
            status: updates.status ?? task.status,
            value: updates.value ?? task.value,
            message: updates.message ?? task.message,
            done: updates.done ?? task.done,
            onCancel: updates.onCancel ?? task.onCancel,
        };
    };

    const addItemsToUpload = (newItems) => {
        removeDoneTasks();
        const taskId = `upload-${newItems[0].uploadDir}-${newItems.length}-${Date.now()}`;
        const fullPath = newItems[0].destPath;
        const displayPath = newItems.length === 1 ? fullPath : `uploading ${newItems.length} files`;
        const newTask = {
            taskId,
            name: displayPath,
            value: 0,
            done: false,
            type: "upload",
            status: "upload",
            message: "waiting to upload...",
            onCancel: null,
        };
        setTasks((prev) => [...prev, newTask]);

        uploadQueueRef.current.push(async () => {
            await handleUpload(taskId, newItems);
        });

        setShowProgressView(true);

        setUploading(true);
        console.debug("addFilesToUpload", newItems);
    };

    const handleUpload = async (taskId, newItems) => {
        // shared across the worker pool
        const uploadDirSet = new Set(); // proof that dir exists
        const dirInitPromises = new Map(); // dir -> Promise
        const total = newItems.length;
        let exec_count = 0;
        let cancelled = false;
        const cancelFns = new Map();
        const perFilePercent = Array.from({ length: total }, () => ({ value: 0, message: "" }));

        // Wire this task's Cancel
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? updateTask(task, {
                          onCancel: () => {
                              cancelled = true;
                              for (const fn of cancelFns.values()) {
                                  try {
                                      fn();
                                  } catch {
                                      console.warn("failed to run onCancel()");
                                  }
                              }
                          },
                      })
                    : task
            )
        );

        const dir = newItems[0]?.uploadDir;
        if (dir) {
            const err = await checkPermission(dir);
            if (err) {
                setError("Upload", err);
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? updateTask(task, {
                                  status: "error",
                                  message: err,
                                  done: true,
                                  value: 100,
                                  onCancel: undefined,
                              })
                            : task
                    )
                );
                return;
            }
        }

        const ensureDirOnce = async (dir) => {
            if (!dir || cancelled) return;
            if (uploadDirSet.has(dir)) return;

            // someone already creating it? await that
            const existing = dirInitPromises.get(dir);
            if (existing) {
                await existing;
                return;
            }

            // create and memoize
            const p = (async () => {
                try {
                    await createDir(dir, "p=on");
                    uploadDirSet.add(dir);
                } catch (e) {
                    const msg = String(e?.message || e);
                    setError("Upload", `${e.name ?? "Error"} : ${msg}`);
                } finally {
                    dirInitPromises.delete(dir);
                }
            })();

            dirInitPromises.set(dir, p);
            await p;
        };

        let lastUpdate = 0;
        const updateOverall = (extraMsg) => {
            const now = performance?.now?.() ?? Date.now();
            if (now - lastUpdate < 80 && !extraMsg) return;
            lastUpdate = now;

            const sum = perFilePercent.reduce((acc, x) => acc + (x?.value ?? 0), 0);
            const overall = Math.floor(sum / Math.max(1, total));
            const lines = extraMsg
                ? [extraMsg]
                : perFilePercent.filter((x) => x && !x.done && x.message).map((x) => x.message);
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId
                        ? updateTask(task, {
                              value: overall,
                              message: `(${exec_count}/${total}) \n${lines.join("\n")}`,
                          })
                        : task
                )
            );
        };

        const progressCallback =
            (idx) =>
            ({ value, message, onCancel }) => {
                if (onCancel) {
                    const wrapped = () => {
                        try {
                            onCancel();
                        } catch {
                            console.debug("failed to run onCancel()");
                        }
                    };
                    cancelFns.set(idx, wrapped);
                }
                const clamp = (n) => Math.max(0, Math.min(100, n ?? 0));
                perFilePercent[idx] = {
                    value: clamp(value),
                    message: message ?? perFilePercent[idx]?.message ?? "",
                };
                updateOverall();
            };

        // Worker pool (parallel uploads within the task)
        const CONCURRENCY = normalizeParallelLimit(parallelLimit);
        console.debug("CONCURRENCY", CONCURRENCY);
        let next = 0;
        async function runOne() {
            while (!cancelled) {
                const i = next++;
                if (i >= newItems.length) break;
                const file = newItems[i];
                if (!file) break;

                const uploadDirPath = file.is_file ? getParentPath(file.destPath) : file.destPath;
                await ensureDirOnce(uploadDirPath);

                exec_count++;
                if (file.is_dir) {
                    perFilePercent[i] = {
                        done: true,
                        value: 100,
                        message: perFilePercent[i]?.message ?? "",
                    };
                    updateOverall();
                    continue;
                }
                if (cancelled) break;

                try {
                    await upload(file, file.destPath, progressCallback(i), setError);
                } catch (e) {
                    console.error("uploadFile failed:", e);
                } finally {
                    perFilePercent[i] = {
                        done: true,
                        value: perFilePercent[i]?.value ?? 0,
                        message: perFilePercent[i]?.message ?? "",
                    };
                    cancelFns.delete(i);
                    updateOverall();
                }
            }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, () => runOne()));

        // finish
        const completed = perFilePercent.filter((x) => x && x.done && x.value >= 100).length;
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? updateTask(task, {
                          status: cancelled ? "cancelled" : "completed",
                          message: cancelled
                              ? `(${completed}/${total}) Upload cancelled`
                              : `(${completed}/${total}) Upload completed`,
                          done: true,
                          onCancel: undefined,
                      })
                    : task
            )
        );
        cancelFns.clear();
        dirInitPromises.clear();
        uploadDirSet.clear();
        refreshItems();
    };

    const runUpload = async () => {
        if (isUploadingRef.current) return;
        isUploadingRef.current = true;

        try {
            while (uploadQueueRef.current.length > 0) {
                const fn = uploadQueueRef.current.shift();
                try {
                    await fn();
                } catch (e) {
                    console.error("upload batch failed:", e);
                }
            }
        } finally {
            isUploadingRef.current = false;
        }
    };

    useEffect(() => {
        console.debug("Uploading", uploading);
        if (uploading) {
            setUploading(false);
            runUpload();
        }
    }, [uploading]);

    const addItemsToDownload = (items) => {
        console.debug("addItemsToDownload: items:", items);
        downloadQueueRef.current.push(items);
        setDownloading(true);
    };

    const setError = (title, error) => {
        console.debug("error", error);
        addNotification(title, error, "error");
    };

    const handleDownload = async () => {
        if (isDownloadingRef.current) {
            console.debug("handleDownload is already running");
            return;
        }
        isDownloadingRef.current = true;
        const worker = async () => {
            while (downloadQueueRef.current.length) {
                const files = downloadQueueRef.current.shift();
                download(files, (error) => setError("download", error));
            }
            isDownloadingRef.current = false;
        };
        await worker();
    };

    useEffect(() => {
        if (downloading) {
            setDownloading(false);
            handleDownload();
        }
    }, [downloading]);

    const setItemToCopy = async (item, existingNames) => {
        removeDoneTasks();
        const filename = suggestNewName(item.name, existingNames);
        const destPath = getParentPath(item.path).replace(/\/$/, "") + "/" + filename;
        const taskId = "copy-" + filename + Date.now();

        const newTask = {
            taskId,
            name: filename,
            value: 0,
            type: "copy",
            status: "copy",
            message: "",
            onCancel: null,
        };
        setTasks((prev) => [...prev, newTask]);
        setShowProgressView(true);

        await copyFile(item.path, destPath, ({ status, value, message, done, onCancel }) => {
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId
                        ? updateTask(task, { status, value, message, done, onCancel })
                        : task
                )
            );
        });
        refreshItems();
    };

    const setItemForGfptar = async (command, targetDir, targetItems, destDir, options) => {
        removeDoneTasks();
        const taskId = "gfptar-" + destDir + Date.now();
        const newTask = {
            taskId,
            name: destDir,
            value: undefined,
            type: "gfptar",
            status: command,
            message: "",
            onCancel: null,
        };
        setTasks((prev) => [...prev, newTask]);
        setShowProgressView(true);

        await gfptar(
            command,
            targetDir,
            targetItems,
            destDir,
            options,
            ({ status, value, message, done, onCancel }) => {
                setTasks((prev) =>
                    prev.map((task) =>
                        task.taskId === taskId
                            ? updateTask(task, { status, value, message, done, onCancel })
                            : task
                    )
                );
            },
            refreshItems
        );
    };

    return {
        tasks,
        showProgressView,
        itemsToMove,
        itemsToDelete,
        setShowProgressView,
        addItemsToUpload,
        addItemsToDownload,
        setItemsToMove,
        setItemsToDelete,
        setItemToCopy,
        setItemForGfptar,
        removeDoneTasks,
        removeTasks,
    };
}

export default useProgressTasks;
