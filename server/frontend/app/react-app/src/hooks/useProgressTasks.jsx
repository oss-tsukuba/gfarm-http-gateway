import { useState, useEffect, useRef } from "react";
import { upload, checkPermission } from "@utils/upload";
import download from "@utils/download";
import copyFile from "@utils/copy";
import gfptar from "@utils/archive";
import { createDir } from "@utils/dircommon";
import { PARALLEL_LIMIT } from "@utils/config";
import { getParentPath, suggestNewName } from "@utils/func";

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
        const cancelFns = new Set();
        const perFilePercent = Array.from({ length: total }, () => ({ value: 0, message: "" }));

        // Wire this task's Cancel
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? updateTask(task, {
                          onCancel: () => {
                              cancelled = true;
                              for (const onCancel of Array.from(cancelFns)) {
                                  try {
                                      onCancel();
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
                : perFilePercent
                      .filter((x) => x && x.value < 100 && x.message)
                      .map((x) => x.message);
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
                    cancelFns.add(wrapped);
                }
                const clamp = (n) => Math.max(0, Math.min(100, n ?? 0));
                perFilePercent[idx] = {
                    value: clamp(value),
                    message: message ?? perFilePercent[idx]?.message ?? "",
                };
                updateOverall();
            };

        // Worker pool (parallel uploads within the task)
        const CONCURRENCY = Math.max(1, PARALLEL_LIMIT);
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
                    perFilePercent[i] = { value: 100, message: perFilePercent[i]?.message ?? "" };
                    updateOverall();
                    continue;
                }
                if (cancelled) break;

                try {
                    await upload(file, file.destPath, progressCallback(i), setError);
                } catch (e) {
                    console.error("uploadFile failed:", e);
                } finally {
                    perFilePercent[i] = { value: 100, message: perFilePercent[i]?.message ?? "" };
                    updateOverall();
                }
            }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, () => runOne()));

        // finish
        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? updateTask(task, {
                          status: cancelled ? "cancelled" : "completed",
                          message: cancelled
                              ? `(${exec_count}/${newItems.length}) Upload cancelled`
                              : `(${exec_count}/${newItems.length}) Upload completed`,
                          done: true,
                          value: 100,
                      })
                    : task
            )
        );
        refreshItems();
    };

    const runUploadWithLimit = async () => {
        if (isUploadingRef.current) return;
        isUploadingRef.current = true;

        const running = new Set();
        const startNext = () => {
            while (running.size < PARALLEL_LIMIT && uploadQueueRef.current.length > 0) {
                const fn = uploadQueueRef.current.shift();
                const p = Promise.resolve()
                    .then(fn)
                    .catch((e) => console.error("upload batch failed:", e))
                    .finally(() => running.delete(p));
                running.add(p);
            }
        };

        startNext();

        while (running.size > 0 || uploadQueueRef.current.length > 0) {
            if (running.size === 0) {
                startNext();
                continue;
            }
            await Promise.race(running);
            startNext();
        }

        isUploadingRef.current = false;
    };

    useEffect(() => {
        console.debug("Uploading", uploading);
        if (uploading) {
            setUploading(false);
            runUploadWithLimit();
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
