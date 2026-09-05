/**
 * Tiny DOM helpers shared by calculator views.
 * Keep this dependency-free so new calculators stay lightweight.
 */

/**
 * @param {string} id
 * @param {ParentNode} [root]
 */
export function $(id, root = document) {
  const el = root.querySelector(`#${CSS.escape(id)}`);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Prefer textContent over innerHTML for untrusted / dynamic values. */
export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

/** Restart a CSS animation only when the displayed value changes. */
export function setAnimatedText(node, text) {
  if (node.textContent === text) return;
  node.style.animation = "none";
  node.textContent = text;
  void node.offsetWidth;
  node.style.animation = "";
}
