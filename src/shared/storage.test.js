import { describe, expect, it } from "vitest";
import {
  UNIT_VISIBILITY_THRESHOLD,
  formatCount,
  formatPrimary,
  formatUnitValue,
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

  it("shows KB/MB above the 0.001 threshold", () => {
    expect(sizeBreakdown(1024).map((row) => row.key)).toEqual(["B", "KB"]);
    expect(sizeBreakdown(1024 ** 2).map((row) => row.key)).toContain("MB");
    expect(sizeBreakdown(1024 ** 2).map((row) => row.key)).not.toContain("TB");
  });

  it("drops TB/PB when values sit after three decimal zeros", () => {
    const rows = sizeBreakdown(1024 ** 3);
    expect(rows.map((row) => row.key)).toEqual(["B", "KB", "MB", "GB"]);
    expect(
      rows.every(
        (row) => row.value >= UNIT_VISIBILITY_THRESHOLD || row.key === "B"
      )
    ).toBe(true);
  });

  it("includes TB once it clears the threshold", () => {
    const rows = sizeBreakdown(2 * 1024 ** 3);
    expect(rows.map((row) => row.key)).toContain("TB");
    expect(rows.map((row) => row.key)).not.toContain("PB");
  });

  it("includes PB for very large footprints", () => {
    expect(sizeBreakdown(2 * 1024 ** 5).map((row) => row.key)).toContain("PB");
  });
});

describe("formatting helpers", () => {
  it("formats unit values and counts", () => {
    expect(formatUnitValue(0)).toBe("0");
    expect(formatUnitValue(1500)).toMatch(/1,?500/);
    expect(formatUnitValue(0.5)).toMatch(/0\.5/);
    expect(formatCount(1_000_000)).toMatch(/1,?000,?000/);
    expect(formatCount(Number.NaN)).toBe("0");
    expect(formatPrimary(1024)).toBe("1 KB");
  });

  it("picks a human-scale unit in the 1–999 range", () => {
    expect(primarySize(0).key).toBe("B");
    expect(primarySize(104).key).toBe("B");
    expect(primarySize(1024 ** 2).key).toBe("MB");
    expect(primarySize(1024 ** 3).key).toBe("GB");
    // ~99 MB should read as MB, not a fractional GB.
    const roughly99Mb = 104_000_000;
    expect(primarySize(roughly99Mb).key).toBe("MB");
    expect(primarySize(roughly99Mb).value).toBeGreaterThanOrEqual(1);
    expect(primarySize(roughly99Mb).value).toBeLessThan(1000);
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
