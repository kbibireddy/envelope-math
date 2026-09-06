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

/** YoY growth bars for mature through hypergrowth capacity planning. */
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
 * Ratios are typical post-compression fractions of raw UTF-8 size.
 * decodeMBs is a rough expected decompression throughput (uncompressed
 * MB/s) . back-of-envelope for read-path cost, not a codec benchmark.
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   ratio: number,
 *   decodeMBs: number,
 *   hint?: string
 * }} CompressionPreset
 */

/** @type {ReadonlyArray<CompressionPreset>} */
export const COMPRESSION_PRESETS = Object.freeze([
  Object.freeze({
    id: "gz",
    label: "gz",
    ratio: 0.33,
    decodeMBs: 300,
    hint: "gzip . ~3× size, ~300 MB/s decode"
  }),
  Object.freeze({
    id: "zstd-1",
    label: "zstd(1)",
    ratio: 0.3,
    decodeMBs: 1000,
    hint: "zstd level 1 . fast, ~1 GB/s decode"
  }),
  Object.freeze({
    id: "zstd-11",
    label: "zstd(11)",
    ratio: 0.22,
    decodeMBs: 700,
    hint: "zstd level 11 . balanced, ~700 MB/s decode"
  }),
  Object.freeze({
    id: "zstd-22",
    label: "zstd(22)",
    ratio: 0.17,
    decodeMBs: 500,
    hint: "zstd level 22 . max ratio, ~500 MB/s decode"
  })
]);

export function getCompressionPreset(id) {
  if (!id) return null;
  return COMPRESSION_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * Compact decode-speed label for helper text.
 * @param {number} megabytesPerSecond
 */
export function formatDecodeSpeed(megabytesPerSecond) {
  const rate = Number(megabytesPerSecond);
  if (!Number.isFinite(rate) || rate <= 0) return "n/a";
  if (rate >= 1000) {
    const gb = rate / 1000;
    const rounded = gb >= 10 ? Math.round(gb) : Math.round(gb * 10) / 10;
    return `${rounded} GB/s`;
  }
  return `${Math.round(rate)} MB/s`;
}

/**
 * Expected wall time to decompress `uncompressedBytes` at `decodeMBs`.
 * Throughput is treated as MiB/s of uncompressed output.
 * @param {number} uncompressedBytes
 * @param {number} decodeMBs
 */
export function estimateDecodeLatencyMs(uncompressedBytes, decodeMBs) {
  const bytes = Number(uncompressedBytes);
  const rate = Number(decodeMBs);
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return Infinity;
  const bytesPerSecond = rate * 1024 * 1024;
  return (bytes / bytesPerSecond) * 1000;
}

/**
 * Human label for a tiny decode cost (µs or ms).
 * @param {number} latencyMs
 */
export function formatDecodeLatency(latencyMs) {
  const ms = Number(latencyMs);
  if (!Number.isFinite(ms) || ms < 0) return "n/a";
  if (ms === 0) return "0 µs";
  if (ms < 0.001) {
    const ns = ms * 1_000_000;
    return ns < 10
      ? `~${ns.toPrecision(2)} ns`
      : `~${Math.round(ns)} ns`;
  }
  if (ms < 1) {
    const us = ms * 1000;
    return us < 10
      ? `~${us.toPrecision(2)} µs`
      : `~${Math.round(us)} µs`;
  }
  if (ms < 10) return `~${ms.toPrecision(2)} ms`;
  if (ms < 1000) return `~${Math.round(ms)} ms`;
  return `~${(ms / 1000).toPrecision(2)} s`;
}
