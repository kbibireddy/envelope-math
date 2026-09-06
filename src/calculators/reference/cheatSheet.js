/**
 * Back-of-the-envelope cheat sheet numbers.
 * Aligned with ByteByteGo / Jeff Dean style interview references —
 * order-of-magnitude aids, not lab benchmarks.
 */

/** @type {ReadonlyArray<{ power: number, approx: string, name: string, short: string }>} */
export const POWER_OF_TWO = Object.freeze([
  Object.freeze({ power: 10, approx: "1 thousand", name: "Kilobyte", short: "KB" }),
  Object.freeze({ power: 20, approx: "1 million", name: "Megabyte", short: "MB" }),
  Object.freeze({ power: 30, approx: "1 billion", name: "Gigabyte", short: "GB" }),
  Object.freeze({ power: 40, approx: "1 trillion", name: "Terabyte", short: "TB" }),
  Object.freeze({ power: 50, approx: "1 quadrillion", name: "Petabyte", short: "PB" })
]);

/** @type {ReadonlyArray<{ op: string, time: string, note?: string }>} */
export const LATENCY_NUMBERS = Object.freeze([
  Object.freeze({ op: "L1 cache reference", time: "0.5 ns" }),
  Object.freeze({ op: "Branch mispredict", time: "5 ns" }),
  Object.freeze({ op: "L2 cache reference", time: "7 ns" }),
  Object.freeze({ op: "Mutex lock/unlock", time: "100 ns" }),
  Object.freeze({ op: "Main memory reference", time: "100 ns" }),
  Object.freeze({
    op: "Compress 1 KB (Snappy/Zippy-class)",
    time: "10 µs"
  }),
  Object.freeze({
    op: "Send 2 KB over 1 Gbps network",
    time: "20 µs"
  }),
  Object.freeze({ op: "Read 1 MB sequentially from memory", time: "250 µs" }),
  Object.freeze({
    op: "Round trip within same datacenter",
    time: "500 µs"
  }),
  Object.freeze({ op: "Disk seek", time: "10 ms" }),
  Object.freeze({
    op: "Read 1 MB sequentially from network",
    time: "10 ms"
  }),
  Object.freeze({ op: "Read 1 MB sequentially from disk", time: "30 ms" }),
  Object.freeze({
    op: "Send packet CA → Netherlands → CA",
    time: "150 ms"
  })
]);

/** @type {ReadonlyArray<{ rule: string }>} */
export const LATENCY_TAKEAWAYS = Object.freeze([
  Object.freeze({ rule: "Memory is fast; disk is slow — avoid seeks when you can." }),
  Object.freeze({ rule: "Simple compression is cheap — compress before WAN transfer." }),
  Object.freeze({ rule: "Same-DC RTT ≈ 0.5 ms; cross-region is tens–hundreds of ms." }),
  Object.freeze({ rule: "Sequential reads beat random I/O by orders of magnitude." })
]);

/** @type {ReadonlyArray<{ availability: string, perDay: string, perMonth: string, perYear: string }>} */
export const AVAILABILITY_NUMBERS = Object.freeze([
  Object.freeze({
    availability: "99% (2 nines)",
    perDay: "14.4 min",
    perMonth: "7.3 h",
    perYear: "3.65 d"
  }),
  Object.freeze({
    availability: "99.9% (3 nines)",
    perDay: "1.44 min",
    perMonth: "43.8 min",
    perYear: "8.77 h"
  }),
  Object.freeze({
    availability: "99.99% (4 nines)",
    perDay: "8.64 s",
    perMonth: "4.38 min",
    perYear: "52.6 min"
  }),
  Object.freeze({
    availability: "99.999% (5 nines)",
    perDay: "864 ms",
    perMonth: "26.3 s",
    perYear: "5.26 min"
  }),
  Object.freeze({
    availability: "99.9999% (6 nines)",
    perDay: "86.4 ms",
    perMonth: "2.63 s",
    perYear: "31.6 s"
  })
]);

/** @type {ReadonlyArray<{ item: string, formula: string }>} */
export const COMMON_FORMULAS = Object.freeze([
  Object.freeze({
    item: "Avg RPS",
    formula: "daily_actions ÷ 86,400"
  }),
  Object.freeze({
    item: "Peak RPS",
    formula: "avg_RPS × peak_multiplier (often 2×–5×)"
  }),
  Object.freeze({
    item: "DAU from MAU",
    formula: "MAU ÷ 30 (rough interview default)"
  }),
  Object.freeze({
    item: "Storage / day",
    formula: "DAU × actions/user/day × bytes/action"
  }),
  Object.freeze({
    item: "Storage over years",
    formula: "daily_bytes × 365 × years (× replication)"
  }),
  Object.freeze({
    item: "Servers / tasks",
    formula: "ceil(peak_RPS ÷ RPS_per_unit)"
  }),
  Object.freeze({
    item: "Bandwidth",
    formula: "RPS × payload_bytes"
  }),
  Object.freeze({
    item: "Seconds per day / year",
    formula: "86,400 s/day · ~π×10⁷ s/year (~31.5M)"
  })
]);

/** @type {ReadonlyArray<{ tip: string, why: string }>} */
export const ESTIMATION_TIPS = Object.freeze([
  Object.freeze({
    tip: "Round aggressively",
    why: "99987 / 9.1 → ~100,000 / 10. Precision is not the point."
  }),
  Object.freeze({
    tip: "Write assumptions",
    why: "DAU %, actions/day, payload size, retention — revisit them later."
  }),
  Object.freeze({
    tip: "Label every unit",
    why: "“5” is ambiguous; “5 MB” or “5k RPS” removes confusion."
  }),
  Object.freeze({
    tip: "Practice the usual asks",
    why: "RPS, peak RPS, storage, cache size, #servers — same toolkit each time."
  }),
  Object.freeze({
    tip: "Process > exact answer",
    why: "Interviewers score how you decompose, not a perfect spreadsheet."
  })
]);

/** @type {ReadonlyArray<{ step: string, example: string }>} */
export const WORKED_EXAMPLE = Object.freeze([
  Object.freeze({
    step: "MAU",
    example: "300M monthly active users"
  }),
  Object.freeze({
    step: "DAU",
    example: "300M × 50% = 150M"
  }),
  Object.freeze({
    step: "Avg tweet RPS",
    example: "150M × 2 / 86,400 ≈ 3.5k"
  }),
  Object.freeze({
    step: "Peak RPS",
    example: "≈ 2 × avg ≈ 7k"
  }),
  Object.freeze({
    step: "Media / day",
    example: "150M × 2 × 10% × 1 MB ≈ 30 TB/day"
  }),
  Object.freeze({
    step: "5-year media",
    example: "30 TB × 365 × 5 ≈ 55 PB"
  })
]);

/** Time-unit ladder for reading latency tables. */
export const TIME_UNITS = Object.freeze([
  Object.freeze({ unit: "1 ns", equals: "10⁻⁹ s" }),
  Object.freeze({ unit: "1 µs", equals: "10⁻⁶ s = 1,000 ns" }),
  Object.freeze({ unit: "1 ms", equals: "10⁻³ s = 1,000 µs = 1,000,000 ns" })
]);
