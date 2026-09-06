import { clear } from "./dom.js";

/**
 * Render a compact size unit grid. Skips DOM work when values are unchanged.
 */
export function renderUnitGrid(container, units, { animate = true } = {}) {
  const fingerprint = units.map((u) => `${u.key}:${u.display}`).join("|");
  if (container.dataset.fingerprint === fingerprint) return;
  container.dataset.fingerprint = fingerprint;

  clear(container);
  const fragment = document.createDocumentFragment();

  for (const unit of units) {
    const cell = document.createElement("div");
    cell.className = "unit-cell";

    const label = document.createElement("div");
    label.className = "u-label";
    label.textContent = unit.label;

    const value = document.createElement("div");
    value.className = "u-value";
    value.textContent = unit.display;

    cell.append(label, value);
    fragment.appendChild(cell);
  }

  container.appendChild(fragment);

  if (!animate) return;

  const cells = container.querySelectorAll(".unit-cell");
  requestAnimationFrame(() => {
    cells.forEach((cell) => cell.classList.add("flash"));
  });
  window.setTimeout(() => {
    cells.forEach((cell) => cell.classList.remove("flash"));
  }, 280);
}

/**
 * @param {HTMLTableCellElement} cell
 * @param {string} display
 * @param {string} unitLabel
 * @param {{ dim?: boolean, primary?: boolean }} flags
 */
function fillSizeCell(cell, display, unitLabel, flags) {
  const qty = document.createElement("span");
  qty.className = "qty";
  qty.textContent = display;

  const unit = document.createElement("span");
  unit.className = "unit-suffix";
  unit.textContent = ` ${unitLabel}`;

  cell.append(qty, unit);
  if (flags.dim) cell.classList.add("is-dim");
  if (flags.primary) cell.classList.add("is-primary");
}

/**
 * Shared comparison table: Single record | With multiplier.
 * Each cell includes its unit label (e.g. "104 bytes") so values read alone.
 * @param {HTMLElement} tbody
 * @param {Array<{
 *   label: string,
 *   perDisplay: string,
 *   totalDisplay: string,
 *   perDim?: boolean,
 *   totalDim?: boolean,
 *   perPrimary?: boolean,
 *   totalPrimary?: boolean
 * }>} rows
 */
export function renderUnitTable(tbody, rows) {
  const fingerprint = rows
    .map(
      (r) =>
        `${r.label}:${r.perDisplay}:${r.totalDisplay}:${r.perDim ? 1 : 0}:${r.totalDim ? 1 : 0}:${r.perPrimary ? 1 : 0}:${r.totalPrimary ? 1 : 0}`
    )
    .join("|");
  if (tbody.dataset.fingerprint === fingerprint) return;
  tbody.dataset.fingerprint = fingerprint;

  clear(tbody);
  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");

    const perCell = document.createElement("td");
    fillSizeCell(perCell, row.perDisplay, row.label, {
      dim: row.perDim,
      primary: row.perPrimary
    });

    const totalCell = document.createElement("td");
    fillSizeCell(totalCell, row.totalDisplay, row.label, {
      dim: row.totalDim,
      primary: row.totalPrimary
    });

    tr.append(perCell, totalCell);
    fragment.appendChild(tr);
  }

  tbody.appendChild(fragment);
}

/**
 * Growth projection table.
 * Shows footprint + multiple vs year 0 (no ambiguous progress bars).
 */
export function renderProjectionTable(tbody, projections) {
  const fingerprint = projections
    .map((row) => `${row.year}:${row.bytes}`)
    .join("|");
  if (tbody.dataset.fingerprint === fingerprint) return;
  tbody.dataset.fingerprint = fingerprint;

  clear(tbody);
  const year0 = projections[0]?.bytes ?? 0;
  const fragment = document.createDocumentFragment();

  for (const row of projections) {
    const tr = document.createElement("tr");

    const yearCell = document.createElement("td");
    yearCell.className = "year";
    yearCell.textContent = row.year === 0 ? "Now" : `Year ${row.year}`;

    const footprintCell = document.createElement("td");
    footprintCell.textContent = `${row.primary.display} ${row.primary.label}`;

    const multipleCell = document.createElement("td");
    if (year0 === 0) {
      multipleCell.textContent = "—";
    } else if (row.year === 0) {
      multipleCell.textContent = "1×";
    } else {
      multipleCell.textContent = `${(row.bytes / year0).toLocaleString("en-US", {
        maximumFractionDigits: 2
      })}×`;
    }

    tr.append(yearCell, footprintCell, multipleCell);
    fragment.appendChild(tr);
  }

  tbody.appendChild(fragment);
}
