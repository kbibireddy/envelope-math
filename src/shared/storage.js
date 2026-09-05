/** @typedef {{ key: string, label: string, divisor: number }} StorageUnit */

/** Binary storage ladder (1 KB = 1024 bytes). */
export const STORAGE_UNITS = Object.freeze([
  Object.freeze({ key: "B", label: "bytes", divisor: 1 }),
  Object.freeze({ key: "KB", label: "KB", divisor: 1024 }),
  Object.freeze({ key: "MB", label: "MB", divisor: 1024 ** 2 }),
  Object.freeze({ key: "GB", label: "GB", divisor: 1024 ** 3 }),
  Object.freeze({ key: "TB", label: "TB", divisor: 1024 ** 4 }),
  Object.freeze({ key: "PB", label: "PB", divisor: 1024 ** 5 })
]);

/**
 * Hide a unit when its converted value is below this.
 * Drops TB/PB (and any higher rung) when digits only appear after three decimal zeros.
 */
export const UNIT_VISIBILITY_THRESHOLD = 0.001;

const textEncoder = new TextEncoder();

/** UTF-8 byte length (matches browser TextEncoder). */
export function utf8ByteLength(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return textEncoder.encode(text).length;
}

export function formatUnitValue(value) {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
}

export function formatCount(value) {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("en-US");
}

/**
 * @param {number} bytes
 * @returns {Array<{ key: string, label: string, value: number, display: string }>}
 */
export function sizeBreakdown(bytes) {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const rows = [];

  for (const unit of STORAGE_UNITS) {
    const value = safeBytes / unit.divisor;
    const visible =
      unit.key === "B" || (safeBytes > 0 && value >= UNIT_VISIBILITY_THRESHOLD);
    if (!visible) continue;
    rows.push({
      key: unit.key,
      label: unit.label,
      value,
      display: formatUnitValue(value)
    });
  }

  return rows;
}

/** Largest visible unit — compact headlines. */
export function primarySize(bytes) {
  const rows = sizeBreakdown(bytes);
  return rows[rows.length - 1];
}

export function formatPrimary(bytes) {
  const primary = primarySize(bytes);
  return `${primary.display} ${primary.label}`;
}
