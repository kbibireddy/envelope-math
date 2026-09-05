/** Storage unit ladders in powers of 1024 (binary / IEC-style labels). */
export const STORAGE_UNITS = [
  { key: "B", label: "bytes", divisor: 1 },
  { key: "KB", label: "KB", divisor: 1024 },
  { key: "MB", label: "MB", divisor: 1024 ** 2 },
  { key: "GB", label: "GB", divisor: 1024 ** 3 },
  { key: "TB", label: "TB", divisor: 1024 ** 4 },
  { key: "PB", label: "PB", divisor: 1024 ** 5 }
];

/** Hide a unit when its value is below this (3 zeros after the decimal). */
export const UNIT_VISIBILITY_THRESHOLD = 0.001;

export const MULTIPLIER_PRESETS = [
  { label: "1", value: 1 },
  { label: "1K", value: 1_000 },
  { label: "10K", value: 10_000 },
  { label: "100K", value: 100_000 },
  { label: "1M", value: 1_000_000 },
  { label: "10M", value: 10_000_000 },
  { label: "100M", value: 100_000_000 },
  { label: "1B", value: 1_000_000_000 }
];

/**
 * Recommended YoY data-growth rates for capacity planning.
 * Ranges reflect common planning bars for mature → hypergrowth systems.
 */
export const GROWTH_PRESETS = [
  { label: "10%", value: 10, hint: "Mature / stable systems" },
  { label: "20%", value: 20, hint: "Conservative enterprise" },
  { label: "40%", value: 40, hint: "Typical enterprise data growth" },
  { label: "60%", value: 60, hint: "High-growth product data" },
  { label: "100%", value: 100, hint: "Aggressive / large-scale logging" },
  { label: "150%", value: 150, hint: "Hypergrowth case" }
];

export const DEFAULT_PROJECTION_YEARS = 5;

/** UTF-8 byte length of a string (matches browser TextEncoder). */
export function utf8ByteLength(text) {
  if (typeof text !== "string" || text.length === 0) return 0;
  return new TextEncoder().encode(text).length;
}

/**
 * Format a number for display: trim trailing zeros, keep up to 6 decimals
 * for tiny values that still clear the visibility threshold.
 */
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

/**
 * Convert a byte count into visible unit rows.
 * Higher units (TB/PB, and any below threshold) are dropped when the
 * converted value is < 0.001 — i.e. significant digits only after three
 * zeros past the decimal.
 */
export function sizeBreakdown(bytes) {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;

  return STORAGE_UNITS.map((unit) => {
    const value = safeBytes / unit.divisor;
    const visible =
      unit.key === "B" || (safeBytes > 0 && value >= UNIT_VISIBILITY_THRESHOLD);

    return {
      key: unit.key,
      label: unit.label,
      value,
      display: formatUnitValue(value),
      visible
    };
  }).filter((row) => row.visible);
}

/** Pick the largest visible unit for a compact headline figure. */
export function primarySize(bytes) {
  const rows = sizeBreakdown(bytes);
  return rows[rows.length - 1];
}

/**
 * Year-0 total = per-record bytes × record count.
 * Year n = year0 × (1 + growthPercent/100)^n
 */
export function projectStorage({
  bytesPerRecord,
  recordCount,
  growthPercent,
  years = DEFAULT_PROJECTION_YEARS
}) {
  const perRecord =
    Number.isFinite(bytesPerRecord) && bytesPerRecord > 0 ? bytesPerRecord : 0;
  const records =
    Number.isFinite(recordCount) && recordCount > 0 ? recordCount : 0;
  const rate =
    Number.isFinite(growthPercent) && growthPercent >= 0 ? growthPercent : 0;
  const horizon = Number.isInteger(years) && years >= 0 ? years : DEFAULT_PROJECTION_YEARS;

  const year0 = perRecord * records;
  const factor = 1 + rate / 100;

  const projections = [];
  for (let year = 0; year <= horizon; year += 1) {
    const bytes = year0 * factor ** year;
    projections.push({
      year,
      bytes,
      primary: primarySize(bytes),
      units: sizeBreakdown(bytes)
    });
  }

  return {
    bytesPerRecord: perRecord,
    recordCount: records,
    growthPercent: rate,
    year0Bytes: year0,
    projections
  };
}

/** Full live estimate used by the UI. */
export function estimateSizing({
  text,
  recordCount,
  growthPercent,
  years = DEFAULT_PROJECTION_YEARS
}) {
  const bytesPerRecord = utf8ByteLength(text ?? "");
  const projection = projectStorage({
    bytesPerRecord,
    recordCount,
    growthPercent,
    years
  });

  return {
    ...projection,
    perRecordUnits: sizeBreakdown(bytesPerRecord),
    perRecordPrimary: primarySize(bytesPerRecord),
    totalUnits: sizeBreakdown(projection.year0Bytes),
    totalPrimary: primarySize(projection.year0Bytes)
  };
}
