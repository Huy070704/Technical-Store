import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname);

export function loadSeedJson<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file seed: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}
