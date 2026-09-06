import {
  AVAILABILITY_NUMBERS,
  COMMON_FORMULAS,
  ESTIMATION_TIPS,
  LATENCY_NUMBERS,
  LATENCY_TAKEAWAYS,
  POWER_OF_TWO,
  TIME_UNITS,
  WORKED_EXAMPLE
} from "./cheatSheet.js";

/**
 * Fill the cheat-sheet tables already present in the reference template.
 * @param {HTMLElement} root
 */
export function mountReferenceCheatSheet(root) {
  fillTable(
    root.querySelector("#powerOfTwoBody"),
    POWER_OF_TWO,
    (row) => [
      `2^${row.power}`,
      row.approx,
      row.name,
      row.short
    ]
  );

  fillTable(
    root.querySelector("#latencyBody"),
    LATENCY_NUMBERS,
    (row) => [row.op, row.time]
  );

  fillTable(
    root.querySelector("#timeUnitsBody"),
    TIME_UNITS,
    (row) => [row.unit, row.equals]
  );

  fillTable(
    root.querySelector("#latencyTakeawaysBody"),
    LATENCY_TAKEAWAYS,
    (row) => [row.rule]
  );

  fillTable(
    root.querySelector("#availabilityBody"),
    AVAILABILITY_NUMBERS,
    (row) => [row.availability, row.perDay, row.perMonth, row.perYear]
  );

  fillTable(
    root.querySelector("#formulasBody"),
    COMMON_FORMULAS,
    (row) => [row.item, row.formula]
  );

  fillTable(
    root.querySelector("#tipsBody"),
    ESTIMATION_TIPS,
    (row) => [row.tip, row.why]
  );

  fillTable(
    root.querySelector("#workedExampleBody"),
    WORKED_EXAMPLE,
    (row) => [row.step, row.example]
  );

  return {
    destroy() {}
  };
}

/**
 * @template T
 * @param {Element | null} tbody
 * @param {ReadonlyArray<T>} rows
 * @param {(row: T) => string[]} cells
 */
function fillTable(tbody, rows, cells) {
  if (!(tbody instanceof HTMLTableSectionElement)) return;
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of cells(row)) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    fragment.appendChild(tr);
  }
  tbody.replaceChildren(fragment);
}
