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
  "image",
  "imageUrl",
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "url",
]);

const KEY_LABEL_MAP: Record<string, string> = {
  // General / Common
  brand: "Hãng",
  model: "Model",
  type: "Phân loại",
  // Laptop / Monitor
  screenSize: "Màn hình",
  screenType: "Loại màn hình",
  resolution: "Độ phân giải",
  batteryLifeHours: "Thời lượng pin",
  weightKg: "Trọng lượng",
  os: "Hệ điều hành",
  operatingSystem: "Hệ điều hành",
  sizeInch: "Kích thước màn hình",
  refreshRate: "Tần số quét",
  panelType: "Loại tấm nền",
  // PC / CPU / Motherboard / GPU / RAM
  processor: "CPU",
  ramGb: "RAM",
  storageGb: "Dung lượng ổ cứng",
  storageType: "Loại ổ cứng",
  graphics: "GPU",
  formFactor: "Kích thước (Form Factor)",
  powerSupplyWattage: "Nguồn điện",
  cores: "Số nhân",
  threads: "Số luồng",
  baseClock: "Xung nhịp cơ bản",
  boostClock: "Xung nhịp tối đa",
  socket: "Socket",
  architecture: "Kiến trúc",
  tdp: "TDP (Tiêu thụ điện)",
  integratedGraphics: "Đồ họa tích hợp",
  chipset: "Chipset",
  ramSlots: "Số khe RAM",
  maxRam: "Dung lượng RAM tối đa",
  ramType: "Loại RAM hỗ trợ",
  supportedDriveInterfaces: "Giao tiếp ổ cứng hỗ trợ",
  vram: "Dung lượng VRAM",
  memoryType: "Loại bộ nhớ",
  lengthMm: "Chiều dài",
  capacityGb: "Dung lượng",
  speedMhz: "Tốc độ Bus",
  interface: "Chuẩn giao tiếp",
  // PSU
  wattage: "Công suất",
  efficiencyRating: "Chuẩn hiệu suất",
  modular: "Chuẩn cáp nguồn (Modular)",
  // Case
  formFactorSupport: "Hỗ trợ Mainboard",
  hasRgb: "Đèn LED RGB",
  sidePanelType: "Loại mặt bên",
  maxGpuLengthMm: "Chiều dài GPU tối đa hỗ trợ",
  psuType: "Chuẩn nguồn hỗ trợ",
  // Cooler
  supportedSockets: "Socket hỗ trợ",
  fanSizeMm: "Kích thước quạt",
  // Mouse / Keyboard / Headset
  connectivity: "Kết nối",
  dpi: "Độ phân giải (DPI)",
  switchType: "Loại Switch",
  layout: "Bố cục phím (Layout)",
  hasMicrophone: "Có Microphone",
  surroundSound: "Âm thanh vòm (Surround Sound)",
  speedMbps: "Tốc độ truyền tải",
};

const KEY_SUFFIX_MAP: Record<string, string> = {
  screenSize: '"',
  sizeInch: '"',
  batteryLifeHours: " giờ",
  weightKg: " kg",
  ramGb: " GB",
  storageGb: " GB",
  powerSupplyWattage: " W",
  tdp: " W",
  capacityGb: " GB",
  speedMhz: " MHz",
  vram: " GB",
  lengthMm: " mm",
  maxGpuLengthMm: " mm",
  fanSizeMm: " mm",
  speedMbps: " Mbps",
  wattage: " W",
  maxRam: " GB",
  refreshRate: " Hz",
};

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

      const label = KEY_LABEL_MAP[key] || (key.charAt(0).toUpperCase() + key.slice(1));

      let valueStr = "";
      if (typeof val === "boolean") {
        valueStr = val ? "Có" : "Không";
      } else {
        const suffix = KEY_SUFFIX_MAP[key] || "";
        valueStr = `${val}${suffix}`;
      }

      specRows.push({ label, value: valueStr });
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
          <dd className="text-body-sm font-medium text-on-surface break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default ProductSpecDetails;
