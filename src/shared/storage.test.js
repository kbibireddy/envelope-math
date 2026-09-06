import { describe, expect, it } from "vitest";
import {
  UNIT_VISIBILITY_THRESHOLD,
  formatCompactNumber,
  formatCount,
  formatDetailNumber,
  formatPrimary,
  formatUnitValue,
  fullSizeBreakdown,
  primarySize,
  sizeBreakdown,
  utf8ByteLength
} from "./storage.js";
import {
  clampNonNegative,
  projectCompoundGrowth,
  projectScaledStorage
} from "./growth.js";
import { GROWTH_PRESETS, MULTIPLIER_PRESETS } from "./presets.js";

describe("utf8ByteLength", () => {
  it("counts ASCII and empty/invalid input", () => {
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
    expect(sizeBreakdown(0).map((row) => row.key)).toEqual(["B"]);
  });

  it("shows KB/MB above the 0.01 threshold", () => {
    expect(sizeBreakdown(1024).map((row) => row.key)).toEqual(["B", "KB"]);
    expect(sizeBreakdown(1024 ** 2).map((row) => row.key)).toContain("MB");
    expect(sizeBreakdown(1024 ** 2).map((row) => row.key)).not.toContain("TB");
  });

  it("hides units below 0.01 (more than two leading decimal zeros)", () => {
    const rows = sizeBreakdown(1024 ** 3);
    expect(rows.map((row) => row.key)).toEqual(["B", "KB", "MB", "GB"]);
    expect(
      rows.every(
        (row) => row.value >= UNIT_VISIBILITY_THRESHOLD || row.key === "B"
      )
    ).toBe(true);
  });

  it("includes TB once it clears the 0.01 threshold (~10.24 GB)", () => {
    const rows = sizeBreakdown(11 * 1024 ** 3);
    expect(rows.map((row) => row.key)).toContain("TB");
    expect(rows.map((row) => row.key)).not.toContain("PB");
  });

  it("includes PB for very large footprints", () => {
    expect(sizeBreakdown(2 * 1024 ** 5).map((row) => row.key)).toContain("PB");
  });
});

describe("fullSizeBreakdown", () => {
  it("always returns the full B→PB ladder with 2-decimal detail values", () => {
    const rows = fullSizeBreakdown(104);
    expect(rows.map((row) => row.key)).toEqual([
      "B",
      "KB",
      "MB",
      "GB",
      "TB",
      "PB"
    ]);
    expect(rows[0].display).toBe("104");
    expect(rows[1].display).toBe("0.1");
  });
});

describe("formatting helpers", () => {
  it("compacts main-view numbers above 9999 with K/M/B", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(9999)).toBe("9999");
    expect(formatCompactNumber(10000)).toBe("10K");
    expect(formatCompactNumber(1_500_000)).toBe("1.5M");
    expect(formatCompactNumber(2_000_000_000)).toBe("2B");
  });

  it("limits detail numbers to 2 decimal places", () => {
    expect(formatDetailNumber(0.1015625)).toBe("0.1");
    expect(formatDetailNumber(99.182)).toBe("99.18");
    expect(formatDetailNumber(104)).toBe("104");
  });

  it("formats unit values and counts", () => {
    expect(formatUnitValue(0)).toBe("0");
    expect(formatUnitValue(1500)).toBe("1500");
    expect(formatUnitValue(0.5)).toBe("0.5");
    expect(formatCount(1_000_000)).toBe("1M");
    expect(formatCount(Number.NaN)).toBe("0");
    expect(formatPrimary(1024)).toBe("1 KB");
  });

  it("picks the largest unit with value ≥ 1 (no PB fallthrough gaps)", () => {
    expect(primarySize(0).key).toBe("B");
    expect(primarySize(104).key).toBe("B");
    // Former [1000, 1024) gap — must stay on bytes, never tiny PB.
    expect(primarySize(1000).key).toBe("B");
    expect(primarySize(1000).display).not.toMatch(/e/i);
    expect(primarySize(1024).key).toBe("KB");
    expect(primarySize(1024 ** 2).key).toBe("MB");
    expect(primarySize(1024 ** 3).key).toBe("GB");
    // ~99 MB should read as MB, not a fractional GB.
    const roughly99Mb = 104_000_000;
    expect(primarySize(roughly99Mb).key).toBe("MB");
    expect(primarySize(roughly99Mb).value).toBeGreaterThanOrEqual(1);
    expect(primarySize(roughly99Mb).value).toBeLessThan(1024);
    expect(formatPrimary(roughly99Mb)).not.toMatch(/e/i);
  });
});

describe("growth projection", () => {
  it("clamps invalid numbers", () => {
    expect(clampNonNegative(-1)).toBe(0);
    expect(clampNonNegative(Number.NaN, 3)).toBe(3);
    expect(clampNonNegative(4)).toBe(4);
  });

  it("compounds YoY growth from a year-0 footprint", () => {
    const result = projectCompoundGrowth({
      year0Bytes: 1000,
      growthPercent: 100,
      years: 2
    });
    expect(result.projections.map((row) => row.bytes)).toEqual([1000, 2000, 4000]);
  });

  it("scales records then projects", () => {
    const result = projectScaledStorage({
      bytesPerRecord: 100,
      recordCount: 10,
      growthPercent: 0,
      years: 1
    });
    expect(result.year0Bytes).toBe(1000);
    expect(result.year0Units[0].key).toBe("B");
    expect(result.projections).toHaveLength(2);
  });

  it("falls back to the default horizon for invalid years", () => {
    const result = projectCompoundGrowth({
      year0Bytes: 10,
      growthPercent: 0,
      years: 1.5
    });
    expect(result.projections).toHaveLength(6);
  });
});

describe("presets", () => {
  it("exposes multiplier and growth recommendations", () => {
    expect(MULTIPLIER_PRESETS.some((preset) => preset.value === 1_000_000)).toBe(
      true
    );
    expect(GROWTH_PRESETS.some((preset) => preset.value === 40)).toBe(true);
    expect(GROWTH_PRESETS.some((preset) => preset.value === 100)).toBe(true);
  });
});
