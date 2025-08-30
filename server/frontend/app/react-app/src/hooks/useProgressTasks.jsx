import { useState, useEffect, useRef } from "react";
import { upload, checkPermission } from "@utils/upload";
import download from "@utils/download";
import copyFile from "@utils/copy";
import gfptar from "@utils/archive";
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
        const destDirSet = {};
        const uploadDirSet = new Set(["/"]);

        let exec_count = 0;
        let cancelled = false;

        const progressCallback = ({ status, value, message, done, onCancel }) => {
            if (onCancel && cancelled) {
                onCancel();
            }
            const cancelFunc = onCancel
                ? () => {
                      cancelled = true;
                      onCancel();
                  }
                : null;
            const progressMessage = message
                ? `(${exec_count}/${newItems.length})\n ${message}`
                : null;
            setTasks((prev) =>
                prev.map((task) =>
                    task.taskId === taskId
                        ? updateTask(task, {
                              status,
                              value,
                              message: progressMessage,
                              done,
                              onCancel: cancelFunc,
                          })
                        : task
                )
            );
        };
        progressCallback({ onCancel: () => {} });

        for (const file of newItems) {
            if (cancelled) {
                break;
            }
            if (file.uploadDir && !(file.uploadDir in destDirSet)) {
                const error = await checkPermission(file.uploadDir);
                destDirSet[file.uploadDir] = error;
                if (error) {
                    setError("Upload", error);
                    break;
                }
            }
            exec_count++;
            if (!file) continue;

            const fullPath = file.destPath;

            try {
                await upload(file, fullPath, uploadDirSet, progressCallback, setError);
            } catch (e) {
                console.error("uploadFile failed:", e);
            }
        }

        setTasks((prev) =>
            prev.map((task) =>
                task.taskId === taskId
                    ? updateTask(task, {
                          status: cancelled ? "cancelled" : "completed",
                          message: cancelled
                              ? `(${exec_count}/${newItems.length}) Upload cancelled`
                              : task.message,
                          done: true,
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
