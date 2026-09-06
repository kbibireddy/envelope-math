import {
  formatCount,
  formatPrimary,
  fullSizeBreakdown,
  primarySize,
  sizeBreakdown,
  utf8ByteLength
} from "../../shared/storage.js";
import { projectScaledStorage } from "../../shared/growth.js";
import {
  COMPRESSION_PRESETS,
  GROWTH_PRESETS,
  MULTIPLIER_PRESETS,
  getCompressionPreset
} from "../../shared/presets.js";

export { COMPRESSION_PRESETS, GROWTH_PRESETS, MULTIPLIER_PRESETS };

export const SIZING_DEFAULTS = Object.freeze({
  recordCount: 1_000_000,
  growthPercent: 40,
  years: 5,
  compressionId: null,
  sampleText: `{"userId":"u_1842","event":"checkout","sku":"SKU-9F2","qty":3,"total":42.50,"ts":"2026-09-05T19:00:00Z"}`
});

/**
 * Pure sizing model — no DOM. Safe to unit-test and reuse.
 *
 * @param {{
 *   text?: string,
 *   recordCount: number,
 *   growthPercent: number,
 *   years?: number,
 *   compressionId?: string | null
 * }} input
 */
export function estimateSizing({
  text = "",
  recordCount,
  growthPercent,
  years = SIZING_DEFAULTS.years,
  compressionId = null
}) {
  const rawBytesPerRecord = utf8ByteLength(text);
  const compression = getCompressionPreset(compressionId);
  const ratio = compression?.ratio ?? 1;
  const bytesPerRecord = rawBytesPerRecord * ratio;

  const scaled = projectScaledStorage({
    bytesPerRecord,
    recordCount,
    growthPercent,
    years
  });

  const compressionLabel = compression
    ? `${compression.label} · ~${Math.round((1 / ratio) * 10) / 10}× smaller`
    : "Off · raw UTF-8 size";

  const summaryBits = [
    `${formatCount(scaled.recordCount)} records × ${formatCount(rawBytesPerRecord)} bytes each`
  ];
  if (compression) {
    summaryBits.push(`after ${compression.label}`);
  }

  return {
    textLength: typeof text === "string" ? text.length : 0,
    rawBytesPerRecord,
    bytesPerRecord,
    recordCount: scaled.recordCount,
    growthPercent: scaled.growthPercent,
    compressionId: compression?.id ?? null,
    compressionLabel,
    compressionRatio: ratio,
    year0Bytes: scaled.year0Bytes,
    perRecordPrimary: primarySize(bytesPerRecord),
    perRecordUnits: sizeBreakdown(bytesPerRecord),
    perRecordDetails: fullSizeBreakdown(bytesPerRecord),
    totalPrimary: scaled.year0Primary,
    totalUnits: scaled.year0Units,
    totalDetails: fullSizeBreakdown(scaled.year0Bytes),
    projections: scaled.projections,
    summaryLine: summaryBits.join(" · "),
    perRecordLabel: formatPrimary(bytesPerRecord),
    heroLabel: formatPrimary(scaled.year0Bytes)
  };
}
