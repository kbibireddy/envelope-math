import { describe, expect, it } from "vitest";
import {
  GROWTH_PRESETS,
  MULTIPLIER_PRESETS,
  UNIT_VISIBILITY_THRESHOLD,
  estimateSizing,
  formatUnitValue,
  primarySize,
  projectStorage,
  sizeBreakdown,
  utf8ByteLength
} from "./calculator.js";

describe("utf8ByteLength", () => {
  it("counts ASCII as one byte per character", () => {
    expect(utf8ByteLength("hello")).toBe(5);
    expect(utf8ByteLength("")).toBe(0);
    expect(utf8ByteLength(null)).toBe(0);
  });

  it("counts multi-byte UTF-8 characters", () => {
    expect(utf8ByteLength("é")).toBe(2);
    expect(utf8ByteLength("你好")).toBe(6);
    expect(utf8ByteLength("🙂")).toBe(4);
  });
});

describe("sizeBreakdown visibility", () => {
  it("always includes bytes", () => {
    const rows = sizeBreakdown(0);
    expect(rows.map((r) => r.key)).toEqual(["B"]);
  });

  it("shows KB/MB when above the 0.001 threshold", () => {
    const oneKb = sizeBreakdown(1024);
    expect(oneKb.map((r) => r.key)).toEqual(["B", "KB"]);
    expect(oneKb.find((r) => r.key === "KB").value).toBe(1);

    const oneMb = sizeBreakdown(1024 ** 2);
    expect(oneMb.map((r) => r.key)).toContain("MB");
    expect(oneMb.map((r) => r.key)).not.toContain("TB");
  });

  it("drops TB and PB when values sit after three decimal zeros", () => {
    // 1 GB → TB = 1/1024 ≈ 0.000976 < 0.001
    const rows = sizeBreakdown(1024 ** 3);
    expect(rows.map((r) => r.key)).toEqual(["B", "KB", "MB", "GB"]);
    expect(rows.every((r) => r.value >= UNIT_VISIBILITY_THRESHOLD || r.key === "B")).toBe(
      true
    );
  });

  it("includes TB once it clears the threshold", () => {
    // 2 GB → TB ≈ 0.00195
    const rows = sizeBreakdown(2 * 1024 ** 3);
    expect(rows.map((r) => r.key)).toContain("TB");
    expect(rows.map((r) => r.key)).not.toContain("PB");
  });

  it("includes PB for very large footprints", () => {
    const rows = sizeBreakdown(2 * 1024 ** 5);
    expect(rows.map((r) => r.key)).toContain("PB");
  });
});

describe("formatUnitValue / primarySize", () => {
  it("formats zero and large values", () => {
    expect(formatUnitValue(0)).toBe("0");
    expect(formatUnitValue(1500)).toMatch(/1,?500/);
  });

  it("picks the largest visible unit as primary", () => {
    expect(primarySize(0).key).toBe("B");
    expect(primarySize(1024 ** 2).key).toBe("MB");
    expect(primarySize(1024 ** 3).key).toBe("GB");
  });
});

describe("projectStorage", () => {
  it("computes year-0 as bytes × records", () => {
    const result = projectStorage({
      bytesPerRecord: 100,
      recordCount: 1000,
      growthPercent: 0,
      years: 3
    });
    expect(result.year0Bytes).toBe(100_000);
    expect(result.projections).toHaveLength(4);
    expect(result.projections.every((p) => p.bytes === 100_000)).toBe(true);
  });

  it("compounds YoY growth", () => {
    const result = projectStorage({
      bytesPerRecord: 100,
      recordCount: 10,
      growthPercent: 100,
      years: 2
    });
    expect(result.projections[0].bytes).toBe(1000);
    expect(result.projections[1].bytes).toBe(2000);
    expect(result.projections[2].bytes).toBe(4000);
  });

  it("treats invalid inputs as zeroed", () => {
    const result = projectStorage({
      bytesPerRecord: -1,
      recordCount: NaN,
      growthPercent: -5,
      years: 1
    });
    expect(result.year0Bytes).toBe(0);
    expect(result.growthPercent).toBe(0);
  });

  it("falls back to the default horizon for invalid years", () => {
    const result = projectStorage({
      bytesPerRecord: 10,
      recordCount: 10,
      growthPercent: 0,
      years: 1.5
    });
    expect(result.projections).toHaveLength(6);
  });
});

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
  });

  it("accepts missing text", () => {
    const result = estimateSizing({
      text: undefined,
      recordCount: 10,
      growthPercent: 0
    });
    expect(result.bytesPerRecord).toBe(0);
    expect(result.year0Bytes).toBe(0);
  });
});

describe("presets", () => {
  it("exposes multiplier and growth recommendations", () => {
    expect(MULTIPLIER_PRESETS.some((p) => p.value === 1_000_000)).toBe(true);
    expect(GROWTH_PRESETS.some((p) => p.value === 40)).toBe(true);
    expect(GROWTH_PRESETS.some((p) => p.value === 100)).toBe(true);
  });
});
