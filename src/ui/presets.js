import { clear } from "./dom.js";

/** Largest integer JS can represent safely — hard cap for record counts. */
export const MAX_RECORD_COUNT = Number.MAX_SAFE_INTEGER;

/** Max custom YoY growth: 100× (10,000%). */
export const MAX_GROWTH_PERCENT = 10_000;

/**
 * Reusable preset chip group for any calculator input.
 * Preset clicks apply immediately (no Apply button).
 */
export function createPresetChips({
  container,
  presets,
  getValue,
  isCustom,
  onSelect
}) {
  /** @type {Map<number, HTMLButtonElement>} */
  const buttons = new Map();

  clear(container);
  const fragment = document.createDocumentFragment();

  for (const preset of presets) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = preset.label;
    if (preset.hint) btn.title = preset.hint;
    btn.addEventListener("click", () => onSelect(preset));
    buttons.set(preset.value, btn);
    fragment.appendChild(btn);
  }

  container.appendChild(fragment);

  function sync() {
    const current = getValue();
    const custom = isCustom();
    for (const [value, btn] of buttons) {
      btn.classList.toggle("active", !custom && value === current);
    }
  }

  sync();
  return { sync, container };
}

/**
 * Chip-styled "Custom" control that opens a popover for free-form entry.
 * Numbers are comma-formatted while typing; Apply commits (with max checks).
 *
 * @param {{
 *   container: HTMLElement,
 *   idPrefix: string,
 *   triggerLabel?: string,
 *   placeholder?: string,
 *   suffix?: string,
 *   integer?: boolean,
 *   min?: number,
 *   max: number,
 *   maxError: string,
 *   isActive: () => boolean,
 *   getDisplayValue: () => number | null,
 *   onApply: (value: number) => void,
 *   onClear?: () => void
 * }} options
 */
export function bindCustomValueChip({
  container,
  idPrefix,
  triggerLabel = "Custom",
  placeholder = "Enter value",
  suffix = "",
  integer = true,
  min = 0,
  max,
  maxError,
  isActive,
  getDisplayValue,
  onApply
}) {
  const wrap = document.createElement("div");
  wrap.className = "custom-chip-wrap";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "chip custom-chip";
  trigger.id = `${idPrefix}Trigger`;
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${idPrefix}Popover`);
  trigger.textContent = triggerLabel;

  const popover = document.createElement("div");
  popover.className = "custom-popover";
  popover.id = `${idPrefix}Popover`;
  popover.hidden = true;
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", placeholder);

  const field = document.createElement("div");
  field.className = "custom-popover-field";

  const input = document.createElement("input");
  input.type = "text";
  input.id = `${idPrefix}Input`;
  input.inputMode = integer ? "numeric" : "decimal";
  input.autocomplete = "off";
  input.placeholder = placeholder;
  input.setAttribute("aria-label", placeholder);

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "apply";
  applyBtn.textContent = "Apply";

  const error = document.createElement("p");
  error.className = "custom-popover-error";
  error.hidden = true;

  field.append(input, applyBtn);
  popover.append(field, error);
  wrap.append(trigger, popover);
  container.appendChild(wrap);

  const close = () => {
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    error.hidden = true;
    error.textContent = "";
  };

  const open = () => {
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const current = getDisplayValue();
    if (current !== null && Number.isFinite(current)) {
      input.value = formatGrouped(current, integer);
    } else if (!input.value) {
      input.value = "";
    }
    input.focus();
    input.select();
  };

  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (popover.hidden) open();
    else close();
  };

  const showError = (message) => {
    error.textContent = message;
    error.hidden = false;
  };

  const commit = () => {
    const parsed = parseGroupedNumber(input.value, { integer, min, max });
    if (parsed.status === "empty") {
      showError("Enter a value.");
      return;
    }
    if (parsed.status === "invalid") {
      showError("Enter a valid number.");
      return;
    }
    if (parsed.status === "min") {
      showError(`Minimum is ${formatGrouped(min, integer)}${suffix}.`);
      return;
    }
    if (parsed.status === "max") {
      showError(maxError);
      return;
    }
    onApply(parsed.value);
    input.value = formatGrouped(parsed.value, integer);
    close();
    sync();
  };

  trigger.addEventListener("click", toggle);

  applyBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    commit();
  });

  input.addEventListener("input", () => {
    error.hidden = true;
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret);
    const digitsBefore = before.replace(/[^\d.]/g, "").length;
    input.value = formatGroupedTyping(input.value, integer);
    // Rough caret restore after regrouping.
    let seen = 0;
    let pos = input.value.length;
    for (let i = 0; i < input.value.length; i += 1) {
      if (/[\d.]/.test(input.value[i])) seen += 1;
      if (seen >= digitsBefore) {
        pos = i + 1;
        break;
      }
    }
    input.setSelectionRange(pos, pos);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  document.addEventListener("click", (event) => {
    if (popover.hidden) return;
    const target = /** @type {Node} */ (event.target);
    if (wrap.contains(target)) return;
    close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  function sync() {
    const active = isActive();
    trigger.classList.toggle("active", active);
    if (active) {
      const current = getDisplayValue();
      trigger.textContent =
        current !== null && Number.isFinite(current)
          ? `${formatCompactLabel(current, integer)}${suffix}`
          : triggerLabel;
    } else {
      trigger.textContent = triggerLabel;
    }
  }

  sync();
  return {
    sync,
    clear() {
      input.value = "";
      sync();
    },
    close
  };
}

/** @deprecated Prefer bindCustomValueChip — kept for older call sites. */
export function bindCustomNumber({ input, button, parse = parseNonNegative, onApply }) {
  const apply = () => {
    const value = parse(input.value);
    if (value === null) return;
    onApply(value);
  };

  button.addEventListener("click", apply);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
    }
  });

  return {
    clear() {
      input.value = "";
    },
    set(value) {
      input.value = String(value);
    }
  };
}

export function parseNonNegative(raw) {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * @param {string} raw
 * @param {{ integer?: boolean, min?: number, max: number }} opts
 */
export function parseGroupedNumber(raw, { integer = true, min = 0, max }) {
  const trimmed = String(raw).trim();
  if (trimmed === "") return { status: "empty" };

  const normalized = trimmed.replace(/,/g, "");
  if (!/^\d*\.?\d+$/.test(normalized) && !/^\d+$/.test(normalized)) {
    return { status: "invalid" };
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return { status: "invalid" };
  if (integer && !Number.isInteger(value)) return { status: "invalid" };
  if (value < min) return { status: "min" };
  if (value > max) return { status: "max" };
  return { status: "ok", value };
}

/** Format a finite number with grouping commas for display. */
export function formatGrouped(value, integer = true) {
  if (!Number.isFinite(value)) return "";
  if (integer) {
    return Math.round(value).toLocaleString("en-US");
  }
  const [whole, frac] = String(value).split(".");
  const grouped = Number(whole).toLocaleString("en-US");
  return frac !== undefined ? `${grouped}.${frac}` : grouped;
}

/** Live typing formatter — keeps commas while the user types. */
export function formatGroupedTyping(raw, integer = true) {
  const cleaned = String(raw).replace(/[^\d.]/g, "");
  if (cleaned === "" || cleaned === ".") return cleaned;

  if (integer) {
    const digits = cleaned.replace(/\./g, "").replace(/^0+(?=\d)/, "");
    if (digits === "") return "";
    return Number(digits).toLocaleString("en-US");
  }

  const firstDot = cleaned.indexOf(".");
  let whole = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
  let frac = firstDot === -1 ? "" : cleaned.slice(firstDot + 1).replace(/\./g, "");
  whole = whole.replace(/^0+(?=\d)/, "") || "0";
  const grouped = Number(whole).toLocaleString("en-US");
  if (firstDot === -1) return grouped;
  return `${grouped}.${frac}`;
}

/** Short chip label for an active custom value. */
function formatCompactLabel(value, integer) {
  if (!Number.isFinite(value)) return "Custom";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${trimNum(value / 1e9)}B`;
  if (abs >= 1e6) return `${trimNum(value / 1e6)}M`;
  if (abs >= 1e3) return `${trimNum(value / 1e3)}K`;
  return integer ? String(Math.round(value)) : trimNum(value);
}

function trimNum(value) {
  return String(Number(value.toPrecision(3))).replace(/\.0+$/, "");
}
