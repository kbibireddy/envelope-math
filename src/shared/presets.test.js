import { describe, expect, it } from "vitest";
import {
  COMPRESSION_PRESETS,
  estimateDecodeLatencyMs,
  formatDecodeLatency,
  formatDecodeSpeed,
  getCompressionPreset
} from "./presets.js";

describe("getCompressionPreset", () => {
  it("returns a preset by id and null for missing/empty ids", () => {
    expect(getCompressionPreset("gz")?.label).toBe("gz");
    expect(getCompressionPreset("zstd-1")?.decodeMBs).toBe(1000);
    expect(getCompressionPreset("missing")).toBeNull();
    expect(getCompressionPreset("")).toBeNull();
    expect(getCompressionPreset(null)).toBeNull();
  });

  it("lists the compression ladder used by sizing", () => {
    expect(COMPRESSION_PRESETS.map((preset) => preset.id)).toEqual([
      "gz",
      "zstd-1",
      "zstd-11",
      "zstd-22"
    ]);
  });
});

describe("formatDecodeSpeed", () => {
  it("formats MB/s and GB/s rates", () => {
    expect(formatDecodeSpeed(300)).toBe("300 MB/s");
    expect(formatDecodeSpeed(1000)).toBe("1 GB/s");
    expect(formatDecodeSpeed(1500)).toBe("1.5 GB/s");
    expect(formatDecodeSpeed(12_000)).toBe("12 GB/s");
  });

  it("returns n/a for invalid rates", () => {
    expect(formatDecodeSpeed(0)).toBe("n/a");
    expect(formatDecodeSpeed(-1)).toBe("n/a");
    expect(formatDecodeSpeed(Number.NaN)).toBe("n/a");
  });
});

describe("estimateDecodeLatencyMs", () => {
  it("converts bytes and MiB/s into milliseconds", () => {
    // 1 MiB at 1 MiB/s = 1000 ms
    expect(estimateDecodeLatencyMs(1024 * 1024, 1)).toBeCloseTo(1000);
    // 300 KB at 300 MB/s ≈ 0.976 ms
    expect(estimateDecodeLatencyMs(300 * 1024, 300)).toBeGreaterThan(0);
  });

  it("handles empty payloads and invalid rates", () => {
    expect(estimateDecodeLatencyMs(0, 300)).toBe(0);
    expect(estimateDecodeLatencyMs(-10, 300)).toBe(0);
    expect(estimateDecodeLatencyMs(1024, 0)).toBe(Infinity);
    expect(estimateDecodeLatencyMs(1024, Number.NaN)).toBe(Infinity);
  });
});

describe("formatDecodeLatency", () => {
  it("formats across ns, µs, ms, and seconds", () => {
    expect(formatDecodeLatency(0)).toBe("0 µs");
    expect(formatDecodeLatency(0.0000005)).toMatch(/ns$/); // 0.5 ns (< 10 ns)
    expect(formatDecodeLatency(0.00005)).toMatch(/ns$/); // 50 ns
    expect(formatDecodeLatency(0.005)).toMatch(/µs$/); // 5 µs (< 10)
    expect(formatDecodeLatency(0.05)).toMatch(/µs$/); // 50 µs
    expect(formatDecodeLatency(5)).toMatch(/ms$/); // < 10 ms
    expect(formatDecodeLatency(50)).toMatch(/ms$/);
    expect(formatDecodeLatency(2500)).toMatch(/s$/);
  });

  it("returns n/a for invalid latency", () => {
    expect(formatDecodeLatency(-1)).toBe("n/a");
    expect(formatDecodeLatency(Number.NaN)).toBe("n/a");
    expect(formatDecodeLatency(Number.POSITIVE_INFINITY)).toBe("n/a");
  });
});
