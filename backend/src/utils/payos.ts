import PayOS from "@payos/node";
import "dotenv/config";

const clientID = process.env.PAYOS_CLIENT_ID || "";
const apiKey = process.env.PAYOS_API_KEY || "";
const checksumKey = process.env.PAYOS_CHECKSUM_KEY || "";

if (!clientID || !apiKey || !checksumKey) {
  console.warn(
    "PayOS credentials are not fully configured in environment variables."
  );
}

export const payos = new PayOS(clientID, apiKey, checksumKey);

export const PAYOS_DESCRIPTION_MAX_LENGTH = 25;

export function toPayOsDescription(
  text: string,
  maxLen = PAYOS_DESCRIPTION_MAX_LENGTH
): string {
  const normalized = text.normalize("NFC").trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return normalized.slice(0, maxLen);
}

export function isPayosSignatureBypassEnabled(): boolean {
  const key = process.env.PAYOS_CHECKSUM_KEY || "";
  return (
    process.env.NODE_ENV !== "production" &&
    (!key || key.includes("your_") || key === "")
  );
}
