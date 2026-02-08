import { rulesSchema } from "@/shared/validate";
import type { DisplayStyle } from "@/shared/constants";
import { DEFAULT_DISPLAY_STYLE } from "@/shared/constants";
import {
  initScheduler,
  updateRules,
  updateDisplayStyle,
} from "./engine/scheduler";

async function loadRules() {
  const { rules } = await chrome.storage.local.get("rules");
  const result = rulesSchema.safeParse(rules);
  return result.success ? result.data : [];
}

async function loadDisplayStyle(): Promise<DisplayStyle> {
  const { displayStyle } = await chrome.storage.local.get("displayStyle");
  if (
    displayStyle === "topBar" ||
    displayStyle === "ribbon" ||
    displayStyle === "combo"
  ) {
    return displayStyle;
  }
  return DEFAULT_DISPLAY_STYLE;
}

async function main() {
  const [rules, displayStyle] = await Promise.all([
    loadRules(),
    loadDisplayStyle(),
  ]);
  initScheduler(rules, displayStyle);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.rules) {
      const result = rulesSchema.safeParse(changes.rules.newValue);
      if (result.success) {
        updateRules(result.data);
      }
    }
    if (changes.displayStyle) {
      const v = changes.displayStyle.newValue;
      if (v === "topBar" || v === "ribbon" || v === "combo") {
        updateDisplayStyle(v);
      }
    }
  });
}

main();
