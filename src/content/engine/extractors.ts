import type { Extractor } from "@/shared/validate";

export function runExtractor(extractor: Extractor): string | null {
  switch (extractor.type) {
    case "domTextRegex":
      // TODO: scope-based DOM text search + regex
      return null;
    case "meta":
      // TODO: document.querySelector('meta[name="..."]')
      return null;
    case "titleRegex":
      // TODO: regex against document.title
      return null;
    case "selectorText":
      // TODO: selector-based text extraction
      return null;
  }
}
