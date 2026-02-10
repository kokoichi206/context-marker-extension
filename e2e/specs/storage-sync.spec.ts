import { test, expect } from "../fixtures/extension";
import { urlOnlyRule } from "../fixtures/test-rules";

test.describe("Storage Sync", () => {
  test("rule added in options page shows overlay on matching page", async ({
    context,
    extensionId,
  }) => {
    const optionsPage = await context.newPage();
    await optionsPage.goto(
      `chrome-extension://${extensionId}/options/index.html`,
    );

    await optionsPage.click("#add-rule");
    await optionsPage.fill("#f-name", "Sync Test Rule");
    await optionsPage.fill(
      "#f-url-pattern",
      "http://localhost:5678/url-only.html",
    );
    await optionsPage.fill("#f-label", "SYNCED");
    await optionsPage.click("#dialog-save");

    const card = optionsPage.locator(".rule-card .rule-name", {
      hasText: "Sync Test Rule",
    });
    await expect(card).toBeVisible({ timeout: 3000 });

    const contentPage = await context.newPage();
    await contentPage.goto("/url-only.html");

    const host = contentPage.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await contentPage.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      return el?.shadowRoot?.querySelector(".cm-bar")?.textContent?.trim();
    });
    expect(text).toBe("SYNCED");
  });

  test("display style change in options reflects on content page", async ({
    context,
    extensionId,
    seedRules,
  }) => {
    await seedRules([urlOnlyRule]);

    const contentPage = await context.newPage();
    await contentPage.goto("/url-only.html");

    const host = contentPage.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const optionsPage = await context.newPage();
    await optionsPage.goto(
      `chrome-extension://${extensionId}/options/index.html`,
    );

    const ribbonOption = optionsPage.locator(
      '.style-option[data-style="ribbon"]',
    );
    await ribbonOption.click();
    await expect(ribbonOption).toHaveClass(/active/, { timeout: 3000 });

    // Reload to pick up the new style
    await contentPage.reload();
    await expect(host).toBeAttached({ timeout: 5000 });

    const hasRibbon = await contentPage.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      return el?.shadowRoot?.querySelector(".cm-ribbon") !== null;
    });
    expect(hasRibbon).toBe(true);
  });
});
