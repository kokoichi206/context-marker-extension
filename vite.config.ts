import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

const target = process.env.BUILD_TARGET as
  | "background"
  | "content"
  | "options";

if (!target || !["background", "content", "options"].includes(target)) {
  throw new Error("BUILD_TARGET must be one of: background, content, options");
}

export default defineConfig(() => {
  const alias = { "@": resolve(__dirname, "src") };

  if (target === "options") {
    return {
      root: resolve(__dirname, "src/options"),
      base: "./",
      resolve: { alias },
      build: {
        outDir: resolve(__dirname, "dist/options"),
        emptyOutDir: false,
        copyPublicDir: false,
      },
    };
  }

  const entry =
    target === "background"
      ? resolve(__dirname, "src/background/serviceWorker.ts")
      : resolve(__dirname, "src/content/index.ts");
  const outFile = target === "background" ? "background.js" : "content.js";

  return {
    resolve: { alias },
    build: {
      lib: {
        entry,
        formats: ["iife" as const],
        name: "_",
        fileName: () => outFile,
      },
      outDir: resolve(__dirname, "dist"),
      emptyOutDir: false,
      copyPublicDir: false,
    },
  };
});
