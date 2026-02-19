import { test, expect } from "../fixtures/extension";

test.describe("Options Page", () => {
  test("can add a new rule", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    await page.click("#add-rule");
    await page.fill("#f-name", "E2E Test Rule");
    await page.fill("#f-host", "example.com");
    await page.fill("#f-label", "TEST");
    await page.click("#dialog-save");

    const card = page.locator(".rule-card .rule-name", {
      hasText: "E2E Test Rule",
    });
    await expect(card).toBeVisible({ timeout: 3000 });
  });

  test("can edit a rule", async ({ context, extensionId, seedRules }) => {
    await seedRules([
      {
        id: "edit-test",
        name: "Edit Me",
        enabled: true,
        priority: 100,
        target: { host: "example.com" },
        detection: { mode: "urlOnly" },
        display: {
          labelTemplate: "BEFORE",
          color: "#ff0000",
          position: "headerBar",
        },
      },
    ]);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    await page.click('.rule-card[data-id="edit-test"] [data-action="edit"]');
    await page.fill("#f-name", "Edited Rule");
    await page.fill("#f-label", "AFTER");
    await page.click("#dialog-save");

    const card = page.locator(".rule-card .rule-name", {
      hasText: "Edited Rule",
    });
    await expect(card).toBeVisible({ timeout: 3000 });
  });

  test("can delete a rule", async ({ context, extensionId, seedRules }) => {
    await seedRules([
      {
        id: "delete-test",
        name: "Delete Me",
        enabled: true,
        priority: 100,
        target: { host: "example.com" },
        detection: { mode: "urlOnly" },
        display: {
          labelTemplate: "DEL",
          color: "#ff0000",
          position: "headerBar",
        },
      },
    ]);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    const card = page.locator('.rule-card[data-id="delete-test"]');
    await expect(card).toBeVisible({ timeout: 3000 });

    await page.click(
      '.rule-card[data-id="delete-test"] [data-action="delete"]',
    );

    await expect(card).not.toBeVisible({ timeout: 3000 });
  });

  test("can toggle rule enabled/disabled", async ({
    context,
    extensionId,
    seedRules,
  }) => {
    await seedRules([
      {
        id: "toggle-test",
        name: "Toggle Me",
        enabled: true,
        priority: 100,
        target: { host: "example.com" },
        detection: { mode: "urlOnly" },
        display: {
          labelTemplate: "TOG",
          color: "#ff0000",
          position: "headerBar",
        },
      },
    ]);

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    const card = page.locator('.rule-card[data-id="toggle-test"]');
    await expect(card).toBeVisible({ timeout: 3000 });
    await expect(card).not.toHaveClass(/disabled/);

    await page.click(
      '.rule-card[data-id="toggle-test"] [data-action="toggle"]',
    );

    await expect(card).toHaveClass(/disabled/, { timeout: 3000 });
  });

  test("can select display style", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    const ribbonOption = page.locator('.style-option[data-style="ribbon"]');
    await ribbonOption.click();
    await expect(ribbonOption).toHaveClass(/active/, { timeout: 3000 });

    const comboOption = page.locator('.style-option[data-style="combo"]');
    await comboOption.click();
    await expect(comboOption).toHaveClass(/active/, { timeout: 3000 });
    await expect(ribbonOption).not.toHaveClass(/active/);
  });

  test("export triggers download", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click("#export-btn"),
    ]);

    expect(download.suggestedFilename()).toBe("context-marker-rules.json");
  });
});
