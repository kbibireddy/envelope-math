import { describe, expect, it } from "vitest";
import {
  THROUGHPUT_DEFAULTS,
  dailyActiveUsers,
  estimateThroughput,
  formatBandwidth,
  formatTps
} from "./model.js";

describe("dailyActiveUsers", () => {
  it("passes DAU through unchanged", () => {
    expect(
      dailyActiveUsers({ audienceMode: "dau", audienceCount: 2_000_000 })
    ).toBe(2_000_000);
  });

  it("derives daily users from MAU ÷ active days", () => {
    expect(
      dailyActiveUsers({
        audienceMode: "mau",
        audienceCount: 30_000_000,
        activeDaysPerMonth: 30
      })
    ).toBe(1_000_000);
  });
});

describe("estimateThroughput", () => {
  it("computes avg and peak TPS across streams", () => {
    const result = estimateThroughput({
      audienceMode: "dau",
      audienceCount: 864_000,
      peakMultiplier: 2,
      streams: [
        { id: "read", name: "Read", actionsPerUserPerDay: 10 },
        { id: "write", name: "Write", actionsPerUserPerDay: 1 }
      ]
    });

    // 864000 users × 10 actions / 86400 s = 100 TPS avg for read
    expect(result.streams[0].avgTps).toBeCloseTo(100);
    expect(result.streams[0].peakTps).toBeCloseTo(200);
    expect(result.streams[1].avgTps).toBeCloseTo(10);
    expect(result.totalAvgTps).toBeCloseTo(110);
    expect(result.totalPeakTps).toBeCloseTo(220);
    expect(result.streams[0].shareOfPeak).toBeCloseTo(200 / 220);
  });

  it("uses defaults-shaped MAU math and optional capacity", () => {
    const result = estimateThroughput({
      ...THROUGHPUT_DEFAULTS,
      audienceMode: "mau",
      audienceCount: 30_000_000,
      activeDaysPerMonth: 30,
      peakMultiplier: 3,
      payloadBytes: 1024,
      nodeCapacityTps: 1000,
      streams: [...THROUGHPUT_DEFAULTS.streams]
    });

    expect(result.dailyUsers).toBeCloseTo(1_000_000);
    expect(result.totalAvgTps).toBeGreaterThan(0);
    expect(result.totalPeakTps).toBeCloseTo(result.totalAvgTps * 3);
    expect(result.avgBandwidthBps).toBeCloseTo(result.totalAvgTps * 1024);
    expect(result.nodesNeeded).toBe(
      Math.ceil(result.totalPeakTps / 1000)
    );
    expect(result.avgBandwidthLabel).not.toBe("—");
  });
});

describe("format helpers", () => {
  it("formats TPS and bandwidth compactly", () => {
    expect(formatTps(0)).toBe("0");
    expect(formatTps(12.34)).toMatch(/12/);
    expect(formatTps(12_500)).toMatch(/K/);
    expect(formatBandwidth(0)).toBe("—");
    expect(formatBandwidth(2048)).toMatch(/KB\/s/);
  });
});
