/**
 * Throughput envelope math.
 * App-server investigations: DAU/MAU × actions/user/day → TPS.
 * Databases / cache / queues: direct average rate (RPS, ops/s, msg/s) → TPS.
 * Pure functions only (no DOM).
 */

export const SECONDS_PER_DAY = 86_400;

/**
 * @typedef {'dau' | 'mau'} AudienceMode
 * @typedef {'audience' | 'rate'} TrafficMode
 * @typedef {'app' | 'database' | 'cache' | 'queue'} InvestigationId
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   actionsPerUserPerDay?: number,
 *   avgTps?: number
 * }} TrafficStream
 *
 * @typedef {{
 *   mode: TrafficMode,
 *   audienceLabel: string,
 *   streamsTitle: string,
 *   streamsHelper: string,
 *   rateColumn: string,
 *   rateSuffix: string,
 *   rateLabel: string,
 *   templates: ReadonlyArray<{ name: string, actionsPerUserPerDay?: number, avgTps?: number }>,
 *   defaultStreams: ReadonlyArray<TrafficStream>
 * }} TrafficFocusConfig
 */

/** @type {ReadonlyArray<{ label: string, value: number, hint?: string }>} */
export const AUDIENCE_PRESETS = Object.freeze([
  Object.freeze({ label: "100K", value: 100_000 }),
  Object.freeze({ label: "1M", value: 1_000_000 }),
  Object.freeze({ label: "10M", value: 10_000_000 }),
  Object.freeze({ label: "50M", value: 50_000_000 }),
  Object.freeze({ label: "100M", value: 100_000_000 }),
  Object.freeze({ label: "1B", value: 1_000_000_000 }),
  Object.freeze({ label: "10B", value: 10_000_000_000 })
]);

/** @type {ReadonlyArray<{ label: string, value: number, hint?: string }>} */
export const PEAK_PRESETS = Object.freeze([
  Object.freeze({ label: "2×", value: 2, hint: "Mild peak" }),
  Object.freeze({ label: "3×", value: 3, hint: "Typical consumer peak" }),
  Object.freeze({ label: "5×", value: 5, hint: "Spiky / launch day" }),
  Object.freeze({ label: "10×", value: 10, hint: "Viral / flash sale" })
]);

/** App-server stream templates (actions/user/day). */
export const STREAM_TEMPLATES = Object.freeze([
  Object.freeze({ name: "Read", actionsPerUserPerDay: 40 }),
  Object.freeze({ name: "Write", actionsPerUserPerDay: 4 }),
  Object.freeze({ name: "Search", actionsPerUserPerDay: 8 }),
  Object.freeze({ name: "Fanout", actionsPerUserPerDay: 12 })
]);

/** Shared avg-rate suggestions for databases / cache / queues (not DAU). */
export const RATE_PRESETS = Object.freeze([
  Object.freeze({ label: "100", value: 100 }),
  Object.freeze({ label: "1K", value: 1_000 }),
  Object.freeze({ label: "5K", value: 5_000 }),
  Object.freeze({ label: "10K", value: 10_000 }),
  Object.freeze({ label: "20K", value: 20_000 }),
  Object.freeze({ label: "50K", value: 50_000 }),
  Object.freeze({ label: "100K", value: 100_000 }),
  Object.freeze({ label: "500K", value: 500_000 }),
  Object.freeze({ label: "1M", value: 1_000_000 })
]);

/**
 * Traffic input copy + defaults per investigation.
 * DAU/MAU only applies to app servers / edge; internal systems use rate units.
 * @type {Readonly<Record<InvestigationId, TrafficFocusConfig>>}
 */
export const TRAFFIC_BY_FOCUS = Object.freeze({
  app: Object.freeze({
    mode: /** @type {TrafficMode} */ ("audience"),
    audienceLabel: "Audience",
    streamsTitle: "Edge traffic streams",
    streamsHelper:
      "DAU/MAU and actions/user/day — for app servers and load balancers.",
    rateColumn: "Actions/user/day",
    rateSuffix: "/user/day",
    rateLabel: "Avg RPS",
    templates: STREAM_TEMPLATES,
    defaultStreams: Object.freeze([
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
  }),
  database: Object.freeze({
    mode: /** @type {TrafficMode} */ ("rate"),
    audienceLabel: "Avg RPS",
    streamsTitle: "Query split (optional)",
    streamsHelper:
      "Enter plain avg RPS/TPS above — not DAU/MAU. Optionally split read/write below.",
    rateColumn: "Avg RPS",
    rateSuffix: "RPS",
    rateLabel: "Avg RPS",
    templates: Object.freeze([
      Object.freeze({ name: "Read", avgTps: 5_000 }),
      Object.freeze({ name: "Write", avgTps: 500 }),
      Object.freeze({ name: "Query", avgTps: 1_000 })
    ]),
    defaultStreams: Object.freeze([
      Object.freeze({ id: "total", name: "Total", avgTps: 5_000 })
    ])
  }),
  cache: Object.freeze({
    mode: /** @type {TrafficMode} */ ("rate"),
    audienceLabel: "Avg TPS",
    streamsTitle: "Ops split (optional)",
    streamsHelper:
      "Enter plain avg ops/s above — not DAU/MAU. Optionally split GET/SET below.",
    rateColumn: "Avg ops/s",
    rateSuffix: "ops/s",
    rateLabel: "Avg ops/s",
    templates: Object.freeze([
      Object.freeze({ name: "GET", avgTps: 20_000 }),
      Object.freeze({ name: "SET", avgTps: 2_000 }),
      Object.freeze({ name: "DELETE", avgTps: 200 })
    ]),
    defaultStreams: Object.freeze([
      Object.freeze({ id: "total", name: "Total", avgTps: 20_000 })
    ])
  }),
  queue: Object.freeze({
    mode: /** @type {TrafficMode} */ ("rate"),
    audienceLabel: "Avg TPS",
    streamsTitle: "Message split (optional)",
    streamsHelper:
      "Enter plain avg msg/s above — not DAU/MAU. Optionally split produce/consume below.",
    rateColumn: "Avg msg/s",
    rateSuffix: "msg/s",
    rateLabel: "Avg msg/s",
    templates: Object.freeze([
      Object.freeze({ name: "Produce", avgTps: 3_000 }),
      Object.freeze({ name: "Consume", avgTps: 3_000 }),
      Object.freeze({ name: "Retry", avgTps: 100 })
    ]),
    defaultStreams: Object.freeze([
      Object.freeze({ id: "total", name: "Total", avgTps: 5_000 })
    ])
  })
});

export const THROUGHPUT_DEFAULTS = Object.freeze({
  audienceMode: /** @type {AudienceMode} */ ("dau"),
  audienceCount: 1_000_000,
  activeDaysPerMonth: 30,
  peakMultiplier: 3,
  payloadBytes: 0,
  nodeCapacityTps: 0,
  trafficMode: /** @type {TrafficMode} */ ("audience"),
  streams: TRAFFIC_BY_FOCUS.app.defaultStreams
});

/**
 * @param {string | null | undefined} investigationId
 * @returns {TrafficFocusConfig | null}
 */
export function trafficConfigForFocus(investigationId) {
  if (!investigationId || !(investigationId in TRAFFIC_BY_FOCUS)) return null;
  return TRAFFIC_BY_FOCUS[/** @type {InvestigationId} */ (investigationId)];
}

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
 *   trafficMode?: TrafficMode,
 *   audienceMode?: AudienceMode,
 *   audienceCount?: number,
 *   activeDaysPerMonth?: number,
 *   peakMultiplier: number,
 *   payloadBytes?: number,
 *   nodeCapacityTps?: number,
 *   streams: Array<TrafficStream>
 * }} input
 */
export function estimateThroughput({
  trafficMode = "audience",
  audienceMode = THROUGHPUT_DEFAULTS.audienceMode,
  audienceCount = THROUGHPUT_DEFAULTS.audienceCount,
  activeDaysPerMonth = THROUGHPUT_DEFAULTS.activeDaysPerMonth,
  peakMultiplier,
  payloadBytes = 0,
  nodeCapacityTps = 0,
  streams
}) {
  const peak = Math.max(0, Number(peakMultiplier) || 0);
  const payload = Math.max(0, Number(payloadBytes) || 0);
  const nodeCap = Math.max(0, Number(nodeCapacityTps) || 0);
  const mode = trafficMode === "rate" ? "rate" : "audience";

  const dailyUsers =
    mode === "audience"
      ? dailyActiveUsers({
          audienceMode,
          audienceCount,
          activeDaysPerMonth
        })
      : 0;

  const safeStreams = Array.isArray(streams) ? streams : [];
  const streamRows = safeStreams.map((stream) => {
    let avgTps = 0;
    let actionsPerUserPerDay = 0;

    if (mode === "rate") {
      avgTps = Math.max(0, Number(stream.avgTps) || 0);
    } else {
      actionsPerUserPerDay = Math.max(
        0,
        Number(stream.actionsPerUserPerDay) || 0
      );
      avgTps = (dailyUsers * actionsPerUserPerDay) / SECONDS_PER_DAY;
    }

    const peakTps = avgTps * peak;
    return {
      id: stream.id,
      name: stream.name || "Stream",
      actionsPerUserPerDay,
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
    shareOfPeak: totalPeakTps > 0 ? row.peakTps / totalPeakTps : 0
  }));

  const nodesNeeded =
    nodeCap > 0 ? Math.ceil(totalPeakTps / nodeCap) : null;

  const audienceLabel =
    mode === "rate"
      ? "Direct rate input"
      : audienceMode === "mau"
        ? `${formatAudience(audienceCount)} MAU ÷ 30 → ~${formatAudience(dailyUsers)} daily`
        : `${formatAudience(dailyUsers)} DAU`;

  const summaryLine =
    mode === "rate"
      ? `${formatTps(totalAvgTps)} avg TPS · peak ${peak}×`
      : `${audienceLabel} · ${totalActionsPerUserPerDay} actions/user/day · peak ${peak}×`;

  return {
    trafficMode: mode,
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
    summaryLine
  };
}


/**
 * Build a pinned summary for one investigation layer.
 * Re-saving the same investigationId replaces the previous pin.
 *
 * @param {{
 *   investigationId: string,
 *   layerLabel: string,
 *   systemLabel?: string | null,
 *   unitLabel?: string | null,
 *   estimate: ReturnType<typeof estimateThroughput>,
 *   trafficBrief?: string
 * }} input
 */
export function createLayerSnapshot({
  investigationId,
  layerLabel,
  systemLabel = null,
  unitLabel = null,
  estimate,
  trafficBrief = ""
}) {
  const nodesNeeded = estimate.nodesNeeded;
  const unit = unitLabel || "node";
  const nodesLabel =
    nodesNeeded == null
      ? null
      : `${nodesNeeded.toLocaleString("en-US")} ${unit}${nodesNeeded === 1 ? "" : "s"} @ peak`;

  const parts = [
    `${estimate.totalAvgTpsLabel} avg`,
    `${estimate.totalPeakTpsLabel} peak TPS`
  ];
  if (nodesLabel) parts.push(nodesLabel);

  return {
    id: investigationId,
    investigationId,
    layerLabel,
    systemLabel: systemLabel || null,
    trafficBrief: trafficBrief || estimate.summaryLine,
    avgTpsLabel: estimate.totalAvgTpsLabel,
    peakTpsLabel: estimate.totalPeakTpsLabel,
    nodesLabel,
    headline: parts.join(" · "),
    summaryLine: estimate.summaryLine
  };
}

/**
 * Upsert a snapshot into the saved list (one pin per investigation layer).
 * @param {Array<ReturnType<typeof createLayerSnapshot>>} saved
 * @param {ReturnType<typeof createLayerSnapshot>} snapshot
 */
export function upsertLayerSnapshot(saved, snapshot) {
  const list = Array.isArray(saved) ? [...saved] : [];
  const index = list.findIndex(
    (item) => item.investigationId === snapshot.investigationId
  );
  if (index >= 0) list[index] = snapshot;
  else list.push(snapshot);
  return list;
}

/**
 * Remove a saved layer pin by investigation id.
 * @param {Array<ReturnType<typeof createLayerSnapshot>>} saved
 * @param {string} investigationId
 */
export function removeLayerSnapshot(saved, investigationId) {
  return (Array.isArray(saved) ? saved : []).filter(
    (item) => item.investigationId !== investigationId
  );
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
