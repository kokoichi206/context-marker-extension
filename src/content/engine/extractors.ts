import type { Extractor } from "@/shared/validate";

function getScopeElements(scope?: "header" | "nav" | "body"): Element[] {
  if (!scope || scope === "body") {
    return [document.body];
  }
  const selectors: Record<string, string> = {
    header: "header, nav, [role='banner']",
    nav: "nav, [role='navigation']",
  };
  const els = document.querySelectorAll(selectors[scope]);
  return els.length > 0 ? Array.from(els) : [document.body];
}

export function runExtractor(extractor: Extractor): string | null {
  switch (extractor.type) {
    case "domTextRegex": {
      const elements = getScopeElements(extractor.scope);
      const re = new RegExp(extractor.pattern);
      for (const el of elements) {
        const text = el.textContent ?? "";
        const match = re.exec(text);
        if (match) {
          return match[1] ?? match[0];
        }
      }
      return null;
    }
    case "meta": {
      const metas = document.querySelectorAll("meta[name]");
      for (const m of metas) {
        if (m.getAttribute("name") === extractor.name) {
          return m.getAttribute("content") ?? null;
        }
      }
      return null;
    }
    case "titleRegex": {
      const re = new RegExp(extractor.pattern);
      const match = re.exec(document.title);
      return match ? (match[1] ?? match[0]) : null;
    }
    case "selectorText": {
      const el = document.querySelector(extractor.selector);
      return el?.textContent?.trim() ?? null;
    }
  }
}
