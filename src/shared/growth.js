import { sizeBreakdown } from "./storage.js";

export const DEFAULT_PROJECTION_YEARS = 5;

/** @param {unknown} value @param {number} [fallback] */
export function clampNonNegative(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? Number(value) : fallback;
}

/**
 * Compound growth on a starting footprint.
 * Year n = year0 × (1 + growthPercent/100)^n
 *
 * Shared by sizing, cost, and future capacity calculators.
 */
export function projectCompoundGrowth({
  year0Bytes,
  growthPercent,
  years = DEFAULT_PROJECTION_YEARS
}) {
  const base = clampNonNegative(year0Bytes);
  const rate = clampNonNegative(growthPercent);
  const horizon =
    Number.isInteger(years) && years >= 0 ? years : DEFAULT_PROJECTION_YEARS;
  const factor = 1 + rate / 100;

  const projections = [];
  for (let year = 0; year <= horizon; year += 1) {
    const bytes = base * factor ** year;
    const units = sizeBreakdown(bytes);
    projections.push({
      year,
      bytes,
      units,
      primary: units[units.length - 1]
    });
  }

  return {
    year0Bytes: base,
    growthPercent: rate,
    years: horizon,
    projections
  };
}

/** Year-0 footprint = bytesPerRecord × recordCount, then compound growth. */
export function projectScaledStorage({
  bytesPerRecord,
  recordCount,
  growthPercent,
  years = DEFAULT_PROJECTION_YEARS
}) {
  const perRecord = clampNonNegative(bytesPerRecord);
  const records = clampNonNegative(recordCount);
  const year0Bytes = perRecord * records;
  const projection = projectCompoundGrowth({
    year0Bytes,
    growthPercent,
    years
  });
  const year0 = projection.projections[0];

  return {
    bytesPerRecord: perRecord,
    recordCount: records,
    ...projection,
    year0Primary: year0.primary,
    year0Units: year0.units
  };
}
