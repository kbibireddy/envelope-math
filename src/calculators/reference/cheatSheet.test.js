import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_NUMBERS,
  COMMON_FORMULAS,
  ESTIMATION_TIPS,
  LATENCY_NUMBERS,
  POWER_OF_TWO,
  WORKED_EXAMPLE
} from "./cheatSheet.js";

describe("cheat sheet reference data", () => {
  it("covers ByteByteGo power-of-two ladder KB→PB", () => {
    expect(POWER_OF_TWO.map((row) => row.short)).toEqual([
      "KB",
      "MB",
      "GB",
      "TB",
      "PB"
    ]);
    expect(POWER_OF_TWO[0].power).toBe(10);
    expect(POWER_OF_TWO.at(-1)?.power).toBe(50);
  });

  it("includes classic Dean latency anchors", () => {
    const ops = LATENCY_NUMBERS.map((row) => row.op);
    expect(ops).toEqual(
      expect.arrayContaining([
        "L1 cache reference",
        "Main memory reference",
        "Disk seek",
        "Send packet CA → Netherlands → CA"
      ])
    );
  });

  it("lists availability nines with downtime columns", () => {
    expect(AVAILABILITY_NUMBERS.length).toBeGreaterThanOrEqual(4);
    expect(AVAILABILITY_NUMBERS[0]?.availability).toMatch(/99%/);
    expect(AVAILABILITY_NUMBERS.some((row) => /5 nines/.test(row.availability))).toBe(
      true
    );
  });

  it("has interview formulas and estimation tips", () => {
    expect(COMMON_FORMULAS.some((row) => /QPS|TPS/.test(row.item))).toBe(true);
    expect(ESTIMATION_TIPS.some((row) => /Round/.test(row.tip))).toBe(true);
    expect(WORKED_EXAMPLE.some((row) => row.step === "Peak QPS")).toBe(true);
  });
});
