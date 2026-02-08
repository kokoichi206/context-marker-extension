import { rulesSchema, type Rule } from "@/shared/validate";

export async function loadRules(): Promise<Rule[]> {
  const { rules } = await chrome.storage.local.get("rules");
  const result = rulesSchema.safeParse(rules);
  if (!result.success) {
    console.warn("Context Marker: invalid rules in storage", result.error);
    return [];
  }
  return result.data;
}

export async function saveRules(rules: Rule[]): Promise<void> {
  await chrome.storage.local.set({ rules });
}
