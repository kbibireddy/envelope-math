import { mountSizingCalculator } from "./sizing/view.js";
import { mountThroughputCalculator } from "./throughput/view.js";
import { mountReferenceCheatSheet } from "./reference/view.js";

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
      "Pick a layer (app, database, cache, or queue). App servers use DAU/MAU; internal systems use avg RPS.",
    mount: mountThroughputCalculator
  }),
  Object.freeze({
    id: "reference",
    label: "Cheat sheet",
    status: "available",
    description:
      "Power of two, latency, availability nines, and estimation formulas. Interview reference tables.",
    mount: mountReferenceCheatSheet
  })
]);

export function getCalculator(id) {
  return CALCULATORS.find((product) => product.id === id) ?? null;
}

/** Prefer the first available product; throw if the registry is empty of mounts. */
export function getDefaultCalculator() {
  const available = CALCULATORS.find(
    (product) => product.status === "available"
  );
  if (!available) {
    throw new Error("No available calculators are registered");
  }
  return available;
}
