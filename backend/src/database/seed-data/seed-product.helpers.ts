import { Product, ProductDocument } from "../../modules/product/models/product.model";
import { CPU } from "../../modules/product/components/models/cpu.model";
import { GPU } from "../../modules/product/components/models/gpu.model";
import { RAM } from "../../modules/product/components/models/ram.model";
import { Drive } from "../../modules/product/components/models/drive.model";
import { Motherboard } from "../../modules/product/components/models/motherboard.model";
import { PSU } from "../../modules/product/components/models/psu.model";
import { Case } from "../../modules/product/components/models/case.model";
import { Monitor } from "../../modules/product/components/models/monitor.model";
import { Laptop } from "../../modules/product/components/laptop/models/laptop.model";
import { PC } from "../../modules/product/components/models/pc.model";

type ComponentEntity = { product?: any; save: () => Promise<unknown> };

/** Bỏ qua nếu đã có (theo name hoặc slug) — seed chạy lại an toàn */
export async function saveProductIfNotExists(
  product: ProductDocument
): Promise<ProductDocument | null> {
  if (!product.name?.trim()) return null;

  // Extract categoryId from the category relation if it was assigned on the object
  if ((product as any).category) {
    product.categoryId = (product as any).category._id || (product as any).category;
  }

  const slug = product.name.toLowerCase();
  const existing = await Product.findOne({
    $or: [{ name: product.name }, { slug }],
  });

  if (existing) {
    console.log(`Skip (exists): ${product.name}`);
    if (!existing.categoryId && product.categoryId) {
      existing.categoryId = product.categoryId;
      await existing.save();
      console.log(`Updated categoryId for existing product: ${product.name}`);
    }
    return existing;
  }

  await product.save();
  console.log(`Added product: ${product.name}`);
  return product;
}

/** Bỏ qua component 1-1 đã gắn product (tránh lỗi REL unique) */
export async function saveComponentIfNotExists<T extends ComponentEntity>(
  entity: T,
  EntityClass: { findOne: (options: object) => Promise<T | null> },
  label?: string,
  logLabel?: string
): Promise<T | null> {
  const displayLabel = label ?? (entity as any).product?.name ?? "component";
  const productId = (entity as any).product?._id || (entity as any).product;
  if (!productId) return null;

  const existing = await EntityClass.findOne({
    product: productId,
  });

  if (existing) {
    console.log(`Skip component (exists): ${displayLabel}`);
    return existing;
  }

  await entity.save();
  console.log(logLabel ?? `Added component: ${displayLabel}`);
  return entity;
}
