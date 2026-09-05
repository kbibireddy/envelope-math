import { clear } from "./dom.js";

/**
 * Reusable preset chip group for any calculator input.
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
  return { sync };
}

/**
 * Custom numeric field + apply button wired to Enter.
 */
export function bindCustomNumber({
  input,
  button,
  parse = parseNonNegative,
  onApply
}) {
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
