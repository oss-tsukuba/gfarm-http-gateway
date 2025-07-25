const { test, expect } = require("@playwright/test");

const {
    waitForReact,
    handleRoute,
    mockRoute,
    clickMenuItemFromNewMenu,
    API_URL,
    FRONTEND_URL,
    ROUTE_STORAGE,
} = require("./test_func");

async function mockCreateRoute(
    page,
    { filepath, statusCode = 200, mockResponse = { result: "ok" } }
) {
    await mockRoute(page, `${API_URL}/**`, "PUT", "/dir" + filepath, {
        statusCode,
        contentType: "application/json",
        response: JSON.stringify(mockResponse),
    });
}

// === Tests ===
test.beforeEach(async ({ context }) => {
    await waitForReact();
    await context.route(`${API_URL}/**`, (route, request) => handleRoute(route, request));
});

test("create directory", async ({ page }) => {
    const currentDirectory = "/";
    const testDirName = "testdir";

    await mockCreateRoute(page, {
        filepath: "/" + testDirName,
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
    await page.waitForLoadState("networkidle");

    await clickMenuItemFromNewMenu(page, "create-directory");

    const newdirModal = page.locator('[data-testid="newdir-modal"]');
    await expect(newdirModal).toBeVisible();

    const input = newdirModal.locator('[id="create-dir-input"]');
    await input.fill(testDirName);

    await page.waitForTimeout(100);

    const confirmButton = newdirModal.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
});

test("create directory error", async ({ page }) => {
    const currentDirectory = "/";
    const testDirName = "testdir";

    await mockCreateRoute(page, {
        filepath: "/" + testDirName,
        statusCode: 500,
        mockResponse: { detail: "error test" },
    });

    await page.goto(`${FRONTEND_URL}/#${ROUTE_STORAGE}${currentDirectory}`);
    await page.waitForLoadState("networkidle");

    await clickMenuItemFromNewMenu(page, "create-directory");

    const newdirModal = page.locator('[data-testid="newdir-modal"]');
    await expect(newdirModal).toBeVisible();

    const input = newdirModal.locator('[id="create-dir-input"]');
    await input.fill(testDirName);

    await page.waitForTimeout(100);

    const confirmButton = newdirModal.locator('[data-testid="modal-button-confirm"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    const errorNotification = page.locator('[data-testid^="notification-"]');
    await expect(errorNotification).toBeVisible();
    await expect(errorNotification).toContainText("500");
    await expect(errorNotification).toContainText("error test");
});
