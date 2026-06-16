import type { CategoryDocument } from "../category.entity";

/** Chuẩn hóa category để switch component — ưu tiên slug. */
export function categoryKey(category: CategoryDocument | null | undefined): string {
  if (!category) return "";
  const raw = (category.slug || category.name || "").trim().toLowerCase();
  return raw.replace(/\s+/g, "-");
}
