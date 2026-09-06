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
 * Main-view visibility floor.
 * Hide a unit when its value is < 0.01 (more than two zeros after the decimal
 * before a significant digit — e.g. 0.009).
 */
export const UNIT_VISIBILITY_THRESHOLD = 0.01;

/** Compact with K / M / B once the numeric magnitude is greater than 9999. */
export const COMPACT_NUMBER_THRESHOLD = 9999;

const textEncoder = new TextEncoder();

/** UTF-8 byte length (matches browser TextEncoder). */
export function utf8ByteLength(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return textEncoder.encode(text).length;
}

/**
 * Trim a finite number to at most `maxDigits` significant digits.
 * @param {number} value
 * @param {number} maxDigits
 */
export function toSignificantDigits(value, maxDigits) {
  if (!Number.isFinite(value) || value === 0) return 0;
  const digits = Math.max(1, Math.floor(maxDigits));
  return Number(value.toPrecision(digits));
}

/**
 * Main-view number formatter:
 * - at most 4 significant digits
 * - values > 9999 → K / M / B suffix
 */
export function formatCompactNumber(value) {
  if (!Number.isFinite(value) || value === 0) return "0";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs > COMPACT_NUMBER_THRESHOLD) {
    // abs > 9999 → K / M / B (includes 10000+)
    const tiers = [
      { div: 1e12, suffix: "T" },
      { div: 1e9, suffix: "B" },
      { div: 1e6, suffix: "M" },
      { div: 1e3, suffix: "K" }
    ];
    for (const tier of tiers) {
      if (abs >= tier.div) {
        const scaled = toSignificantDigits(abs / tier.div, 4);
        return `${sign}${stripTrailingZeros(scaled)}${tier.suffix}`;
      }
    }
  }

  const compact = toSignificantDigits(abs, 4);
  return `${sign}${stripTrailingZeros(compact)}`;
}

/**
 * Detail / popover formatter: at most 2 digits after the decimal.
 */
export function formatDetailNumber(value) {
  if (!Number.isFinite(value) || value === 0) return "0";
  const rounded = Math.round(value * 100) / 100;
  return stripTrailingZeros(rounded);
}

/** @deprecated Prefer formatCompactNumber — kept as the main-view alias. */
export function formatUnitValue(value) {
  return formatCompactNumber(value);
}

export function formatCount(value) {
  if (!Number.isFinite(value)) return "0";
  return formatCompactNumber(value);
}

function stripTrailingZeros(value) {
  const asNumber = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(asNumber)) return "0";
  // Avoid scientific notation for ordinary magnitudes.
  if (Math.abs(asNumber) >= 1e12 || (Math.abs(asNumber) > 0 && Math.abs(asNumber) < 1e-6)) {
    return asNumber.toPrecision(4).replace(/\.?0+e/, "e");
  }
  const fixed = asNumber.toString();
  if (!fixed.includes(".")) return fixed;
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Main-view unit rows: bytes always shown; other units only when value ≥ 0.01.
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
      display: formatCompactNumber(value)
    });
  }

  return rows;
}

/**
 * Full B→PB ladder for info popovers (always all six units).
 * Detail formatting: ≤ 2 digits after the decimal.
 */
export function fullSizeBreakdown(bytes) {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  return STORAGE_UNITS.map((unit) => {
    const value = safeBytes / unit.divisor;
    return {
      key: unit.key,
      label: unit.label,
      value,
      display: formatDetailNumber(value)
    };
  });
}

/**
 * Human-scale headline unit: prefer a magnitude in [1, 1000).
 */
export function primarySize(bytes) {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safeBytes === 0) {
    return { key: "B", label: "bytes", value: 0, display: "0" };
  }

  for (let i = STORAGE_UNITS.length - 1; i >= 0; i -= 1) {
    const unit = STORAGE_UNITS[i];
    const value = safeBytes / unit.divisor;
    if (value >= 1 && value < 1000) {
      return {
        key: unit.key,
        label: unit.label,
        value,
        display: formatCompactNumber(value)
      };
    }
  }

  const largest = STORAGE_UNITS[STORAGE_UNITS.length - 1];
  const value = safeBytes / largest.divisor;
  return {
    key: largest.key,
    label: largest.label,
    value,
    display: formatCompactNumber(value)
  };
}

export function formatPrimary(bytes) {
  const primary = primarySize(bytes);
  return `${primary.display} ${primary.label}`;
}
