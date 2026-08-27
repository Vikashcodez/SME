const AVATAR_PALETTES = [
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

export function avatarPalette(seed) {
  let hash = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

export function initialsFor(text) {
  const s = String(text || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function pickHeroField(entity) {
  const candidates = entity.fields.filter((f) => f.ui === "currency" && f.role === "field");
  if (candidates.length === 0) return null;
  const priority = ["netAmount", "totalAmount", "amount", "grossSalary", "salary"];
  for (const key of priority) {
    const hit = candidates.find((f) => f.key === key);
    if (hit) return hit;
  }
  return candidates[0];
}

export function pickSecondaryFields(entity, heroFieldKey) {
  const exclude = new Set([entity.idFieldKey, entity.labelFieldKey, "status", heroFieldKey]);
  const scored = entity.fields
    .filter((f) => !exclude.has(f.key) && f.role !== "hidden_audit" && f.role !== "readonly_audit" && f.role !== "approval" && f.key !== "isActive")
    .map((f) => {
      let score = 0;
      if (f.ui === "date") score += 5;
      if (f.ui === "fk") score += 4;
      if (f.ui === "text" || f.ui === "email" || f.ui === "phone") score += 2;
      if (f.ui === "select") score += 1;
      return { f, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((x) => x.f);
}

export function groupEntityFields(fields) {
  const groups = { basic: [], dates: [], financial: [], audit: [] };
  fields.forEach((f) => {
    if (f.role === "readonly_audit" || f.role === "approval") groups.audit.push(f);
    else if (f.ui === "date" || f.ui === "time" || f.ui === "datetime") groups.dates.push(f);
    else if (f.ui === "currency" || f.ui === "percent" || f.ui === "decimal" || f.ui === "integer") groups.financial.push(f);
    else groups.basic.push(f);
  });
  return groups;
}
