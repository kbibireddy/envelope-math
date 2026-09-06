import { mountSizingCalculator } from "./sizing/view.js";
import { mountThroughputCalculator } from "./throughput/view.js";

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
    status: "available",
    description:
      "From DAU/MAU and per-use-case actions, estimate average and peak TPS — plus bandwidth and nodes.",
    mount: mountThroughputCalculator
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
