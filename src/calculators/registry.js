/**
 * Calculator product registry.
 *
 * To add a calculator:
 * 1. Create src/calculators/<id>/{model.js, view.js}
 * 2. Register it here (id, label, status, mount)
 * 3. Add <template id="tpl-<id>"> markup in index.html
 */

import { mountSizingCalculator } from "./sizing/view.js";

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   status: "available" | "planned",
 *   description?: string,
 *   mount?: (root: HTMLElement) => { destroy?: () => void }
 * }} CalculatorProduct
 */

/** @type {ReadonlyArray<CalculatorProduct>} */
export const CALCULATORS = Object.freeze([
  Object.freeze({
    id: "sizing",
    label: "Sizing estimation",
    status: "available",
    description:
      "Paste a sample record, scale it across how many you’ll store, and layer on year-over-year growth.",
    mount: mountSizingCalculator
  }),
  Object.freeze({
    id: "throughput",
    label: "Throughput",
    status: "planned",
    description: "Back-of-the-envelope QPS, bandwidth, and concurrency sketches."
  }),
  Object.freeze({
    id: "cost",
    label: "Cost envelope",
    status: "planned",
    description: "Rough storage and transfer cost envelopes from growth projections."
  })
]);

export function getCalculator(id) {
  return CALCULATORS.find((product) => product.id === id) ?? null;
}

/** Prefer the first available product; throw if the registry is empty of mounts. */
export function getDefaultCalculator() {
  const available = CALCULATORS.find((product) => product.status === "available");
  if (!available) {
    throw new Error("No available calculators are registered");
  }
  return available;
}
