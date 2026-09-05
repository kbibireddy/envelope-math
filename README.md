# Back of the Envelope Math

Interactive back-of-the-envelope calculators for storage sizing and capacity planning.

**Live site:** https://kbibireddy.github.io/envelope-math/

## Calculators

| Product | Status |
| --- | --- |
| **Sizing estimation** | Available |
| Throughput | Planned |
| Cost envelope | Planned |

### Sizing estimation

- Paste sample record / payload text and see UTF-8 size update live
- Read the footprint in bytes, KB, MB, GB, TB, and PB
- Higher units drop automatically when the value would sit below `0.001` (noise past three decimal zeros)
- Scale with a record multiplier — presets from 1 through 1B, plus custom counts
- Apply YoY data growth with recommended bars for mature → hypergrowth systems, or enter a custom percent
- Review a five-year compounded storage projection

Everything runs in the browser. No payload text is uploaded or stored.

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
