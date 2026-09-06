/**
 * Capacity envelopes scoped by investigation focus.
 * Assess one layer at a time: app servers, databases, cache, or queues.
 * so options stay relevant to what you are sizing right now.
 *
 * Numbers are conservative back-of-envelope defaults for interviews and planning.
 * not load-test guarantees. Workload shape (payload, query complexity, hot keys)
 * can move these by 2–10×.
 *
 * @typedef {'app' | 'database' | 'cache' | 'queue'} InvestigationId
 *
 * @typedef {{
 *   id: InvestigationId,
 *   label: string,
 *   hint: string
 * }} InvestigationFocus
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   investigation: InvestigationId,
 *   unitLabel: string,
 *   conservativeTps: number,
 *   optimisticTps: number,
 *   connections?: string,
 *   limits: string,
 *   tip: string
 * }} CapacityProfile
 */

/** @type {ReadonlyArray<InvestigationFocus>} */
export const INVESTIGATION_FOCUSES = Object.freeze([
  Object.freeze({
    id: "app",
    label: "App servers",
    hint: "Use DAU or MAU edge traffic to size app servers and load balancers."
  }),
  Object.freeze({
    id: "database",
    label: "Databases",
    hint: "Use query or request RPS to size primary store capacity."
  }),
  Object.freeze({
    id: "cache",
    label: "Cache",
    hint: "Use ops/s on the hot path to size cache capacity."
  }),
  Object.freeze({
    id: "queue",
    label: "Queues",
    hint: "Use messages/s to size produce and consume capacity."
  })
]);

/** @type {ReadonlyArray<CapacityProfile>} */
export const CAPACITY_PROFILES = Object.freeze([
  Object.freeze({
    id: "ecs",
    label: "ECS / app task",
    investigation: "app",
    unitLabel: "task / container",
    conservativeTps: 1_000,
    optimisticTps: 5_000,
    connections:
      "Each task’s DB pool (often 5–20) × task count must fit the database.",
    limits:
      "Light JSON APIs can do more; DB-backed handlers often land ~500–2k RPS/task.",
    tip: "tasks ≈ ceil(peak_RPS / rps_per_task). Always check downstream DB connections."
  }),
  Object.freeze({
    id: "lambda",
    label: "AWS Lambda",
    investigation: "app",
    unitLabel: "concurrent execution",
    conservativeTps: 1_000,
    optimisticTps: 10_000,
    connections:
      "Concurrency is about open work. Each concurrent execution can open a DB connection, so use RDS Proxy or pooling.",
    limits:
      "Account concurrency often starts ~1k/region (soft). Scaling rate is limited; cold starts matter.",
    tip: "concurrency ≈ peak_RPS × latency_seconds (e.g. 5k RPS × 0.1s = 500)."
  }),
  Object.freeze({
    id: "websocket",
    label: "WebSocket gateway",
    investigation: "app",
    unitLabel: "node",
    conservativeTps: 10_000,
    optimisticTps: 50_000,
    connections:
      "Often ~10k–100k concurrent sockets/node depending on memory and fan-out.",
    limits:
      "Separate connection count from message RPS. Fan-out multiplies outbound bandwidth.",
    tip: "Size memory/connections first, then message rate and bandwidth."
  }),
  Object.freeze({
    id: "postgres",
    label: "PostgreSQL",
    investigation: "database",
    unitLabel: "primary node",
    conservativeTps: 5_000,
    optimisticTps: 20_000,
    connections:
      "Default max_connections ≈ 100; practical 200–500 with pooling. Active backends ≈ (cores×2)+1.",
    limits:
      "Simple indexed reads 10k–50k RPS; mixed writes often 5k–10k RPS before you feel pain.",
    tip: "Use PgBouncer/RDS Proxy. Scale reads with replicas; shard when writes or storage dominate."
  }),
  Object.freeze({
    id: "dynamodb",
    label: "DynamoDB",
    investigation: "database",
    unitLabel: "hot partition",
    conservativeTps: 1_000,
    optimisticTps: 3_000,
    connections: "HTTP API. There is no TCP connection pool to size.",
    limits:
      "Hard ceiling ≈ 1k WCU + 3k RCU per partition (≈1 KB write / 4 KB read units). Hot keys throttle even if the table has spare capacity.",
    tip: "Design partition keys for spread. On-demand helps aggregate load, not celebrity keys."
  }),
  Object.freeze({
    id: "cassandra",
    label: "Cassandra",
    investigation: "database",
    unitLabel: "node",
    conservativeTps: 25_000,
    optimisticTps: 100_000,
    connections:
      "Drivers multiplex; often ~1k–2k in-flight requests per connection.",
    limits:
      "Well-partitioned writes scale near-linear with nodes; reads are lower unless cached.",
    tip: "Partition key design is the capacity plan. Avoid unbounded partitions."
  }),
  Object.freeze({
    id: "redis",
    label: "Redis",
    investigation: "cache",
    unitLabel: "instance",
    conservativeTps: 100_000,
    optimisticTps: 500_000,
    connections:
      "Tens of thousands of clients possible; watch CPU (mostly single-threaded commands).",
    limits: "Simple GET/SET 100k–500k RPS per instance; pipelines go higher.",
    tip: "Usually not the first bottleneck. Shard/cluster when memory or CPU saturates."
  }),
  Object.freeze({
    id: "kafka",
    label: "Kafka / MSK",
    investigation: "queue",
    unitLabel: "broker (small msgs)",
    conservativeTps: 50_000,
    optimisticTps: 200_000,
    connections: "Producer/consumer connections are cheap vs byte throughput.",
    limits:
      "Think MB/s first: brokers often hundreds of MB/s; a single partition is often ~5–15 MB/s ingress class.",
    tip: "Convert: RPS ≈ MB/s ÷ message_KB. Size partitions for peak bytes, not only record count."
  }),
  Object.freeze({
    id: "kinesis",
    label: "Kinesis Data Streams",
    investigation: "queue",
    unitLabel: "shard",
    conservativeTps: 1_000,
    optimisticTps: 1_000,
    connections: "API quotas + shard limits; not a connection-pool problem.",
    limits:
      "Classic shard envelope: ~1 MB/s or ~1k records/s in, ~2 MB/s out (confirm current stream mode).",
    tip: "shards ≈ ceil(peak_records_s / 1000) or ceil(peak_MB_s / 1)."
  }),
  Object.freeze({
    id: "sqs",
    label: "SQS",
    investigation: "queue",
    unitLabel: "worker concurrency unit",
    conservativeTps: 3_000,
    optimisticTps: 30_000,
    connections: "HTTPS polling; scale consumers, not broker nodes.",
    limits:
      "Standard queues are very high aggregate; batch up to 10. FIFO is limited per message group.",
    tip: "Throughput ≈ pollers × batch_size / cycle_time. FIFO: watch group-id hot spots."
  })
]);

/**
 * @param {string | null | undefined} id
 * @returns {CapacityProfile | null}
 */
export function getCapacityProfile(id) {
  if (!id) return null;
  return CAPACITY_PROFILES.find((profile) => profile.id === id) ?? null;
}

/**
 * @param {string | null | undefined} investigationId
 * @returns {InvestigationFocus | null}
 */
export function getInvestigationFocus(investigationId) {
  if (!investigationId) return null;
  return (
    INVESTIGATION_FOCUSES.find((focus) => focus.id === investigationId) ?? null
  );
}

/**
 * Systems relevant to one investigation, not the full catalog.
 * @param {string | null | undefined} investigationId
 * @returns {CapacityProfile[]}
 */
export function profilesForInvestigation(investigationId) {
  if (!investigationId) return [];
  return CAPACITY_PROFILES.filter(
    (profile) => profile.investigation === investigationId
  );
}

/**
 * Compare a user-entered RPS/unit against a profile's plausible band.
 * @param {CapacityProfile} profile
 * @param {number} tps
 */
export function assessCapacityInput(profile, tps) {
  const value = Number(tps);
  if (!Number.isFinite(value) || value <= 0) {
    return {
      level: /** @type {'empty'} */ ("empty"),
      message: `Pick ${profile.label} or enter RPS/${profile.unitLabel}.`
    };
  }

  const low = profile.conservativeTps * 0.25;
  const high = profile.optimisticTps * 2;

  if (value < low) {
    return {
      level: /** @type {'low'} */ ("low"),
      message: `Quite low for ${profile.label} (${formatRange(profile)}). Fine if the workload is heavy per request.`
    };
  }
  if (value > high) {
    return {
      level: /** @type {'high'} */ ("high"),
      message: `Above typical ${profile.label} envelope (${formatRange(profile)}). Only use if you have benchmarks.`
    };
  }
  if (value > profile.optimisticTps) {
    return {
      level: /** @type {'optimistic'} */ ("optimistic"),
      message: `Optimistic for ${profile.label}. Best case is ~${formatNumber(profile.optimisticTps)} RPS/${profile.unitLabel}.`
    };
  }
  return {
    level: /** @type {'ok'} */ ("ok"),
    message: `Within envelope for ${profile.label}: ~${formatNumber(profile.conservativeTps)}–${formatNumber(profile.optimisticTps)} RPS/${profile.unitLabel}.`
  };
}

/**
 * @param {CapacityProfile} profile
 */
function formatRange(profile) {
  return `~${formatNumber(profile.conservativeTps)}–${formatNumber(profile.optimisticTps)} RPS/${profile.unitLabel}`;
}

/** @param {number} value */
function formatNumber(value) {
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (value >= 1_000) return `${trim(value / 1_000)}K`;
  return String(Math.round(value));
}

/** @param {number} n */
function trim(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
