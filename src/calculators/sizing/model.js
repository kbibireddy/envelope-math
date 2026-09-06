import {
  formatCount,
  formatPrimary,
  fullSizeBreakdown,
  primarySize,
  sizeBreakdown,
  utf8ByteLength
} from "../../shared/storage.js";
import { projectScaledStorage } from "../../shared/growth.js";
import { GROWTH_PRESETS, MULTIPLIER_PRESETS } from "../../shared/presets.js";

export { GROWTH_PRESETS, MULTIPLIER_PRESETS };

export const SIZING_DEFAULTS = Object.freeze({
  recordCount: 1_000_000,
  growthPercent: 40,
  years: 5,
  sampleText: `{"userId":"u_1842","event":"checkout","sku":"SKU-9F2","qty":3,"total":42.50,"ts":"2026-09-05T19:00:00Z"}`
});

/**
 * Pure sizing model — no DOM. Safe to unit-test and reuse.
 *
 * @param {{
 *   text?: string,
 *   recordCount: number,
 *   growthPercent: number,
 *   years?: number
 * }} input
 */
export function estimateSizing({
  text = "",
  recordCount,
  growthPercent,
  years = SIZING_DEFAULTS.years
}) {
  const bytesPerRecord = utf8ByteLength(text);
  const scaled = projectScaledStorage({
    bytesPerRecord,
    recordCount,
    growthPercent,
    years
  });

  return {
    textLength: typeof text === "string" ? text.length : 0,
    bytesPerRecord,
    recordCount: scaled.recordCount,
    growthPercent: scaled.growthPercent,
    year0Bytes: scaled.year0Bytes,
    perRecordPrimary: primarySize(bytesPerRecord),
    perRecordUnits: sizeBreakdown(bytesPerRecord),
    perRecordDetails: fullSizeBreakdown(bytesPerRecord),
    totalPrimary: scaled.year0Primary,
    totalUnits: scaled.year0Units,
    totalDetails: fullSizeBreakdown(scaled.year0Bytes),
    projections: scaled.projections,
    summaryLine: `${formatCount(scaled.recordCount)} records × ${formatCount(bytesPerRecord)} bytes each`,
    perRecordLabel: formatPrimary(bytesPerRecord),
    heroLabel: formatPrimary(scaled.year0Bytes)
  };
}
