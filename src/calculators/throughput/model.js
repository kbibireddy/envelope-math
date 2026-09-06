/**
 * Throughput envelope math — DAU/MAU → avg / peak TPS by use-case stream.
 * Pure functions only (no DOM).
 */

export const SECONDS_PER_DAY = 86_400;

/**
 * @typedef {{ id: string, name: string, actionsPerUserPerDay: number }} TrafficStream
 * @typedef {'dau' | 'mau'} AudienceMode
 */

/** @type {ReadonlyArray<{ label: string, value: number, hint?: string }>} */
export const AUDIENCE_PRESETS = Object.freeze([
  Object.freeze({ label: "10K", value: 10_000 }),
  Object.freeze({ label: "100K", value: 100_000 }),
  Object.freeze({ label: "1M", value: 1_000_000 }),
  Object.freeze({ label: "10M", value: 10_000_000 }),
  Object.freeze({ label: "50M", value: 50_000_000 }),
  Object.freeze({ label: "100M", value: 100_000_000 })
]);

/** @type {ReadonlyArray<{ label: string, value: number, hint?: string }>} */
export const PEAK_PRESETS = Object.freeze([
  Object.freeze({ label: "2×", value: 2, hint: "Mild peak" }),
  Object.freeze({ label: "3×", value: 3, hint: "Typical consumer peak" }),
  Object.freeze({ label: "5×", value: 5, hint: "Spiky / launch day" }),
  Object.freeze({ label: "10×", value: 10, hint: "Viral / flash sale" })
]);

/** Quick-add stream templates. */
export const STREAM_TEMPLATES = Object.freeze([
  Object.freeze({ name: "Read", actionsPerUserPerDay: 40 }),
  Object.freeze({ name: "Write", actionsPerUserPerDay: 4 }),
  Object.freeze({ name: "Search", actionsPerUserPerDay: 8 }),
  Object.freeze({ name: "Fanout", actionsPerUserPerDay: 12 })
]);

export const THROUGHPUT_DEFAULTS = Object.freeze({
  audienceMode: /** @type {AudienceMode} */ ("dau"),
  audienceCount: 1_000_000,
  activeDaysPerMonth: 30,
  peakMultiplier: 3,
  payloadBytes: 0,
  nodeCapacityTps: 0,
  streams: Object.freeze([
    Object.freeze({
      id: "read",
      name: "Read",
      actionsPerUserPerDay: 40
    }),
    Object.freeze({
      id: "write",
      name: "Write",
      actionsPerUserPerDay: 4
    })
  ])
});

/**
 * Convert audience input into an effective daily-active count.
 * @param {{
 *   audienceMode: AudienceMode,
 *   audienceCount: number,
 *   activeDaysPerMonth?: number
 * }} input
 */
export function dailyActiveUsers({
  audienceMode,
  audienceCount,
  activeDaysPerMonth = 30
}) {
  const count = Math.max(0, Number(audienceCount) || 0);
  if (audienceMode === "mau") {
    const days = Math.max(1, Number(activeDaysPerMonth) || 30);
    return count / days;
  }
  return count;
}

/**
 * Format a TPS value for display (compact, readable).
 * @param {number} tps
 */
export function formatTps(tps) {
  const value = Number(tps);
  if (!Number.isFinite(value) || value === 0) return "0";
  const abs = Math.abs(value);
  if (abs < 0.01) return value.toPrecision(2);
  if (abs < 10) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  }
  if (abs < 1000) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  if (abs < 1_000_000) {
    return `${(value / 1000).toLocaleString("en-US", {
      maximumFractionDigits: 1
    })}K`;
  }
  return `${(value / 1_000_000).toLocaleString("en-US", {
    maximumFractionDigits: 2
  })}M`;
}

/**
 * Format bytes/sec as a short bandwidth label.
 * @param {number} bytesPerSecond
 */
export function formatBandwidth(bytesPerSecond) {
  const bps = Number(bytesPerSecond);
  if (!Number.isFinite(bps) || bps <= 0) return "—";
  const units = [
    { label: "B/s", div: 1 },
    { label: "KB/s", div: 1024 },
    { label: "MB/s", div: 1024 ** 2 },
    { label: "GB/s", div: 1024 ** 3 }
  ];
  let unit = units[0];
  for (const candidate of units) {
    if (bps / candidate.div >= 1) unit = candidate;
  }
  const value = bps / unit.div;
  const display =
    value >= 100
      ? value.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${display} ${unit.label}`;
}

let streamSeq = 0;

/** @param {string} [prefix] */
export function nextStreamId(prefix = "stream") {
  streamSeq += 1;
  return `${prefix}-${streamSeq}`;
}

/**
 * Pure throughput estimate.
 *
 * @param {{
 *   audienceMode: AudienceMode,
 *   audienceCount: number,
 *   activeDaysPerMonth?: number,
 *   peakMultiplier: number,
 *   payloadBytes?: number,
 *   nodeCapacityTps?: number,
 *   streams: Array<TrafficStream>
 * }} input
 */
export function estimateThroughput({
  audienceMode,
  audienceCount,
  activeDaysPerMonth = THROUGHPUT_DEFAULTS.activeDaysPerMonth,
  peakMultiplier,
  payloadBytes = 0,
  nodeCapacityTps = 0,
  streams
}) {
  const dailyUsers = dailyActiveUsers({
    audienceMode,
    audienceCount,
    activeDaysPerMonth
  });
  const peak = Math.max(0, Number(peakMultiplier) || 0);
  const payload = Math.max(0, Number(payloadBytes) || 0);
  const nodeCap = Math.max(0, Number(nodeCapacityTps) || 0);

  const safeStreams = Array.isArray(streams) ? streams : [];
  const streamRows = safeStreams.map((stream) => {
    const actionsPerUserPerDay = Math.max(
      0,
      Number(stream.actionsPerUserPerDay) || 0
    );
    const actionsPerDay = dailyUsers * actionsPerUserPerDay;
    const avgTps = actionsPerDay / SECONDS_PER_DAY;
    const peakTps = avgTps * peak;
    return {
      id: stream.id,
      name: stream.name || "Stream",
      actionsPerUserPerDay,
      actionsPerDay,
      avgTps,
      peakTps,
      avgBandwidthBps: avgTps * payload,
      peakBandwidthBps: peakTps * payload
    };
  });

  const totalAvgTps = streamRows.reduce((sum, row) => sum + row.avgTps, 0);
  const totalPeakTps = streamRows.reduce((sum, row) => sum + row.peakTps, 0);
  const totalActionsPerUserPerDay = streamRows.reduce(
    (sum, row) => sum + row.actionsPerUserPerDay,
    0
  );

  const rowsWithShare = streamRows.map((row) => ({
    ...row,
    shareOfPeak:
      totalPeakTps > 0 ? row.peakTps / totalPeakTps : 0
  }));

  const nodesNeeded =
    nodeCap > 0 ? Math.ceil(totalPeakTps / nodeCap) : null;

  const audienceLabel =
    audienceMode === "mau"
      ? `${formatAudience(audienceCount)} MAU ÷ 30 → ~${formatAudience(dailyUsers)} daily`
      : `${formatAudience(dailyUsers)} DAU`;

  return {
    audienceMode,
    audienceCount,
    dailyUsers,
    activeDaysPerMonth,
    peakMultiplier: peak,
    payloadBytes: payload,
    nodeCapacityTps: nodeCap,
    audienceLabel,
    totalActionsPerUserPerDay,
    totalAvgTps,
    totalPeakTps,
    totalAvgTpsLabel: formatTps(totalAvgTps),
    totalPeakTpsLabel: formatTps(totalPeakTps),
    avgBandwidthBps: totalAvgTps * payload,
    peakBandwidthBps: totalPeakTps * payload,
    avgBandwidthLabel: formatBandwidth(totalAvgTps * payload),
    peakBandwidthLabel: formatBandwidth(totalPeakTps * payload),
    nodesNeeded,
    streams: rowsWithShare,
    summaryLine: `${audienceLabel} · ${totalActionsPerUserPerDay} actions/user/day · peak ${peak}×`
  };
}

/**
 * @param {number} count
 */
function formatAudience(count) {
  const value = Number(count);
  if (!Number.isFinite(value) || value === 0) return "0";
  if (value >= 1_000_000_000) {
    return `${trimNum(value / 1_000_000_000)}B`;
  }
  if (value >= 1_000_000) return `${trimNum(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trimNum(value / 1_000)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** @param {number} n */
function trimNum(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
