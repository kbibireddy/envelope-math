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
 * Fill an info popover body with the full B→PB ladder.
 * @param {HTMLElement} body
 * @param {Array<{ label: string, display: string }>} details
 * @param {string} caption
 */
export function renderSizePopover(body, details, caption) {
  clear(body);

  if (caption) {
    const note = document.createElement("p");
    note.className = "size-popover-caption";
    note.textContent = caption;
    body.appendChild(note);
  }

  const list = document.createElement("dl");
  list.className = "size-popover-list";

  for (const row of details) {
    const dt = document.createElement("dt");
    dt.textContent = row.label;
    const dd = document.createElement("dd");
    dd.textContent = row.display;
    list.append(dt, dd);
  }

  body.appendChild(list);
}

/**
 * Wire an info button to show/hide its popover.
 * Hover opens on fine pointers; click/tap toggles; Escape / outside click close.
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} popover
 */
export function bindInfoPopover(button, popover) {
  const canHover = () => window.matchMedia("(hover: hover)").matches;

  const close = () => {
    popover.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    popover.hidden = false;
    button.setAttribute("aria-expanded", "true");
  };

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (popover.hidden) open();
    else close();
  };

  button.addEventListener("click", toggle);

  const onEnter = () => {
    if (canHover()) open();
  };
  const onLeave = (event) => {
    if (!canHover()) return;
    const next = /** @type {Node | null} */ (event.relatedTarget);
    if (next && (button.contains(next) || popover.contains(next))) return;
    close();
  };

  button.addEventListener("mouseenter", onEnter);
  button.addEventListener("mouseleave", onLeave);
  popover.addEventListener("mouseenter", onEnter);
  popover.addEventListener("mouseleave", onLeave);

  document.addEventListener("click", (event) => {
    if (popover.hidden) return;
    const target = /** @type {Node} */ (event.target);
    if (popover.contains(target) || button.contains(target)) return;
    close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  return { open, close };
}

/**
 * Growth projection table with relative bar widths.
 */
export function renderProjectionTable(tbody, projections) {
  const fingerprint = projections
    .map((row) => `${row.year}:${row.bytes}`)
    .join("|");
  if (tbody.dataset.fingerprint === fingerprint) return;
  tbody.dataset.fingerprint = fingerprint;

  clear(tbody);
  const year0 = projections[0]?.bytes ?? 0;
  const maxBytes = projections[projections.length - 1]?.bytes ?? 0;
  const fragment = document.createDocumentFragment();

  for (const row of projections) {
    const tr = document.createElement("tr");

    const yearCell = document.createElement("td");
    yearCell.className = "year";
    yearCell.textContent = `Y${row.year}`;

    const footprintCell = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = `${row.primary.display} ${row.primary.label}`;

    const bar = document.createElement("span");
    bar.className = "growth-bar";
    bar.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    const width =
      maxBytes === 0 ? 0 : Math.max(4, (row.bytes / maxBytes) * 100);
    fill.style.width = `${width}%`;
    bar.appendChild(fill);
    footprintCell.append(strong, bar);

    const multipleCell = document.createElement("td");
    if (year0 === 0) {
      multipleCell.textContent = "—";
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
