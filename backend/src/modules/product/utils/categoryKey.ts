import type { Category } from "../category.entity";

/** Chuẩn hóa category để switch component — ưu tiên slug. */
export function categoryKey(category: Category | null | undefined): string {
  if (!category) return "";
  const raw = (category.slug || category.name || "").trim().toLowerCase();
  return raw.replace(/\s+/g, "-");
}
