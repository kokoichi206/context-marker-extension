import type { Rule } from "@/shared/validate";
import type { Fingerprint } from "@/shared/types";
import type { DisplayStyle } from "@/shared/constants";
import {
  DEBOUNCE_MS,
  POLL_DURATION_MS,
  POLL_INTERVAL_MS,
  DEFAULT_DISPLAY_STYLE,
} from "@/shared/constants";
import { createFingerprint, isSameFingerprint } from "./fingerprint";
import { resolve } from "./resolver";
import { updateOverlay, removeOverlay } from "../ui/overlay";

let rules: Rule[] = [];
let displayStyle: DisplayStyle = DEFAULT_DISPLAY_STYLE;
let lastFingerprint: Fingerprint | null = null;
let lastMatchedRuleId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let observer: MutationObserver | null = null;
let historyHooked = false;
let graceTimer: ReturnType<typeof setTimeout> | null = null;

function evaluate(): void {
  const base = createFingerprint();
  const result = resolve(rules, base);

  if (result) {
    const { rule, fingerprint } = result;

    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }

    if (
      lastMatchedRuleId === rule.id &&
      lastFingerprint &&
      isSameFingerprint(fingerprint, lastFingerprint)
    ) {
      return;
    }

    lastFingerprint = fingerprint;
    lastMatchedRuleId = rule.id;
    updateOverlay(rule, fingerprint, displayStyle);
  } else {
    if (lastMatchedRuleId !== null && !graceTimer) {
      graceTimer = setTimeout(() => {
        graceTimer = null;
        const retryBase = createFingerprint();
        const retryResult = resolve(rules, retryBase);
        if (retryResult) {
          lastFingerprint = retryResult.fingerprint;
          lastMatchedRuleId = retryResult.rule.id;
          updateOverlay(retryResult.rule, retryResult.fingerprint, displayStyle);
        } else {
          removeOverlay();
          lastMatchedRuleId = null;
          lastFingerprint = null;
        }
      }, POLL_DURATION_MS);
    }
  }
}

function scheduleEvaluate(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => evaluate(), DEBOUNCE_MS);
}

function startShortPolling(): void {
  if (pollTimer) clearInterval(pollTimer);

  const start = Date.now();
  pollTimer = setInterval(() => {
    if (Date.now() - start > POLL_DURATION_MS) {
      clearInterval(pollTimer!);
      pollTimer = null;
      return;
    }
    scheduleEvaluate();
  }, POLL_INTERVAL_MS);
}

function needsDomObserver(): boolean {
  return rules.some(
    (r) =>
      r.enabled &&
      r.detection.mode === "signals" &&
      r.detection.extractors?.some(
        (e) => e.type === "domTextRegex" || e.type === "selectorText",
      ),
  );
}

function setupObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (!needsDomObserver()) return;
  if (!document.body) return;

  observer = new MutationObserver(() => {
    scheduleEvaluate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function hookHistory(): void {
  if (historyHooked) return;
  historyHooked = true;

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPush(...args);
    scheduleEvaluate();
    startShortPolling();
  };

  history.replaceState = function (...args) {
    origReplace(...args);
    scheduleEvaluate();
    startShortPolling();
  };
}

function setupEventListeners(): void {
  window.addEventListener("popstate", () => {
    scheduleEvaluate();
    startShortPolling();
  });
  window.addEventListener("hashchange", () => scheduleEvaluate());
  window.addEventListener("focus", () => scheduleEvaluate());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      scheduleEvaluate();
    }
  });
}

export function initScheduler(
  initialRules: Rule[],
  initialDisplayStyle: DisplayStyle,
): void {
  rules = initialRules;
  displayStyle = initialDisplayStyle;
  hookHistory();
  setupEventListeners();
  setupObserver();
  evaluate();
}

export function updateRules(newRules: Rule[]): void {
  rules = newRules;
  setupObserver();
  evaluate();
}

export function updateDisplayStyle(newStyle: DisplayStyle): void {
  displayStyle = newStyle;
  // Force re-render by clearing last state
  removeOverlay();
  lastMatchedRuleId = null;
  lastFingerprint = null;
  evaluate();
}
