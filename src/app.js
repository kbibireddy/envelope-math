import "./styles/main.css";
import { $, clear, setText } from "./ui/dom.js";
import {
  CALCULATORS,
  getCalculator,
  getDefaultCalculator
} from "./calculators/registry.js";

/**
 * App shell: product switch + calculator host.
 * Switching products tears down the previous mount and mounts the next.
 *
 * Extension point: register a calculator in registry.js and add
 * <template id="tpl-<id}"> markup . the shell mounts it automatically.
 */
export function startApp() {
  const nav = $("productNav");
  const host = $("calculatorHost");
  const title = $("productTitle");

  /** @type {{ destroy?: () => void } | null} */
  let active = null;
  let activeId = null;

  function renderNav(selectedId) {
    clear(nav);
    const fragment = document.createDocumentFragment();

    for (const product of CALCULATORS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-switch-btn";
      btn.textContent = product.label;
      btn.dataset.product = product.id;
      btn.setAttribute("role", "radio");

      if (product.status === "planned") {
        btn.disabled = true;
        btn.title = "Coming soon";
        btn.setAttribute("aria-checked", "false");
      } else {
        const selected = product.id === selectedId;
        btn.classList.toggle("active", selected);
        btn.setAttribute("aria-checked", selected ? "true" : "false");
        btn.addEventListener("click", () => selectProduct(product.id));
      }

      fragment.appendChild(btn);
    }

    nav.appendChild(fragment);
  }

  function selectProduct(id) {
    const product = getCalculator(id);
    if (!product || product.status !== "available" || !product.mount) return;
    if (id === activeId) return;

    active?.destroy?.();
    active = null;
    activeId = id;

    const template = document.getElementById(`tpl-${product.id}`);
    clear(host);
    if (template instanceof HTMLTemplateElement) {
      host.appendChild(template.content.cloneNode(true));
    }

    setText(title, product.label);
    renderNav(id);
    active = product.mount(host);
  }

  selectProduct(getDefaultCalculator().id);
}

startApp();
