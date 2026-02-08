export function createOverlay(): HTMLElement {
  const host = document.createElement("div");
  host.id = "context-marker-root";
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  const label = document.createElement("div");
  label.className = "context-marker-overlay";

  shadow.appendChild(style);
  shadow.appendChild(label);
  document.body.appendChild(host);
  return host;
}

export function updateOverlay(
  _host: HTMLElement,
  _label: string,
  _color: string,
): void {
  // TODO: update shadow DOM content
}

export function removeOverlay(host: HTMLElement): void {
  host.remove();
}
