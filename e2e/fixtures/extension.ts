import path from "node:path";
import {
  test as base,
  chromium,
  type BrowserContext,
} from "@playwright/test";
import type { Rule } from "../../src/shared/validate";
import type { DisplayStyle } from "../../src/shared/constants";

const EXTENSION_PATH = path.resolve("dist");

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  seedRules: (rules: Rule[]) => Promise<void>;
  seedDisplayStyle: (style: DisplayStyle) => Promise<void>;
};

async function getExtensionWorker(context: BrowserContext) {
  const isExtensionSW = (w: { url(): string }) =>
    w.url().startsWith("chrome-extension://");

  const existing = context.serviceWorkers().find(isExtensionSW);
  if (existing) return existing;

  return context.waitForEvent("serviceworker", {
    predicate: isExtensionSW,
    timeout: 5000,
  });
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const headed = !!process.env.HEADED;
    const args = [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--disable-gpu",
    ];
    // Playwright's built-in headless mode does not support extensions.
    // Use headless:false with Chrome's --headless=new flag instead.
    if (!headed) {
      args.push("--headless=new");
    }
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args,
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    const sw = await getExtensionWorker(context);
    const extensionId = sw.url().split("/")[2];
    await use(extensionId);
  },

  seedRules: async ({ context }, use) => {
    const seed = async (rules: Rule[]) => {
      const sw = await getExtensionWorker(context);
      await sw.evaluate(
        (r: unknown) => chrome.storage.local.set({ rules: r }),
        rules,
      );
    };
    await use(seed);
  },

  seedDisplayStyle: async ({ context }, use) => {
    const seed = async (style: DisplayStyle) => {
      const sw = await getExtensionWorker(context);
      await sw.evaluate(
        (s: string) => chrome.storage.local.set({ displayStyle: s }),
        style,
      );
    };
    await use(seed);
  },
});

export { expect } from "@playwright/test";
