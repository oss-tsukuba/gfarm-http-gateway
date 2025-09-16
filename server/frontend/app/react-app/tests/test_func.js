const fs = require("fs");
const path = require("path");
const querystring = require("node:querystring");
const { expect } = require("@playwright/test");

// ===== CONFIGURATION CONSTANTS =====
export const FRONTEND_URL = "http://localhost:3000";
// export const API_URL = FRONTEND_URL;
export const API_URL = "http://localhost:8080";
export const ZIPNAME = "files.zip";

// File paths
export const DIR_LIST = path.resolve(__dirname, "data/filelist.json");
export const ACLIST = path.resolve(__dirname, "data/aclist.json");
export const DUMMYS = path.resolve(__dirname, "data/dummy");

// Routes
export const ROUTE_STORAGE = "/ui";
export const ROUTE_DOWNLOAD = "/dl";

// Global state
let fileStructureData = null;

// ===== UTILITY FUNCTIONS =====
/**
 * Checks if a file is visible in the listview
 * @param {Object} page - Playwright page object
 * @param {string} filename - Name of the file to check
 * @param {boolean} shouldNotBeVisible - If true, expects the file to NOT be visible
 */
export async function isVisible(page, filename, shouldNotBeVisible = false) {
    const listview = page.locator('[data-testid="listview"]');
    const fileRow = listview.locator(`[data-testid="row-${filename}"]`);

    if (shouldNotBeVisible) {
        await expect(fileRow).not.toBeVisible();
    } else {
        await expect(fileRow).toBeVisible();
    }
}

/**
 * Clicks a menu item from the the context menu
 * @param {Object} page - Playwright page object
 * @param {string} filename - Name of the file
 * @param {string} action - Action to perform
 */
export async function clickMenuItemFromView(page, filename, action) {
    const fileRow = page.locator(`[data-testid="row-${filename}"]`);
    const menuButton = fileRow.locator('[data-testid="item-menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const actionButton = fileRow
        .locator(".dropdown-menu")
        .locator(`[data-testid="${action}-menu-${filename}"]`);
    await expect(actionButton).toBeVisible();
    await actionButton.click();
}

/**
 * Clicks a menu item from the actions menu
 * @param {Object} page - Playwright page object
 * @param {string} action - Action to perform
 */
export async function clickMenuItemFromMenu(page, action) {
    const actionMenu = page.locator('[data-testid="action-menu"]');
    const actionButton = actionMenu.locator(`[data-testid="action-menu-${action}"]`);
    await actionButton.click();
}

/**
 * Clicks a menu item from the new menu
 * @param {Object} page - Playwright page object
 * @param {string} action - Action to perform
 */
export async function clickMenuItemFromNewMenu(page, action) {
    const uploadMenu = page.locator('[id="upload-dropdown"]');
    await uploadMenu.click();
    const menuButton = page.locator(`[data-testid="${action}"]`);
    await menuButton.click();
}

/**
 * Checks/selects a file item in the list
 * @param {Object} page - Playwright page object
 * @param {string} filename - Name of the file to check
 */
export async function checkItem(page, filename) {
    const fileRow = page.locator(`[data-testid="row-${filename}"]`);
    await expect(fileRow).toBeVisible();
    await fileRow.locator(`[id="checkbox-${filename}"]`).check();
}

// ===== DATA TRANSFORMATION UTILITIES =====
/**
 * Transforms mtime_str to Unix timestamp for file items recursively
 * @param {Array} items - Array of file/directory items
 * @returns {Array} The same array with mtime property added
 */
export function transformMtimeToUnix(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    items.forEach((item) => {
        if (item.mtime_str) {
            const dateObj = new Date(item.mtime_str);

            if (!isNaN(dateObj.getTime())) {
                item.mtime = Math.floor(dateObj.getTime() / 1000);
            } else {
                console.warn(
                    `Warning: Could not parse mtime_str: "${item.mtime_str}". 'mtime' will not be set for this item.`
                );
            }
        }

        if (item.childlen && Array.isArray(item.childlen)) {
            transformMtimeToUnix(item.childlen);
        }
    });

    return items;
}

const normalizePath = (path) => (path?.startsWith("/") ? path : "/" + path);

const shouldSearchInNode = (node, normalizedTargetPath) => {
    return (
        node.is_dir &&
        node.childlen &&
        Array.isArray(node.childlen) &&
        (normalizedTargetPath.startsWith(node.path + "/") ||
            (node.path === "/" && normalizedTargetPath !== "/"))
    );
};

/**
 * Finds children of a directory by path in the file structure
 * @param {Array} nodes - File structure nodes
 * @param {string} targetPath - Path to search for
 * @returns {Array|null} Children array or null if not found
 */
export const findChildrenByPath = (nodes, targetPath) => {
    if (targetPath === null) return null;

    const normalizedTargetPath = normalizePath(targetPath);

    for (const node of nodes) {
        if (node.path === normalizedTargetPath) {
            return node.childlen && Array.isArray(node.childlen) ? node.childlen : [];
        }

        if (shouldSearchInNode(node, normalizedTargetPath)) {
            const foundChildren = findChildrenByPath(node.childlen, targetPath);
            if (foundChildren !== null) {
                return foundChildren;
            }
        }
    }
    return null;
};

/**
 * Finds a specific node by path in the file structure
 * @param {Array} nodes - File structure nodes
 * @param {string} targetPath - Path to search for
 * @returns {Object|null} Node object or null if not found
 */
export const findNodeByPath = (nodes, targetPath) => {
    if (targetPath === null) return null;

    const normalizedTargetPath = normalizePath(targetPath);

    for (const node of nodes) {
        if (node.path === normalizedTargetPath) {
            return node;
        }

        if (shouldSearchInNode(node, normalizedTargetPath)) {
            const foundNode = findNodeByPath(node.childlen, targetPath);
            if (foundNode !== null) {
                return foundNode;
            }
        }
    }
    return null;
};

// ===== FORMATTING UTILITIES =====
/**
 * Formats file size in human-readable format
 * @param {number} filesize - File size in bytes
 * @param {boolean} is_dir - Whether the item is a directory
 * @returns {string} Formatted size string or empty for directories
 */
export const getSize = (filesize, is_dir) => {
    if (is_dir) return "";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(filesize) / Math.log(k));

    return `${parseFloat((filesize / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatBytes = (bytes) => {
    if (bytes == null) return "";
    return new Intl.NumberFormat("en-US").format(bytes) + " bytes";
};

export const getTimeStr = (time, format = "YMD", withNanos = false) => {
    if (!time) return "unknown";

    // Seconds + Decimals
    const secInt = Math.floor(time);
    const frac = time - secInt; // decimal part

    // Convert to ns
    const nanos = BigInt(Math.round(frac * 1e9));

    let locale;
    switch (format) {
        case "MDY":
            locale = "en-US"; // month-day-year
            break;
        case "YMD":
            locale = "ja-JP"; // year-month-day
            break;
        case "DMY":
        default:
            locale = "en-GB"; // day-month-year
    }

    const d = new Date(secInt * 1000);

    if (!withNanos) {
        return d.toLocaleString(locale);
    } else {
        const offsetMin = -d.getTimezoneOffset(); // JSTなら +540
        const sign = offsetMin >= 0 ? "+" : "-";
        const hh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
        const mm = String(Math.abs(offsetMin) % 60).padStart(2, "0");
        const tzStr = `${sign}${hh}${mm}`;
        const dateStr = d.toLocaleDateString(locale);
        const timeStr = [
            String(d.getHours()).padStart(2, "0"),
            String(d.getMinutes()).padStart(2, "0"),
            String(d.getSeconds()).padStart(2, "0"),
        ].join(":");

        // 9 桁のナノ秒文字列
        const fracStr = nanos.toString().padStart(9, "0");

        return `${dateStr} ${timeStr}.${fracStr} ${tzStr}`;
    }
};

const FILE_ICON_MAP = {
    pdf: "bi bi-file-earmark-pdf",
    jpg: "bi bi-file-earmark-image",
    jpeg: "bi bi-file-earmark-image",
    png: "bi bi-file-earmark-image",
    gif: "bi bi-file-earmark-image",
    mp4: "bi bi-file-earmark-play",
    webm: "bi bi-file-earmark-play",
    mp3: "bi bi-file-earmark-music",
    wav: "bi bi-file-earmark-music",
    js: "bi bi-file-earmark-code",
    py: "bi bi-file-earmark-code",
    html: "bi bi-file-earmark-code",
    css: "bi bi-file-earmark-code",
    zip: "bi bi-file-earmark-zip",
    rar: "bi bi-file-earmark-zip",
    tar: "bi bi-file-earmark-zip",
    gz: "bi bi-file-earmark-zip",
};

/**
 * Gets appropriate Bootstrap icon class for file type
 * @param {string} ext - File extension
 * @param {boolean} is_dir - Whether the item is a directory
 * @param {boolean} is_sym - Whether the item is a symbolic link
 * @returns {string} Bootstrap icon class name
 */
export const getFileIconDefault = (ext, is_dir, is_sym) => {
    if (is_dir) return "bi bi-folder-fill";
    if (is_sym) return "bi bi-link-45deg";

    return FILE_ICON_MAP[ext?.toLowerCase()] || "bi bi-file-earmark";
};

/**
 * Reads dummy file content for testing
 * @param {string} filename - Name of the dummy file
 * @returns {string} File content
 */
export const getDummyFileContent = (filename) => {
    return fs.readFileSync(path.join(DUMMYS, filename), "utf8");
};

// ===== TEST UTILITIES =====

/**
 * Freeze time for testing purposes.
 * @param {Object} page - Playwright page object
 * @param {string} isoDate - ISO-formatted date string
 * @returns {Promise<void>}
 */
export async function freezeTime(page, isoDate) {
    await page.addInitScript((isoDate) => {
        const fixed = new Date(isoDate);
        const OriginalDate = Date;

        class MockDate extends OriginalDate {
            constructor(...args) {
                return args.length === 0 ? new OriginalDate(fixed) : new OriginalDate(...args);
            }

            static now() {
                return fixed.getTime();
            }

            static parse = OriginalDate.parse;
            static UTC = OriginalDate.UTC;

            static [Symbol.hasInstance](instance) {
                return instance instanceof OriginalDate;
            }
        }

        window.Date = MockDate;
    }, isoDate);
}

/**
 * Convert `-rwxrwxrwx` to octal.
 * @param {string} symbolic - Symbolic mode string (e.g. '-rwxr-xr--')
 * @returns {string} Octal representation (e.g. '0754')
 */
export function symbolicToOctal(symbolic) {
    if (typeof symbolic !== "string" || symbolic.length < 10) return null;

    const perms = symbolic.slice(1);

    const calculateDigit = (permStr) =>
        (permStr[0] === "r" ? 4 : 0) + (permStr[1] === "w" ? 2 : 0) + (permStr[2] === "x" ? 1 : 0);

    const owner = calculateDigit(perms.slice(0, 3));
    const group = calculateDigit(perms.slice(3, 6));
    const other = calculateDigit(perms.slice(6, 9));

    return `${owner}${group}${other}`;
}

// ===== ROUTE MOCKING =====
/**
 * Sets up a mock route for testing API endpoints
 * @param {Object} page - Playwright page object
 * @param {string} mockUrl - URL pattern to mock
 * @param {string} method - HTTP method
 * @param {string} pathname - Path to match
 * @param {Object} options - Mock configuration options
 */
export async function mockRoute(
    page,
    mockUrl,
    method,
    pathname,
    {
        validateBody,
        statusCode = 200,
        contentType = "application/json",
        response = JSON.stringify({}),
    } = {}
) {
    await page.route(mockUrl, async (route, request) => {
        if (!request.url().includes(pathname) || request.method() !== method) {
            return await handleRoute(route, request);
        }

        console.log("[MOCK]", pathname, method, statusCode);
        console.log("[MOCK] request.url()", request.url());

        if (validateBody && request.postData()) {
            try {
                const body = JSON.parse(request.postData());
                validateBody(body);
            } catch (error) {
                console.warn("Failed:", error);
                throw error;
            }
        }

        await route.fulfill({
            status: statusCode,
            contentType,
            body: response,
        });
    });
}

// ===== ROUTE HANDLERS =====

/**
 * Initialize file structure data if not already loaded
 */
const initializeFileStructureData = () => {
    if (fileStructureData === null) {
        fileStructureData = transformMtimeToUnix(JSON.parse(fs.readFileSync(DIR_LIST, "utf-8")));
    }
};

export const toNDJSON = (data) => {
    if (Array.isArray(data)) return data.map((x) => JSON.stringify(x)).join("\n") + "\n";
    if (data && typeof data === "object") return JSON.stringify(data) + "\n";
    return "";
};

/**
 * Handle /dir/ GET requests
 */
const handleDirGetRoute = async (route, url, requestUrl) => {
    console.log("[MOCK] /dir/", url);
    const path = url.split("/dir/", 2)[1].split("?")[0];
    const effperm = requestUrl.searchParams.get("effperm");

    if (effperm) {
        await route.fulfill({
            status: 200,
            contentType: "application/x-ndjson",
            body: toNDJSON([{ perms: "rwx" }]),
        });
        console.log("return /dir/", [{ perms: "rwx" }]);
        return;
    }

    const jsonData = findChildrenByPath(fileStructureData, path);
    if (jsonData !== null) {
        await route.fulfill({
            status: 200,
            contentType: "application/x-ndjson",
            body: toNDJSON(jsonData),
        });
    } else {
        const responseData = {
            detail: {
                command: "gfls",
                message: "no such file or directory",
                stdout: "",
                stderr: "",
            },
        };
        await route.fulfill({
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(responseData),
        });
    }
};

/**
 * Handle /dir/ PUT requests (create directory)
 */
const handleDirPutRoute = async (route, url) => {
    console.log("[MOCK] /dir/", url);
    const dirPath = decodeURIComponent(url.split("/dir/")[1].split("?")[0]);

    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: `Directory '${dirPath}' created successfully.` }),
    });
};

/**
 * Handle /user_info requests
 */
const handleUserInfoRoute = async (route, url) => {
    console.log("[MOCK] /user_info", url);
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ username: "user1", home_directory: "/documents" }),
    });
};

/**
 * Handle /attr/ GET requests
 */
const handleAttrRoute = async (route, url) => {
    console.log("[MOCK] /attr/", url);
    const filePath = decodeURIComponent(url.split("/attr/", 2)[1].split("?")[0]);
    const fileNode = findNodeByPath(fileStructureData, filePath);

    if (fileNode) {
        const d = new Date(fileNode.mtime_str);
        const unixtime_f = d.getTime() / 1000;
        const sec = Math.floor(unixtime_f);
        const nano = Math.round((unixtime_f - sec) * 1e9);
        const detailResponse = {
            File: fileNode.name,
            Filetype: fileNode.name.includes(".")
                ? fileNode.name.split(".").pop()
                : fileNode.is_file
                  ? "regular file"
                  : "directory",
            Size: fileNode.size,
            Mode: symbolicToOctal(fileNode.mode_str),
            Access: fileNode.mtime_str,
            AccessSeconds: sec,
            AccessNanos: nano,
            Modify: fileNode.mtime_str,
            ModifySeconds: sec,
            ModifyNanos: nano,
            Change: fileNode.mtime_str,
            ChangeSeconds: sec,
            ChangeNanos: nano,
            Uid: fileNode.uname,
            Gid: fileNode.gname,
            MetadataHost: "test-host.local",
            MetadataPort: 8080,
            MetadataUser: "testuser",
            Cksum: 123456,
            CksumType: "test",
        };

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(detailResponse),
        });
    } else {
        await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "File not found" }),
        });
    }
};

/**
 * Handle /file/ GET requests
 */
const handleFileGetRoute = async (route, url, requestUrl) => {
    console.log("[MOCK] /file/", url);
    const filePath = decodeURIComponent(url.split("/file/")[1].split("?")[0]);
    const filename = filePath.split("/").pop();
    const ext = filename.split(".").pop();
    const action = requestUrl.searchParams.get("action") || "view";

    console.log("filename", filename);

    // Handle special test files
    if (filename === "deleted_file.txt") {
        await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: `File not found: ${filePath}` }),
        });
        return;
    }

    if (filePath.endsWith("backend_disconnect.txt")) {
        await route.continue();
        return;
    }

    if (filePath.endsWith("cancellable_file.txt")) {
        return;
    }

    // Generate mock content based on file type
    const mockContent = `This is the content of /${filePath}.`;
    const mockContent_html = `<!DOCTYPE html><html><body><h1>${filePath} Content</h1><p>This file was displayed in a new tab.</p></body></html>`;
    const mockContent_pdf = Buffer.from(
        "JVBERi0xLjQKJdDUxdgKMSAwIG9iagogIDw8L1BhZ2VzIDIgMCBSD4u (a very short PDF string) ...",
        "base64"
    );

    const headers = {};
    if (ext === "html") {
        headers["content-type"] = "text/html";
        headers["content-length"] = mockContent_html.length.toString();
    } else if (ext === "pdf") {
        headers["content-type"] = "application/pdf";
        headers["content-length"] = mockContent_pdf.length.toString();
    } else {
        headers["content-type"] = "text/plain";
        headers["content-length"] = mockContent.length.toString();
    }

    if (action === "download") {
        const encoded = encodeURIComponent(filename);
        headers["content-disposition"] = `attachment; filename*=UTF-8''"${encoded}"`;
    }

    if (filename.includes("empty")) {
        await route.fulfill({
            status: 200,
            body: "",
            headers,
        });
    } else {
        await route.fulfill({
            status: 200,
            body: mockContent,
            headers,
        });
    }
};

/**
 * Handle /file/ DELETE requests
 */
const handleFileDeleteRoute = async (route, url) => {
    console.log("[MOCK] /file/", url);
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
    });
};

/**
 * Handle /zip POST requests
 */
const handleZipRoute = async (route, request, url) => {
    console.log("[MOCK] /zip/", url);
    const postData = request.postData();
    const parsed = querystring.parse(postData);
    const files = Array.isArray(parsed["paths"]) ? parsed["paths"] : [parsed["paths"]];
    console.debug("Intercepted /zip POST data:", files);

    const AdmZip = require("adm-zip");
    const zip = new AdmZip();

    for (const item of files) {
        const node = findNodeByPath(fileStructureData, item);

        if (node) {
            const entryPath = node.name;

            if (node.is_file) {
                let fileContent = `Dummy content for ${node.path}. Size: ${getSize(node.size)}`;
                if (node.size === 0) {
                    fileContent = "";
                }
                zip.addFile(entryPath, fileContent);
                console.log(`[ROUTE MOCK] Added file to ZIP: ${entryPath}`);
            } else {
                zip.addFile(entryPath + "/", Buffer.from(""));
                console.log(`[ROUTE MOCK] Added directory to ZIP: ${entryPath}`);
            }
        } else {
            console.warn(`[ROUTE MOCK] Path not found in mock data: ${item}`);
        }
    }

    const zipContentBuffer = zip.toBuffer();
    const headers = {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${ZIPNAME}`,
        "Content-Length": zipContentBuffer.length.toString(),
    };

    await route.fulfill({
        status: 200,
        body: zipContentBuffer,
        headers,
    });
};

/**
 * Handle /users GET requests
 */
const handleUsersRoute = async (route, url) => {
    console.log("[MOCK] /users GET", url);
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ list: ["userA", "userB", "userC", "admin"] }),
    });
};

/**
 * Handle /groups GET requests
 */
const handleGroupsRoute = async (route, url) => {
    console.log("[MOCK] /groups GET", url);
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ list: ["groupA", "groupB", "developers", "testers"] }),
    });
};

/**
 * Handle /acl GET requests
 */
const handleAclGetRoute = async (route, url) => {
    console.log("[MOCK] /acl GET", url);
    const mockAclData = JSON.parse(fs.readFileSync(ACLIST, "utf-8"));

    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ acl: mockAclData }),
    });
};

/**
 * Handle /acl POST requests
 */
const handleAclPostRoute = async (route, url) => {
    console.log("[MOCK] /acl POST", url);
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "ACL updated successfully" }),
    });
};

/**
 * Handle /copy requests
 */
const handleCopyRoute = async (route, url) => {
    console.log("[MOCK] /copy", url);
    const headers = {
        "content-type": "application/json",
        "transfer-encoding": "chunked",
    };

    let chunks = "";
    let copied = 0;
    const total = 1024 * 1024 * 50;
    const chunkSize = 1024 * 500;

    while (copied < total) {
        copied += chunkSize;
        if (copied > total) copied = total;
        chunks += JSON.stringify({ copied, total }) + "\n";
    }

    chunks += JSON.stringify({ copied: total, total, done: true }) + "\n";

    await route.fulfill({
        status: 200,
        headers,
        body: chunks,
    });
};

/**
 * Handle /move requests
 */
const handleMoveRoute = async (route, url) => {
    console.log("[MOCK] /move", url);
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
    });
};

/**
 * Mock route handler for intercepting and simulating API requests during tests.
 *
 * This function acts as a central mock server for various API endpoints.
 * It intercepts network requests made by Playwright and returns mock responses
 * depending on the request URL and method.
 *
 * @param {import('@playwright/test').Route} route - The intercepted Playwright route object
 * @param {import('@playwright/test').Request} request - The intercepted Playwright request object
 * @returns {Promise<void>}
 */
export const handleRoute = async (route, request) => {
    const url = request.url();
    const method = request.method();
    const requestUrl = new URL(url);
    console.log("url", url);

    initializeFileStructureData();

    if (!url.includes("/file/") && (url.endsWith(".js") || url.endsWith(".mjs"))) {
        return route.fallback();
    }
    if (!url.includes("/file/") && url.endsWith(".css")) {
        return route.fallback();
    }

    // Route to appropriate handler based on URL and method
    if (url.includes("/dir/") && method === "GET") {
        await handleDirGetRoute(route, url, requestUrl);
    } else if (url.includes("/dir/") && method === "PUT") {
        await handleDirPutRoute(route, url);
    } else if (url.includes("/user_info")) {
        await handleUserInfoRoute(route, url);
    } else if (url.includes("/attr/") && method === "GET") {
        await handleAttrRoute(route, url);
    } else if (url.includes("/file/") && method === "GET") {
        await handleFileGetRoute(route, url, requestUrl);
    } else if (url.includes("/file/") && method === "DELETE") {
        await handleFileDeleteRoute(route, url);
    } else if (url.includes("/zip") && method === "POST") {
        await handleZipRoute(route, request, url);
    } else if (url.includes("/users") && method === "GET") {
        await handleUsersRoute(route, url);
    } else if (url.includes("/groups") && method === "GET") {
        await handleGroupsRoute(route, url);
    } else if (url.includes("/acl") && method === "GET") {
        await handleAclGetRoute(route, url);
    } else if (url.includes("/acl") && method === "POST") {
        await handleAclPostRoute(route, url);
    } else if (url.includes("/copy") && method === "POST") {
        await handleCopyRoute(route, url);
    } else if (url.includes("/move") && method === "POST") {
        await handleMoveRoute(route, url);
    } else {
        await route.continue();
    }
};

export async function mockFileIcons(route, request) {
    const url = request.url();
    if (url.includes("file_icons.json")) {
        return route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "File not found" }),
        });
    }
    return route.fallback();
}
