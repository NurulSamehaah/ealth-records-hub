export const DOC_CATEGORIES = [
  { value: "lab_report", label: "Lab report" },
  { value: "imaging", label: "Imaging / scan" },
  { value: "prescription", label: "Prescription" },
  { value: "discharge_summary", label: "Discharge summary" },
  { value: "consent", label: "Consent form" },
  { value: "other", label: "Other" },
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number]["value"];

export function categoryLabel(value: string) {
  return DOC_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export function formatSize(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
