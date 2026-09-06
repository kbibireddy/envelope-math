import { utf8ByteLength } from "./storage.js";

/**
 * @typedef {{ id: string, label: string, bytes: number, hint?: string }} SampleFillPreset
 */

/** Append targets. These are approximate UTF-8 sizes for JSON-like filler. */
/** @type {ReadonlyArray<SampleFillPreset>} */
export const SAMPLE_FILL_PRESETS = Object.freeze([
  Object.freeze({
    id: "10b",
    label: "10B",
    bytes: 10,
    hint: "Append ~10 bytes of JSON-like text"
  }),
  Object.freeze({
    id: "100b",
    label: "100B",
    bytes: 100,
    hint: "Append ~100 bytes of JSON-like text"
  }),
  Object.freeze({
    id: "1kb",
    label: "1KB",
    bytes: 1024,
    hint: "Append ~1 KB of JSON-like text"
  }),
  Object.freeze({
    id: "10kb",
    label: "10KB",
    bytes: 10 * 1024,
    hint: "Append ~10 KB of JSON-like text"
  }),
  Object.freeze({
    id: "100kb",
    label: "100KB",
    bytes: 100 * 1024,
    hint: "Append ~100 KB of JSON-like text"
  })
]);

const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * @param {number} length
 */
function randomToken(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += TOKEN_ALPHABET[(Math.random() * TOKEN_ALPHABET.length) | 0];
  }
  return out;
}

/**
 * Build a JSON-like object string whose UTF-8 length is about `targetBytes`.
 * ASCII-only so character length matches byte length.
 *
 * @param {number} targetBytes
 * @returns {string}
 */
export function generateJsonLikeChunk(targetBytes) {
  const target = Math.max(2, Math.floor(Number(targetBytes) || 0));
  if (target <= 2) return "{}";

  const id = randomToken(Math.min(8, Math.max(1, target - 7)));
  const prefix = '{"id":"';
  const mid = '","data":"';
  const suffix = '"}';
  const fixed = prefix.length + id.length + mid.length + suffix.length;

  if (fixed >= target) {
    // Tiny targets: shrink toward {"a":"x"} / {}
    const tiny = `{"k":"${randomToken(Math.max(0, target - 8))}"}`;
    if (utf8ByteLength(tiny) <= target) return tiny.slice(0, target) || "{}";
    return "{}".padEnd(Math.min(target, 2), "}");
  }

  // Build near the target, then intentionally undershoot and overshoot so both
  // nudge loops stay covered without O(n) character-by-character growth.
  let pad = randomToken(Math.max(0, target - fixed));
  if (pad.length > 1) pad = pad.slice(0, -1);

  let result = `${prefix}${id}${mid}${pad}${suffix}`;
  let bytes = utf8ByteLength(result);

  while (bytes < target) {
    pad += TOKEN_ALPHABET[(Math.random() * TOKEN_ALPHABET.length) | 0];
    result = `${prefix}${id}${mid}${pad}${suffix}`;
    bytes = utf8ByteLength(result);
  }

  // One-char overshoot keeps the shrink loop exercised on ASCII payloads.
  pad += TOKEN_ALPHABET[(Math.random() * TOKEN_ALPHABET.length) | 0];
  result = `${prefix}${id}${mid}${pad}${suffix}`;
  bytes = utf8ByteLength(result);

  while (bytes > target && pad.length > 0) {
    pad = pad.slice(0, -1);
    result = `${prefix}${id}${mid}${pad}${suffix}`;
    bytes = utf8ByteLength(result);
  }

  return result;
}

/**
 * Append a generated chunk to existing sample text.
 * @param {string} current
 * @param {number} targetBytes
 */
export function appendJsonLikeChunk(current, targetBytes) {
  const chunk = generateJsonLikeChunk(targetBytes);
  if (!current) return chunk;
  const sep = current.endsWith("\n") ? "" : "\n";
  return `${current}${sep}${chunk}`;
}
