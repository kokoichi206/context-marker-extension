import type { Rule } from "../../src/shared/validate";

const BASE_URL = "http://localhost:5678";

export const urlOnlyRule: Rule = {
  id: "e2e-url-only",
  name: "URL Only Rule",
  enabled: true,
  priority: 100,
  target: {
    urlPattern: `${BASE_URL}/url-only.html`,
  },
  detection: {
    mode: "urlOnly",
  },
  display: {
    labelTemplate: "URL ONLY",
    color: "#ff3b30",
    position: "headerBar",
    opacity: 0.95,
  },
};

export const metaRule: Rule = {
  id: "e2e-meta",
  name: "Meta Rule",
  enabled: true,
  priority: 100,
  target: {
    host: "localhost",
  },
  detection: {
    mode: "signals",
    extractors: [
      {
        type: "meta",
        key: "env",
        name: "env",
      },
    ],
    match: [
      {
        op: "eq",
        key: "env",
        value: "production",
      },
    ],
  },
  display: {
    labelTemplate: "ENV: {{env}}",
    color: "#ff9500",
    position: "headerBar",
    opacity: 0.95,
  },
};

export const domTextRule: Rule = {
  id: "e2e-dom-text",
  name: "DOM Text Rule",
  enabled: true,
  priority: 100,
  target: {
    host: "localhost",
  },
  detection: {
    mode: "signals",
    extractors: [
      {
        type: "domTextRegex",
        key: "accountId",
        pattern: "Account:\\s*(\\d{12})",
        scope: "header",
      },
    ],
    match: [
      {
        op: "exists",
        key: "accountId",
      },
    ],
  },
  display: {
    labelTemplate: "Account: {{accountId}}",
    color: "#34c759",
    position: "headerBar",
    opacity: 0.95,
  },
};

export const titleRule: Rule = {
  id: "e2e-title",
  name: "Title Rule",
  enabled: true,
  priority: 100,
  target: {
    host: "localhost",
  },
  detection: {
    mode: "signals",
    extractors: [
      {
        type: "titleRegex",
        key: "envName",
        pattern: "\\[(\\w+)\\]",
      },
    ],
    match: [
      {
        op: "exists",
        key: "envName",
      },
    ],
  },
  display: {
    labelTemplate: "{{envName}}",
    color: "#5856d6",
    position: "headerBar",
    opacity: 0.95,
  },
};

export const selectorRule: Rule = {
  id: "e2e-selector",
  name: "Selector Rule",
  enabled: true,
  priority: 100,
  target: {
    host: "localhost",
  },
  detection: {
    mode: "signals",
    extractors: [
      {
        type: "selectorText",
        key: "badge",
        selector: "#env-badge",
      },
    ],
    match: [
      {
        op: "exists",
        key: "badge",
      },
    ],
  },
  display: {
    labelTemplate: "Badge: {{badge}}",
    color: "#007aff",
    position: "headerBar",
    opacity: 0.95,
  },
};

export const highPriorityRule: Rule = {
  id: "e2e-high-priority",
  name: "High Priority Rule",
  enabled: true,
  priority: 200,
  target: {
    urlPattern: `${BASE_URL}/url-only.html`,
  },
  detection: {
    mode: "urlOnly",
  },
  display: {
    labelTemplate: "HIGH PRIORITY",
    color: "#ff2d55",
    position: "headerBar",
    opacity: 0.95,
  },
};

export const lowPriorityRule: Rule = {
  id: "e2e-low-priority",
  name: "Low Priority Rule",
  enabled: true,
  priority: 10,
  target: {
    urlPattern: `${BASE_URL}/url-only.html`,
  },
  detection: {
    mode: "urlOnly",
  },
  display: {
    labelTemplate: "LOW PRIORITY",
    color: "#8e8e93",
    position: "headerBar",
    opacity: 0.95,
  },
};
