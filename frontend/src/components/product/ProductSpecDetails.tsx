import React from "react";
import type { Product } from "@/types/product";

interface ProductSpecDetailsProps {
  product: Product;
}

const EXCLUDED_KEYS = new Set([
  "id",
  "name",
  "slug",
  "price",
  "stock",
  "description",
  "isActive",
  "categoryId",
  "category",
  "images",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "url",
]);

const ProductSpecDetails: React.FC<ProductSpecDetailsProps> = ({ product }) => {
  const categoryName = product.category?.name;

  const get = (field: string): string => {
    const v = product[field];
    if (v === undefined || v === null || v === "") return "—";
    if (typeof v === "boolean") return v ? "Có" : "Không";
    return String(v);
  };

  const specRows: { label: string; value: string }[] = [];

  const push = (label: string, field: string, suffix = "") => {
    const raw = get(field);
    if (raw !== "—") specRows.push({ label, value: `${raw}${suffix}` });
  };

  if (categoryName === "Laptop") {
    push("Hãng", "brand");
    push("Model", "model");
    push("Màn hình", "screenSize", '"');
    push("Loại màn hình", "screenType");
    push("Độ phân giải", "resolution");
    push("Pin", "batteryLifeHours", " giờ");
    push("Trọng lượng", "weightKg", " kg");
    push("Hệ điều hành", "os");
  } else if (categoryName === "PC") {
    push("Hãng", "brand");
    push("Model", "model");
    push("CPU", "processor");
    push("RAM", "ramGb", " GB");
    push("Ổ cứng", "storageGb", " GB");
    push("Loại ổ", "storageType");
    push("GPU", "graphics");
    push("Dạng case", "formFactor");
    push("Nguồn", "powerSupplyWattage", " W");
    push("Hệ điều hành", "operatingSystem");
  } else if (categoryName === "CPU") {
    push("Nhân", "cores");
    push("Luồng", "threads");
    push("Xung cơ bản", "baseClock");
    push("Xung tối đa", "boostClock");
    push("Socket", "socket");
    push("Kiến trúc", "architecture");
    push("TDP", "tdp", " W");
    push("GPU tích hợp", "integratedGraphics");
  } else {
    Object.keys(product).forEach((key) => {
      if (EXCLUDED_KEYS.has(key)) return;
      const val = product[key];
      if (val === null || val === undefined || typeof val === "object") return;
      specRows.push({ label: key, value: String(val) });
    });
  }

  if (specRows.length === 0) {
    return (
      <p className="text-body-sm text-secondary">Không có thông số kỹ thuật bổ sung.</p>
    );
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {specRows.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 rounded-lg border border-slate-border/80 bg-surface-container-low/40 px-3 py-2.5"
        >
          <dt className="text-label-xs uppercase tracking-wide text-secondary">{label}</dt>
          <dd className="text-body-sm font-medium text-on-surface">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default ProductSpecDetails;
