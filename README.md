# Back of the Envelope Math

Interactive back-of-the-envelope calculators for storage sizing and capacity planning.

**Live site:** https://kbibireddy.github.io/envelope-math/

## Calculators

| Product | Status |
| --- | --- |
| **Sizing estimation** | Available |
| **Throughput** | Available |
| **Cheat sheet** | Available |

### Sizing estimation

| Topic | Detail |
| --- | --- |
| Input | Paste sample record / payload text — UTF-8 size updates live |
| Units | bytes → PB; higher units drop when value would be &lt; `0.001` |
| Scale | Record multiplier presets (1 → 1B) plus custom counts |
| Growth | YoY bars for mature → hypergrowth, or custom % |
| Output | Five-year compounded storage projection |

### Throughput

| Topic | Detail |
| --- | --- |
| Scope | One layer at a time: app servers, databases, cache, or queues |
| App servers | DAU/MAU + actions/user/day (edge / load-balancer traffic) |
| Internal systems | Direct rate inputs (RPS, ops/s, or msg/s) |
| Peak | Avg × peak multiplier |
| Capacity | Match envelopes; optional payload → bandwidth and units @ peak |

### Cheat sheet

Interview reference tables verified against [ByteByteGo back-of-the-envelope estimation](https://bytebytego.com/courses/system-design-interview/back-of-the-envelope-estimation):

| Table | Contents |
| --- | --- |
| Power of two | KB → PB mental math |
| Latency | Classic Dean / High Scalability operation times |
| Availability | Downtime for 2–6 nines |
| Formulas | QPS, storage, servers, bandwidth |
| Tips | Round, label units, write assumptions |
| Worked example | Twitter-style QPS + media storage |

Everything runs in the browser. No payload text is uploaded or stored.

## Architecture

```
src/
  shared/          # pure math (storage units, growth, presets) — no DOM
  ui/              # reusable widgets (chips, unit grid, projection table)
  calculators/
    registry.js    # product catalog + mount hooks
    sizing/        # storage footprint (model + view)
    throughput/    # investigation-scoped traffic → avg/peak TPS (model + view)
    reference/     # ByteByteGo-aligned cheat sheet tables
  app.js           # shell: nav + host; swaps calculators without reloads
  styles/main.css
```

**Adding a calculator**

1. Create `src/calculators/<id>/{model.js, view.js}` — keep math in `model.js`, DOM in `view.js`
2. Reuse `src/shared/*` and `src/ui/*` where possible
3. Register the product in `src/calculators/registry.js`
4. Add `<template id="tpl-<id}">` markup in `index.html`

## Development

Requires Node.js 22 or later.

```bash
yarn install
yarn dev
```

## Verification

```bash
yarn check
```

Every push to `main` runs tests with coverage, builds the site, and deploys to GitHub Pages.
