import { test, expect } from "../fixtures/extension";
import { urlOnlyRule } from "../fixtures/test-rules";

test.describe("Content Script Injection", () => {
  test("injects overlay host when a rule matches", async ({
    context,
    seedRules,
  }) => {
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });
  });

  test("does not show overlay when no rule matches", async ({
    context,
    seedRules,
  }) => {
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/no-match.html");

    // Poll until content script has had time to run, then assert no overlay
    await expect
      .poll(
        () => page.locator("#context-marker-root").count(),
        { timeout: 5000 },
      )
      .toBe(0);
  });

  test("overlay shadow root is accessible (open mode)", async ({
    context,
    seedRules,
  }) => {
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const hasShadowRoot = await page.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      return el?.shadowRoot !== null;
    });
    expect(hasShadowRoot).toBe(true);
  });

  test("overlay contains label text from rule", async ({
    context,
    seedRules,
  }) => {
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const labelText = await page.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      return el?.shadowRoot?.querySelector(".cm-bar")?.textContent?.trim();
    });
    expect(labelText).toBe("URL ONLY");
  });
});
