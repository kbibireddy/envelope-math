# Back of the Envelope Math

Interactive back-of-the-envelope calculators for storage sizing and capacity planning.

**Live site:** https://kbibireddy.github.io/envelope-math/

## Calculators

| Product | Status |
| --- | --- |
| **Sizing estimation** | Available |
| **Throughput** | Available |

### Sizing estimation

- Paste sample record / payload text and see UTF-8 size update live
- Read the footprint in bytes, KB, MB, GB, TB, and PB
- Higher units drop automatically when the value would sit below `0.001` (noise past three decimal zeros)
- Scale with a record multiplier — presets from 1 through 1B, plus custom counts
- Apply YoY data growth with recommended bars for mature → hypergrowth systems, or enter a custom percent
- Review a five-year compounded storage projection

### Throughput

- Pick one investigation at a time (app servers, databases, cache, or queues)
- App servers: DAU/MAU + actions/user/day (edge / load-balancer traffic)
- Databases / cache / queues: direct rate inputs (RPS, ops/s, or msg/s)
- Apply a peak multiplier, then size the matching system envelopes
- Optional: payload bytes → bandwidth; TPS/unit → units at peak

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
