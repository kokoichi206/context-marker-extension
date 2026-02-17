# Context Marker

A Chrome extension that displays environment markers (dev / stg / prod, etc.) on web pages.
Supports SPAs and non-URL-based environment detection.

[Chrome Web Store](https://chromewebstore.google.com/detail/context-marker/ohjfjpalpgklagfohdlcdmadajcbbnpd) | [Privacy Policy](https://kokoichi206.github.io/context-marker-extension/privacy-policy.html)

## Install

Install from the Chrome Web Store:

https://chromewebstore.google.com/detail/context-marker/ohjfjpalpgklagfohdlcdmadajcbbnpd

## Features

- JSON-based rule definitions for any site or condition
- Two detection modes: URL matching (`urlOnly`) / DOM & meta extraction (`signals`)
- Three display styles: `topBar`, `ribbon`, `combo`
- Automatic SPA navigation detection (history API / DOM mutations / focus recovery)
- Page tinting and title prefix for production environments (`tintPage`, `titlePrefix`)
- JSON import / export for rules

## Rule example

```json
{
  "id": "my-app-prod",
  "name": "My App Production",
  "enabled": true,
  "priority": 100,
  "target": {
    "host": "console.example.com"
  },
  "detection": {
    "mode": "signals",
    "extractors": [
      {
        "type": "domTextRegex",
        "key": "env.label",
        "pattern": "(production|staging)",
        "scope": "header"
      }
    ],
    "match": [
      { "op": "eq", "key": "env.label", "value": "production" }
    ]
  },
  "display": {
    "labelTemplate": "PROD {{env.label}}",
    "color": "#ff0000",
    "position": "topRight",
    "opacity": 0.95,
    "extras": {
      "tintPage": true,
      "titlePrefix": "[PROD] "
    }
  }
}
```

## Development

```sh
pnpm install
pnpm dev       # Build + launch Chromium with web-ext
pnpm test      # vitest
pnpm build     # Output to dist/
```

## License

[MIT](LICENSE)
