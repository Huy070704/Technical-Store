import { Product } from "@/modules/product/product.entity";
import { CPU } from "@/modules/product/components/cpu.entity";
import { GPU } from "@/modules/product/components/gpu.entity";
import { RAM } from "@/modules/product/components/ram.entity";
import { Drive } from "@/modules/product/components/drive.entity";
import { Motherboard } from "@/modules/product/components/motherboard.entity";
import { PSU } from "@/modules/product/components/psu.entity";
import { Case } from "@/modules/product/components/case.entity";
import { Monitor } from "@/modules/product/components/monitor.entity";
import { Laptop } from "@/modules/product/components/laptop/laptop.entity";
import { PC } from "@/modules/product/components/pc.entity";

type ComponentEntity = { product?: Product; save: () => Promise<unknown> };

/** Bỏ qua nếu đã có (theo name hoặc slug) — seed chạy lại an toàn */
export async function saveProductIfNotExists(
  product: Product
): Promise<Product | null> {
  if (!product.name?.trim()) return null;

  const slug = product.name.toLowerCase();
  const existing = await Product.findOne({
    where: [{ name: product.name }, { slug }],
  });

  if (existing) {
    console.log(`Skip (exists): ${product.name}`);
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
  const displayLabel = label ?? entity.product?.name ?? "component";
  const productId = entity.product?.id;
  if (!productId) return null;

  const existing = await EntityClass.findOne({
    where: { product: { id: productId } },
  });

  if (existing) {
    console.log(`Skip component (exists): ${displayLabel}`);
    return existing;
  }

  await entity.save();
  console.log(logLabel ?? `Added component: ${displayLabel}`);
  return entity;
}
