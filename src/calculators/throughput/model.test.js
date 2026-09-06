import { describe, expect, it } from "vitest";
import {
  THROUGHPUT_DEFAULTS,
  TRAFFIC_BY_FOCUS,
  dailyActiveUsers,
  estimateThroughput,
  formatBandwidth,
  formatTps,
  trafficConfigForFocus,
  createLayerSnapshot,
  upsertLayerSnapshot,
  removeLayerSnapshot
} from "./model.js";

describe("dailyActiveUsers", () => {
  it("passes DAU through unchanged", () => {
    expect(
      dailyActiveUsers({ audienceMode: "dau", audienceCount: 2_000_000 })
    ).toBe(2_000_000);
  });

  it("derives daily users from MAU ÷ 30", () => {
    expect(
      dailyActiveUsers({
        audienceMode: "mau",
        audienceCount: 30_000_000,
        activeDaysPerMonth: 30
      })
    ).toBe(1_000_000);
  });
});

describe("trafficConfigForFocus", () => {
  it("uses audience (DAU/MAU) only for app servers", () => {
    expect(trafficConfigForFocus("app")?.mode).toBe("audience");
    expect(TRAFFIC_BY_FOCUS.app.rateSuffix).toBe("/user/day");
  });

  it("uses rate units for internal systems", () => {
    expect(trafficConfigForFocus("database")?.mode).toBe("rate");
    expect(trafficConfigForFocus("database")?.rateSuffix).toBe("RPS");
    expect(trafficConfigForFocus("cache")?.rateSuffix).toBe("RPS");
    expect(trafficConfigForFocus("queue")?.rateSuffix).toBe("RPS");
    expect(trafficConfigForFocus(null)).toBeNull();
  });
});

describe("estimateThroughput", () => {
  it("computes avg and peak RPS from DAU × actions/user/day", () => {
    const result = estimateThroughput({
      trafficMode: "audience",
      audienceMode: "dau",
      audienceCount: 864_000,
      peakMultiplier: 2,
      streams: [
        { id: "read", name: "Read", actionsPerUserPerDay: 10 },
        { id: "write", name: "Write", actionsPerUserPerDay: 1 }
      ]
    });

    expect(result.streams[0].avgTps).toBeCloseTo(100);
    expect(result.streams[0].peakTps).toBeCloseTo(200);
    expect(result.streams[1].avgTps).toBeCloseTo(10);
    expect(result.totalAvgTps).toBeCloseTo(110);
    expect(result.totalPeakTps).toBeCloseTo(220);
    expect(result.streams[0].shareOfPeak).toBeCloseTo(200 / 220);
  });

  it("computes RPS directly from rate streams for internal systems", () => {
    const result = estimateThroughput({
      trafficMode: "rate",
      peakMultiplier: 3,
      streams: [
        { id: "read", name: "Read", avgTps: 1000 },
        { id: "write", name: "Write", avgTps: 200 }
      ]
    });

    expect(result.totalAvgTps).toBeCloseTo(1200);
    expect(result.totalPeakTps).toBeCloseTo(3600);
    expect(result.audienceLabel).toMatch(/rate/i);
  });

  it("uses defaults-shaped MAU math and optional capacity", () => {
    const result = estimateThroughput({
      ...THROUGHPUT_DEFAULTS,
      trafficMode: "audience",
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
    expect(result.nodesNeeded).toBe(Math.ceil(result.totalPeakTps / 1000));
    expect(result.avgBandwidthLabel).not.toBe("n/a");
  });
});



describe("layer snapshots", () => {
  it("creates, upserts, and removes saved layer summaries", () => {
    const estimate = estimateThroughput({
      trafficMode: "rate",
      peakMultiplier: 3,
      nodeCapacityTps: 1000,
      streams: [{ id: "total", name: "Total", avgTps: 5000 }]
    });

    const snap = createLayerSnapshot({
      investigationId: "database",
      layerLabel: "Databases",
      systemLabel: "Aurora",
      unitLabel: "instance",
      estimate,
      trafficBrief: "5K RPS · peak 3×"
    });

    expect(snap.headline).toMatch(/5K avg/i);
    expect(snap.nodesLabel).toMatch(/instance/i);

    let saved = upsertLayerSnapshot([], snap);
    expect(saved).toHaveLength(1);

    const updated = createLayerSnapshot({
      investigationId: "database",
      layerLabel: "Databases",
      systemLabel: "DynamoDB",
      estimate: estimateThroughput({
        trafficMode: "rate",
        peakMultiplier: 3,
        streams: [{ id: "total", name: "Total", avgTps: 10_000 }]
      }),
      trafficBrief: "10K RPS"
    });
    saved = upsertLayerSnapshot(saved, updated);
    expect(saved).toHaveLength(1);
    expect(saved[0].systemLabel).toBe("DynamoDB");

    saved = removeLayerSnapshot(saved, "database");
    expect(saved).toHaveLength(0);
  });
});

describe("format helpers", () => {
  it("formats RPS and bandwidth compactly", () => {
    expect(formatTps(0)).toBe("0");
    expect(formatTps(12.34)).toMatch(/12/);
    expect(formatTps(12_500)).toMatch(/K/);
    expect(formatBandwidth(0)).toBe("n/a");
    expect(formatBandwidth(2048)).toMatch(/KB\/s/);
  });
});
