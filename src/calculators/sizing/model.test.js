import { describe, expect, it } from "vitest";
import { SIZING_DEFAULTS, estimateSizing } from "./model.js";
import {
  CALCULATORS,
  getCalculator,
  getDefaultCalculator
} from "../registry.js";

describe("estimateSizing", () => {
  it("ties text length to multiplier and growth", () => {
    const result = estimateSizing({
      text: "abcd",
      recordCount: 1_000_000,
      growthPercent: 40,
      years: 5
    });
    expect(result.bytesPerRecord).toBe(4);
    expect(result.year0Bytes).toBe(4_000_000);
    expect(result.projections).toHaveLength(6);
    expect(result.projections[5].bytes).toBeCloseTo(4_000_000 * 1.4 ** 5);
    expect(result.heroLabel).toMatch(/MB|KB|bytes|GB/);
    expect(result.summaryLine).toContain("1M");
    expect(result.perRecordLabel).toMatch(/bytes|KB/);
    expect(result.perRecordDetails).toHaveLength(6);
    expect(result.totalDetails).toHaveLength(6);
  });

  it("accepts missing text and uses the default horizon", () => {
    const result = estimateSizing({
      text: undefined,
      recordCount: 10,
      growthPercent: 0
    });
    expect(result.bytesPerRecord).toBe(0);
    expect(result.year0Bytes).toBe(0);
    expect(result.projections).toHaveLength(SIZING_DEFAULTS.years + 1);
  });

  it("treats non-string text as zero length", () => {
    const result = estimateSizing({
      text: /** @type {any} */ (42),
      recordCount: 1,
      growthPercent: 0
    });
    expect(result.textLength).toBe(0);
    expect(result.bytesPerRecord).toBe(0);
  });
  it("applies exclusive compression ratio to footprints", () => {
    const raw = estimateSizing({
      text: "abcd",
      recordCount: 1000,
      growthPercent: 0,
      compressionId: null
    });
    const gz = estimateSizing({
      text: "abcd",
      recordCount: 1000,
      growthPercent: 0,
      compressionId: "gz"
    });
    expect(raw.bytesPerRecord).toBe(4);
    expect(gz.bytesPerRecord).toBeCloseTo(4 * 0.33);
    expect(gz.year0Bytes).toBeCloseTo(4000 * 0.33);
    expect(gz.compressionId).toBe("gz");
    expect(gz.compressionLabel).toMatch(/gz · ~3× smaller · ~300 MB\/s decode/);
  });
});

describe("calculator registry", () => {
  it("lists sizing as the default available product", () => {
    expect(getDefaultCalculator().id).toBe("sizing");
    expect(getCalculator("sizing")?.status).toBe("available");
    expect(getCalculator("throughput")?.status).toBe("planned");
    expect(getCalculator("missing")).toBeNull();
    expect(CALCULATORS.length).toBeGreaterThanOrEqual(3);
  });
});
