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
    expect(utf8ByteLength(generateJsonLikeChunk(10))).toBe(10);
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
