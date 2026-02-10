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
    let sw = context.serviceWorkers()[0];
    if (!sw) {
      sw = await context.waitForEvent("serviceworker");
    }
    const extensionId = sw.url().split("/")[2];
    await use(extensionId);
  },

  seedRules: async ({ context }, use) => {
    const seed = async (rules: Rule[]) => {
      let sw = context.serviceWorkers()[0];
      if (!sw) {
        sw = await context.waitForEvent("serviceworker");
      }
      await sw.evaluate(
        (r: unknown) => chrome.storage.local.set({ rules: r }),
        rules,
      );
    };
    await use(seed);
  },

  seedDisplayStyle: async ({ context }, use) => {
    const seed = async (style: DisplayStyle) => {
      let sw = context.serviceWorkers()[0];
      if (!sw) {
        sw = await context.waitForEvent("serviceworker");
      }
      await sw.evaluate(
        (s: string) => chrome.storage.local.set({ displayStyle: s }),
        style,
      );
    };
    await use(seed);
  },
});

export { expect } from "@playwright/test";
