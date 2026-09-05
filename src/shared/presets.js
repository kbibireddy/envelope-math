/**
 * @typedef {{ label: string, value: number, hint?: string }} NumericPreset
 */

/** @type {ReadonlyArray<NumericPreset>} */
export const MULTIPLIER_PRESETS = Object.freeze([
  Object.freeze({ label: "1", value: 1 }),
  Object.freeze({ label: "1K", value: 1_000 }),
  Object.freeze({ label: "10K", value: 10_000 }),
  Object.freeze({ label: "100K", value: 100_000 }),
  Object.freeze({ label: "1M", value: 1_000_000 }),
  Object.freeze({ label: "10M", value: 10_000_000 }),
  Object.freeze({ label: "100M", value: 100_000_000 }),
  Object.freeze({ label: "1B", value: 1_000_000_000 })
]);

/** YoY growth bars for mature → hypergrowth capacity planning. */
/** @type {ReadonlyArray<NumericPreset>} */
export const GROWTH_PRESETS = Object.freeze([
  Object.freeze({ label: "10%", value: 10, hint: "Mature / stable systems" }),
  Object.freeze({ label: "20%", value: 20, hint: "Conservative enterprise" }),
  Object.freeze({ label: "40%", value: 40, hint: "Typical enterprise data growth" }),
  Object.freeze({ label: "60%", value: 60, hint: "High-growth product data" }),
  Object.freeze({ label: "100%", value: 100, hint: "Aggressive / large-scale logging" }),
  Object.freeze({ label: "150%", value: 150, hint: "Hypergrowth case" })
]);
