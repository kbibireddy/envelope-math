import { describe, expect, it } from "vitest";
import {
  SAMPLE_FILL_PRESETS,
  appendJsonLikeChunk,
  generateJsonLikeChunk
} from "./sampleFill.js";
import { utf8ByteLength } from "./storage.js";

describe("generateJsonLikeChunk", () => {
  it("hits each preset size within a small tolerance", () => {
    for (const preset of SAMPLE_FILL_PRESETS) {
      const chunk = generateJsonLikeChunk(preset.bytes);
      const bytes = utf8ByteLength(chunk);
      expect(bytes).toBeGreaterThanOrEqual(preset.bytes - 2);
      expect(bytes).toBeLessThanOrEqual(preset.bytes + 2);
      expect(chunk.startsWith("{")).toBe(true);
      expect(chunk.endsWith("}")).toBe(true);
    }
  });

  it("handles tiny targets", () => {
    expect(utf8ByteLength(generateJsonLikeChunk(2))).toBeLessThanOrEqual(2);
    expect(utf8ByteLength(generateJsonLikeChunk(3))).toBeLessThanOrEqual(3);
    expect(utf8ByteLength(generateJsonLikeChunk(5))).toBeLessThanOrEqual(5);
    expect(utf8ByteLength(generateJsonLikeChunk(8))).toBeLessThanOrEqual(8);
    // Exact ASCII landing for a still-small but padded target.
    expect(utf8ByteLength(generateJsonLikeChunk(32))).toBe(32);
  });

  it("falls back when a tiny JSON shell cannot fit the target", () => {
    // Targets just above 2 force the tiny-shell path; when even that is too
    // large, the function returns a padded "{}".
    const chunk = generateJsonLikeChunk(4);
    expect(chunk.startsWith("{")).toBe(true);
    expect(utf8ByteLength(chunk)).toBeLessThanOrEqual(4);
  });
});

describe("appendJsonLikeChunk", () => {
  it("appends on a new line when text already exists", () => {
    const next = appendJsonLikeChunk('{"a":1}', 10);
    expect(next.startsWith('{"a":1}\n')).toBe(true);
    expect(utf8ByteLength(next.slice(next.indexOf("\n") + 1))).toBe(10);
  });

  it("returns only the chunk when starting empty", () => {
    const next = appendJsonLikeChunk("", 100);
    expect(utf8ByteLength(next)).toBe(100);
  });
});
