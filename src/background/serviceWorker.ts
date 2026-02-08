import { rulesSchema } from "@/shared/validate";
import { loadRules, saveRules } from "./storage";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Context Marker installed");
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "getRules") {
    loadRules().then((rules) => sendResponse(rules));
    return true;
  }
  if (message.type === "saveRules") {
    const result = rulesSchema.safeParse(message.rules);
    if (!result.success) {
      sendResponse({ ok: false, error: result.error.message });
      return true;
    }
    saveRules(result.data).then(() => sendResponse({ ok: true }));
    return true;
  }
});
