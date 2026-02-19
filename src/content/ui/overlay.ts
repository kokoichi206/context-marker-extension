import type { Fingerprint } from "@/shared/types";
import type { Rule } from "@/shared/validate";
import type { DisplayStyle } from "@/shared/constants";

type OverlayState = {
  host: HTMLElement;
  shadow: ShadowRoot;
  style: HTMLStyleElement;
  container: HTMLDivElement;
  originalTitle: string | null;
  currentOffset: number;
};

let state: OverlayState | null = null;

function getNestedValue(obj: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function resolveTemplate(template: string, fingerprint: Fingerprint): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    return getNestedValue(fingerprint, key.trim()) ?? "";
  });
}

function ensureState(): OverlayState {
  if (state) return state;

  const host = document.createElement("div");
  host.id = "context-marker-root";
  const shadow = host.attachShadow({ mode: "open" });

  const styleEl = document.createElement("style");
  const container = document.createElement("div");
  container.className = "cm-root";

  shadow.appendChild(styleEl);
  shadow.appendChild(container);
  document.documentElement.appendChild(host);

  state = {
    host,
    shadow,
    style: styleEl,
    container,
    originalTitle: null,
    currentOffset: 0,
  };
  return state;
}

const CM_ADJUSTED_ATTR = "data-cm-adjusted";

// Push page content down so the bar doesn't overlap.
// margin-top handles normal-flow content; fixed/sticky elements
// need their `top` adjusted directly.
function applyPageOffset(px: number): void {
  if (!state) return;
  if (state.currentOffset === px) return;

  if (px > 0) {
    document.documentElement.style.setProperty(
      "margin-top",
      `${px}px`,
      "important",
    );
    nudgeFixedElements(px);
  } else {
    document.documentElement.style.removeProperty("margin-top");
    revertFixedElements();
  }
  state.currentOffset = px;
}

function nudgeFixedElements(offset: number): void {
  revertFixedElements();
  if (!document.body) return;

  const scan = () => {
    walkFixed(document.body, offset, 0);
  };

  scan();
  // SPA pages may add fixed elements after initial render
  setTimeout(scan, 1000);
  setTimeout(scan, 3000);
}

const MAX_DEPTH = 4;

function walkFixed(root: Element, offset: number, depth: number): void {
  if (depth > MAX_DEPTH) return;
  for (const el of root.children) {
    const htmlEl = el as HTMLElement;
    if (htmlEl.id === "context-marker-root") continue;
    if (htmlEl.hasAttribute(CM_ADJUSTED_ATTR)) continue;

    const cs = getComputedStyle(htmlEl);
    if (cs.position === "fixed" || cs.position === "sticky") {
      const top = parseFloat(cs.top);
      if (!isNaN(top) && top < offset && htmlEl.getBoundingClientRect().height >= 10) {
        htmlEl.setAttribute(CM_ADJUSTED_ATTR, String(top));
        htmlEl.style.setProperty("top", `${top + offset}px`, "important");
      }
    }
    walkFixed(el, offset, depth + 1);
  }
}

function revertFixedElements(): void {
  document.querySelectorAll(`[${CM_ADJUSTED_ATTR}]`).forEach((el) => {
    const orig = el.getAttribute(CM_ADJUSTED_ATTR)!;
    (el as HTMLElement).style.setProperty("top", `${orig}px`);
    el.removeAttribute(CM_ADJUSTED_ATTR);
  });
}

const BAR_HEIGHT = 28;
const COMBO_BAR_HEIGHT = 26;

function buildTopBar(label: string, color: string, opacity: number): { html: string; css: string; offset: number } {
  return {
    html: `<div class="cm-bar">${escHtml(label)}</div>`,
    css: `
      .cm-bar {
        position: fixed; top: 0; left: 0; right: 0;
        z-index: 2147483647;
        height: ${BAR_HEIGHT}px;
        background: ${color};
        color: #fff;
        font: bold 13px/${BAR_HEIGHT}px system-ui, sans-serif;
        text-align: center;
        letter-spacing: 0.5px;
        opacity: ${opacity};
        pointer-events: none;
      }
    `,
    offset: BAR_HEIGHT,
  };
}

function buildRibbon(label: string, color: string, opacity: number): { html: string; css: string; offset: number } {
  return {
    html: `<div class="cm-ribbon">${escHtml(label)}</div>`,
    css: `
      .cm-ribbon {
        position: fixed; top: 28px; right: -40px;
        z-index: 2147483647;
        background: ${color};
        color: #fff;
        font: bold 11px/1 system-ui, sans-serif;
        padding: 6px 50px;
        transform: rotate(45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        opacity: ${opacity};
        pointer-events: none;
        white-space: nowrap;
      }
    `,
    offset: 0,
  };
}

function buildCombo(label: string, color: string, opacity: number): { html: string; css: string; offset: number } {
  return {
    html: `<div class="cm-border"></div><div class="cm-tint"></div><div class="cm-bar">${escHtml(label)}</div>`,
    css: `
      .cm-border {
        position: fixed; inset: 0;
        z-index: 2147483646;
        border: 3px solid ${color};
        pointer-events: none;
        opacity: ${opacity};
      }
      .cm-tint {
        position: fixed; inset: 0;
        z-index: 2147483645;
        background: ${color};
        opacity: 0.06;
        pointer-events: none;
      }
      .cm-bar {
        position: fixed; top: 0; left: 3px; right: 3px;
        z-index: 2147483647;
        height: ${COMBO_BAR_HEIGHT}px;
        background: ${color};
        color: #fff;
        font: bold 12px/${COMBO_BAR_HEIGHT}px system-ui, sans-serif;
        text-align: center;
        letter-spacing: 0.5px;
        opacity: ${opacity};
        pointer-events: none;
      }
    `,
    offset: COMBO_BAR_HEIGHT,
  };
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function updateOverlay(
  rule: Rule,
  fingerprint: Fingerprint,
  displayStyle: DisplayStyle,
): void {
  const label = resolveTemplate(rule.display.labelTemplate, fingerprint);
  const { color, opacity = 0.95 } = rule.display;
  const s = ensureState();

  let result: { html: string; css: string; offset: number };
  switch (displayStyle) {
    case "ribbon":
      result = buildRibbon(label, color, opacity);
      break;
    case "combo":
      result = buildCombo(label, color, opacity);
      break;
    case "topBar":
    default:
      result = buildTopBar(label, color, opacity);
      break;
  }

  s.style.textContent = result.css;
  s.container.innerHTML = result.html;
  applyPageOffset(result.offset);

  const prefix = rule.display.extras?.titlePrefix;
  if (prefix) {
    if (s.originalTitle === null) {
      s.originalTitle = document.title;
    }
    if (!document.title.startsWith(prefix)) {
      document.title = prefix + (s.originalTitle ?? document.title);
    }
  }
}

export function removeOverlay(): void {
  if (!state) return;

  if (state.originalTitle !== null) {
    document.title = state.originalTitle;
  }
  applyPageOffset(0);
  state.host.remove();
  state = null;
}
