import { rulesSchema, type Rule } from "@/shared/validate";
import type { DisplayStyle } from "@/shared/constants";
import { DEFAULT_DISPLAY_STYLE } from "@/shared/constants";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const listEl = $<HTMLDivElement>("rules-list");
const dialog = $<HTMLDialogElement>("rule-dialog");
const toastEl = $<HTMLDivElement>("toast");

let rules: Rule[] = [];
let editingId: string | null = null;

// --- Storage helpers ---

async function loadRules(): Promise<Rule[]> {
  const { rules } = await chrome.storage.local.get("rules");
  const result = rulesSchema.safeParse(rules);
  return result.success ? result.data : [];
}

async function persistRules(): Promise<void> {
  await chrome.storage.local.set({ rules });
}

// --- Toast ---

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function toast(msg: string): void {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

// --- Render ---

function renderRules(): void {
  if (rules.length === 0) {
    listEl.innerHTML = '<div class="empty">No rules yet. Click "+ Add Rule" to create one.</div>';
    return;
  }

  listEl.innerHTML = rules
    .sort((a, b) => b.priority - a.priority)
    .map(
      (r) => `
      <div class="rule-card ${r.enabled ? "" : "disabled"}" data-id="${r.id}">
        <div class="rule-header">
          <span class="color-dot" style="background:${r.display.color}"></span>
          <span class="rule-name">${esc(r.name)}</span>
          <span class="rule-priority">priority: ${r.priority}</span>
        </div>
        <div class="rule-meta">
          ${r.target.host ? `Host: ${esc(Array.isArray(r.target.host) ? r.target.host.join(", ") : r.target.host)}` : ""}
          ${r.target.urlPattern ? ` | Pattern: ${esc(r.target.urlPattern)}` : ""}
          | Mode: ${r.detection.mode}
          | Position: ${r.display.position}
          | Label: ${esc(r.display.labelTemplate)}
        </div>
        <div class="rule-actions">
          <button data-action="toggle">${r.enabled ? "Disable" : "Enable"}</button>
          <button data-action="edit">Edit</button>
          <button data-action="duplicate">Duplicate</button>
          <button class="danger" data-action="delete">Delete</button>
        </div>
      </div>
    `,
    )
    .join("");

  listEl.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = (e.target as HTMLElement).closest("[data-id]") as HTMLElement;
      const id = card.dataset.id!;
      const action = (e.target as HTMLElement).dataset.action!;
      handleAction(id, action);
    });
  });
}

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// --- Actions ---

async function handleAction(id: string, action: string): Promise<void> {
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return;

  switch (action) {
    case "toggle":
      rules[idx].enabled = !rules[idx].enabled;
      await persistRules();
      renderRules();
      toast(rules[idx].enabled ? "Rule enabled" : "Rule disabled");
      break;
    case "edit":
      openDialog(rules[idx]);
      break;
    case "duplicate": {
      const copy = JSON.parse(JSON.stringify(rules[idx])) as Rule;
      copy.id = crypto.randomUUID();
      copy.name += " (copy)";
      rules.push(copy);
      await persistRules();
      renderRules();
      toast("Rule duplicated");
      break;
    }
    case "delete":
      rules.splice(idx, 1);
      await persistRules();
      renderRules();
      toast("Rule deleted");
      break;
  }
}

// --- Dialog ---

function openDialog(rule?: Rule): void {
  editingId = rule?.id ?? null;
  $<HTMLDivElement>("dialog-title").textContent = rule ? "Edit Rule" : "Add Rule";

  $<HTMLInputElement>("f-name").value = rule?.name ?? "";
  $<HTMLInputElement>("f-priority").value = String(rule?.priority ?? 100);
  $<HTMLInputElement>("f-enabled").checked = rule?.enabled ?? true;

  const host = rule?.target.host;
  $<HTMLInputElement>("f-host").value = host
    ? Array.isArray(host) ? host.join(", ") : host
    : "";
  $<HTMLInputElement>("f-url-pattern").value = rule?.target.urlPattern ?? "";

  $<HTMLSelectElement>("f-mode").value = rule?.detection.mode ?? "urlOnly";
  $<HTMLTextAreaElement>("f-extractors").value = rule?.detection.extractors
    ? JSON.stringify(rule.detection.extractors, null, 2)
    : "";
  $<HTMLTextAreaElement>("f-match").value = rule?.detection.match
    ? JSON.stringify(rule.detection.match, null, 2)
    : "";

  $<HTMLInputElement>("f-label").value = rule?.display.labelTemplate ?? "";
  $<HTMLInputElement>("f-color").value = rule?.display.color ?? "#ff3b30";
  $<HTMLSelectElement>("f-position").value = rule?.display.position ?? "topRight";
  $<HTMLInputElement>("f-opacity").value = String(rule?.display.opacity ?? 0.9);
  $<HTMLInputElement>("f-tint").checked = rule?.display.extras?.tintPage ?? false;
  $<HTMLInputElement>("f-title-prefix").value = rule?.display.extras?.titlePrefix ?? "";

  dialog.showModal();
}

function readForm(): Rule | null {
  const name = $<HTMLInputElement>("f-name").value.trim();
  if (!name) {
    toast("Name is required");
    return null;
  }

  const hostRaw = $<HTMLInputElement>("f-host").value.trim();
  const host = hostRaw
    ? hostRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const urlPattern = $<HTMLInputElement>("f-url-pattern").value.trim() || undefined;

  if (!host?.length && !urlPattern) {
    toast("At least one target (Host or URL Pattern) is required");
    return null;
  }

  const mode = $<HTMLSelectElement>("f-mode").value as "urlOnly" | "signals";

  let extractors;
  const extRaw = $<HTMLTextAreaElement>("f-extractors").value.trim();
  if (extRaw) {
    try {
      extractors = JSON.parse(extRaw);
    } catch {
      toast("Invalid extractors JSON");
      return null;
    }
  }

  let match;
  const matchRaw = $<HTMLTextAreaElement>("f-match").value.trim();
  if (matchRaw) {
    try {
      match = JSON.parse(matchRaw);
    } catch {
      toast("Invalid match JSON");
      return null;
    }
  }

  const labelTemplate = $<HTMLInputElement>("f-label").value.trim();
  if (!labelTemplate) {
    toast("Label template is required");
    return null;
  }

  const tintPage = $<HTMLInputElement>("f-tint").checked;
  const titlePrefix = $<HTMLInputElement>("f-title-prefix").value || undefined;
  const extras = tintPage || titlePrefix ? { tintPage, titlePrefix } : undefined;

  const rule: Rule = {
    id: editingId ?? crypto.randomUUID(),
    name,
    enabled: $<HTMLInputElement>("f-enabled").checked,
    priority: parseInt($<HTMLInputElement>("f-priority").value) || 100,
    target: {
      ...(host?.length === 1 ? { host: host[0] } : host?.length ? { host } : {}),
      ...(urlPattern ? { urlPattern } : {}),
    },
    detection: {
      mode,
      ...(extractors ? { extractors } : {}),
      ...(match ? { match } : {}),
    },
    display: {
      labelTemplate,
      color: $<HTMLInputElement>("f-color").value,
      position: $<HTMLSelectElement>("f-position").value as Rule["display"]["position"],
      opacity: parseFloat($<HTMLInputElement>("f-opacity").value) || 0.9,
      ...(extras ? { extras } : {}),
    },
  };

  const result = rulesSchema.safeParse([rule]);
  if (!result.success) {
    toast("Validation failed: " + result.error.issues[0]?.message);
    return null;
  }

  return result.data[0];
}

// --- Import / Export ---

function exportRules(): void {
  const blob = new Blob([JSON.stringify(rules, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "context-marker-rules.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Rules exported");
}

async function importRules(file: File): Promise<void> {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    toast("Invalid JSON file");
    return;
  }

  const result = rulesSchema.safeParse(parsed);
  if (!result.success) {
    toast("Validation failed: " + result.error.issues[0]?.message);
    return;
  }

  rules = result.data;
  await persistRules();
  renderRules();
  toast(`Imported ${rules.length} rule(s)`);
}

// --- Display Style ---

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

function renderStylePicker(current: DisplayStyle): void {
  document.querySelectorAll(".style-option").forEach((el) => {
    const s = (el as HTMLElement).dataset.style;
    el.classList.toggle("active", s === current);
  });
}

function initStylePicker(current: DisplayStyle): void {
  renderStylePicker(current);
  document.querySelectorAll(".style-option").forEach((el) => {
    el.addEventListener("click", async () => {
      const style = (el as HTMLElement).dataset.style as DisplayStyle;
      await chrome.storage.local.set({ displayStyle: style });
      renderStylePicker(style);
      toast(`Display style: ${style}`);
    });
  });
}

// --- Init ---

async function main(): Promise<void> {
  const [, currentStyle] = await Promise.all([
    loadRules().then((r) => { rules = r; }),
    loadDisplayStyle(),
  ]);
  renderRules();
  initStylePicker(currentStyle);

  $("add-rule").addEventListener("click", () => openDialog());

  $("dialog-cancel").addEventListener("click", () => dialog.close());

  $("dialog-save").addEventListener("click", async () => {
    const rule = readForm();
    if (!rule) return;

    if (editingId) {
      const idx = rules.findIndex((r) => r.id === editingId);
      if (idx !== -1) rules[idx] = rule;
    } else {
      rules.push(rule);
    }

    await persistRules();
    renderRules();
    dialog.close();
    toast(editingId ? "Rule updated" : "Rule added");
  });

  $("export-btn").addEventListener("click", exportRules);

  $("import-btn").addEventListener("click", () => {
    $<HTMLInputElement>("import-file").click();
  });

  $<HTMLInputElement>("import-file").addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) await importRules(file);
    (e.target as HTMLInputElement).value = "";
  });
}

main();
