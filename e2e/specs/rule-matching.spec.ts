import { test, expect } from "../fixtures/extension";
import {
  urlOnlyRule,
  metaRule,
  domTextRule,
  titleRule,
  selectorRule,
  highPriorityRule,
  lowPriorityRule,
} from "../fixtures/test-rules";

function overlayText(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.getElementById("context-marker-root");
    const bar = el?.shadowRoot?.querySelector(".cm-bar");
    return bar?.textContent?.trim() ?? null;
  });
}

function overlayExists(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.getElementById("context-marker-root");
    if (!el?.shadowRoot) return false;
    return el.shadowRoot.querySelector(".cm-bar, .cm-ribbon") !== null;
  });
}

test.describe("Rule Matching", () => {
  test("urlOnly mode matches by URL", async ({ context, seedRules }) => {
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await overlayText(page);
    expect(text).toBe("URL ONLY");
  });

  test("signals + meta extractor", async ({ context, seedRules }) => {
    await seedRules([metaRule]);
    const page = await context.newPage();
    await page.goto("/signals-meta.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await overlayText(page);
    expect(text).toBe("ENV: production");
  });

  test("signals + domTextRegex extractor", async ({
    context,
    seedRules,
  }) => {
    await seedRules([domTextRule]);
    const page = await context.newPage();
    await page.goto("/signals-dom-text.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await overlayText(page);
    expect(text).toBe("Account: 123456789012");
  });

  test("signals + titleRegex extractor", async ({ context, seedRules }) => {
    await seedRules([titleRule]);
    const page = await context.newPage();
    await page.goto("/signals-title.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await overlayText(page);
    expect(text).toBe("Production");
  });

  test("signals + selectorText extractor", async ({
    context,
    seedRules,
  }) => {
    await seedRules([selectorRule]);
    const page = await context.newPage();
    await page.goto("/signals-selector.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await overlayText(page);
    expect(text).toBe("Badge: staging");
  });

  test("higher priority rule wins", async ({ context, seedRules }) => {
    await seedRules([lowPriorityRule, highPriorityRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const text = await overlayText(page);
    expect(text).toBe("HIGH PRIORITY");
  });

  test("disabled rule is ignored", async ({ context, seedRules }) => {
    const disabledRule = { ...urlOnlyRule, enabled: false };
    await seedRules([disabledRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    await expect
      .poll(() => overlayExists(page), { timeout: 5000 })
      .toBe(false);
  });

  test("display style: topBar", async ({
    context,
    seedRules,
    seedDisplayStyle,
  }) => {
    await seedDisplayStyle("topBar");
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const hasBar = await page.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      return el?.shadowRoot?.querySelector(".cm-bar") !== null;
    });
    expect(hasBar).toBe(true);
  });

  test("display style: ribbon", async ({
    context,
    seedRules,
    seedDisplayStyle,
  }) => {
    await seedDisplayStyle("ribbon");
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const hasRibbon = await page.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      return el?.shadowRoot?.querySelector(".cm-ribbon") !== null;
    });
    expect(hasRibbon).toBe(true);
  });

  test("display style: combo", async ({
    context,
    seedRules,
    seedDisplayStyle,
  }) => {
    await seedDisplayStyle("combo");
    await seedRules([urlOnlyRule]);
    const page = await context.newPage();
    await page.goto("/url-only.html");

    const host = page.locator("#context-marker-root");
    await expect(host).toBeAttached({ timeout: 5000 });

    const hasCombo = await page.evaluate(() => {
      const el = document.getElementById("context-marker-root");
      const sr = el?.shadowRoot;
      return (
        sr?.querySelector(".cm-bar") !== null &&
        sr?.querySelector(".cm-border") !== null
      );
    });
    expect(hasCombo).toBe(true);
  });
});
