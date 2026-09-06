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

/**
 * Envelope compression presets for JSON/text-like payloads.
 * Ratios are typical post-compression fractions of raw UTF-8 size
 * (back-of-envelope, not a codec benchmark).
 *
 * @typedef {{ id: string, label: string, ratio: number, hint?: string }} CompressionPreset
 */

/** @type {ReadonlyArray<CompressionPreset>} */
export const COMPRESSION_PRESETS = Object.freeze([
  Object.freeze({
    id: "gz",
    label: "gz",
    ratio: 0.33,
    hint: "gzip — typical ~3× on JSON/text"
  }),
  Object.freeze({
    id: "zstd-1",
    label: "zst(1)",
    ratio: 0.3,
    hint: "zstd level 1 — fast, modest ratio"
  }),
  Object.freeze({
    id: "zstd-11",
    label: "zstd(11)",
    ratio: 0.22,
    hint: "zstd level 11 — balanced"
  }),
  Object.freeze({
    id: "zstd-22",
    label: "zstd(22)",
    ratio: 0.17,
    hint: "zstd level 22 — max ratio, slow"
  })
]);

export function getCompressionPreset(id) {
  if (!id) return null;
  return COMPRESSION_PRESETS.find((preset) => preset.id === id) ?? null;
}