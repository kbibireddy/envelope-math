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

/**
 * Prefer promoting to the next storage unit once the value reaches this.
 * Keeps headlines in a scannable ~1–999 range (industry UI convention),
 * instead of awkward values like "1016 KB".
 */
export const HEADLINE_PROMOTE_THRESHOLD = 1000;

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
 * Render a number as plain decimal text — never scientific notation.
 * @param {number} value
 * @param {number} [maxFractionDigits]
 */
export function toPlainDecimal(value, maxFractionDigits = 12) {
  if (!Number.isFinite(value) || value === 0) return "0";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  // Extremely large: round to integer string.
  if (abs >= 1e15) {
    return `${sign}${Math.round(abs).toLocaleString("en-US", { useGrouping: false })}`;
  }

  // Prefer toFixed for values that JS would otherwise stringify with "e".
  let raw;
  if (abs >= 1e-6 && abs < 1e15) {
    raw = abs.toFixed(maxFractionDigits);
  } else if (abs < 1e-6) {
    // Sub-micro leftovers are noise for storage UI.
    return "0";
  } else {
    raw = abs.toFixed(0);
  }

  // Trim trailing zeros / dangling decimal point.
  raw = raw.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return `${sign}${raw}`;
}

/**
 * Main-view number formatter:
 * - at most 4 significant digits
 * - values > 9999 → K / M / B suffix
 * - never scientific notation
 */
export function formatCompactNumber(value) {
  if (!Number.isFinite(value) || value === 0) return "0";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs > COMPACT_NUMBER_THRESHOLD) {
    const tiers = [
      { div: 1e12, suffix: "T" },
      { div: 1e9, suffix: "B" },
      { div: 1e6, suffix: "M" },
      { div: 1e3, suffix: "K" }
    ];
    for (const tier of tiers) {
      if (abs >= tier.div) {
        const scaled = toSignificantDigits(abs / tier.div, 4);
        return `${sign}${toPlainDecimal(scaled, 4)}${tier.suffix}`;
      }
    }
  }

  const compact = toSignificantDigits(abs, 4);
  return `${sign}${toPlainDecimal(compact, 4)}`;
}

/**
 * Detail / popover formatter: ≤ 2 digits after the decimal, with grouping commas.
 * e.g. 104000000 → "104,000,000"; 99.182 → "99.18"
 */
export function formatDetailNumber(value) {
  if (!Number.isFinite(value) || value === 0) return "0";
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    useGrouping: true
  });
}

/** @deprecated Prefer formatCompactNumber — kept as the main-view alias. */
export function formatUnitValue(value) {
  return formatCompactNumber(value);
}

export function formatCount(value) {
  if (!Number.isFinite(value)) return "0";
  return formatCompactNumber(value);
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
 * Human-scale headline unit — industry pattern used by `numfmt --to=iec`,
 * Docker, and Kubernetes quantity formatting:
 *
 * 1. Walk the binary ladder while value ≥ 1024 (IEC step).
 * 2. If the result is still ≥ 1000 and a larger unit exists, promote once
 *    more so the headline stays in a scannable ~0.98–999 range
 *    (avoids "1016 KB"; prefers "0.9912 MB").
 * 3. Never fall through to a tiny PB / scientific notation.
 *
 * @param {number} bytes
 */
export function primarySize(bytes) {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safeBytes === 0) {
    return { key: "B", label: "bytes", value: 0, display: "0" };
  }

  let index = 0;
  let value = safeBytes;

  // Step 1: classic IEC — divide by 1024 until under one full step.
  while (index < STORAGE_UNITS.length - 1 && value >= 1024) {
    value /= 1024;
    index += 1;
  }

  // Step 2: scannability bump for units above bytes — prefer "0.99 MB"
  // over "1016 KB". Do not promote bare byte counts (keep "1000 bytes").
  if (
    index >= 1 &&
    index < STORAGE_UNITS.length - 1 &&
    value >= HEADLINE_PROMOTE_THRESHOLD
  ) {
    value /= 1024;
    index += 1;
  }

  const unit = STORAGE_UNITS[index];
  return {
    key: unit.key,
    label: unit.label,
    value,
    display: formatCompactNumber(value)
  };
}

export function formatPrimary(bytes) {
  const primary = primarySize(bytes);
  return `${primary.display} ${primary.label}`;
}
