import { $, setAnimatedText, setText } from "../../ui/dom.js";
import {
  MAX_GROWTH_PERCENT,
  MAX_RECORD_COUNT,
  bindCustomValueChip,
  createPresetChips,
  formatGrouped
} from "../../ui/presets.js";
import {
  bindInfoPopover,
  renderProjectionTable,
  renderSizePopover,
  renderUnitTable
} from "../../ui/results.js";
import {
  MAX_PROJECTION_YEARS,
  PROJECTION_YEAR_STEP
} from "../../shared/growth.js";
import {
  STORAGE_UNITS,
  UNIT_VISIBILITY_THRESHOLD,
  formatGridNumber
} from "../../shared/storage.js";
import {
  COMPRESSION_PRESETS,
  GROWTH_PRESETS,
  MULTIPLIER_PRESETS,
  SIZING_DEFAULTS,
  estimateSizing
} from "./model.js";

/** Fixed ladder rows shown in the footprint table (B → TB). */
const FOOTPRINT_UNITS = STORAGE_UNITS.filter((unit) => unit.key !== "PB");

/**
 * Build aligned B→TB rows for the shared comparison table.
 * @param {number} perBytes
 * @param {number} totalBytes
 * @param {string} perPrimaryKey
 * @param {string} totalPrimaryKey
 */
function buildUnitTableRows(
  perBytes,
  totalBytes,
  perPrimaryKey,
  totalPrimaryKey
) {
  const safePer = Number.isFinite(perBytes) && perBytes > 0 ? perBytes : 0;
  const safeTotal =
    Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0;

  return FOOTPRINT_UNITS.map((unit) => {
    const perValue = safePer / unit.divisor;
    const totalValue = safeTotal / unit.divisor;
    const perDim =
      unit.key !== "B" && (safePer === 0 || perValue < UNIT_VISIBILITY_THRESHOLD);
    const totalDim =
      unit.key !== "B" &&
      (safeTotal === 0 || totalValue < UNIT_VISIBILITY_THRESHOLD);

    return {
      label: unit.label,
      perDisplay: formatGridNumber(perValue),
      totalDisplay: formatGridNumber(totalValue),
      perDim,
      totalDim,
      perPrimary: unit.key === perPrimaryKey,
      totalPrimary: unit.key === totalPrimaryKey
    };
  });
}

/**
 * Mount the sizing calculator into a root that already contains sizing markup.
 * @param {HTMLElement} root
 */
export function mountSizingCalculator(root) {
  const state = {
    text: SIZING_DEFAULTS.sampleText,
    recordCount: SIZING_DEFAULTS.recordCount,
    growthPercent: SIZING_DEFAULTS.growthPercent,
    projectionYears: SIZING_DEFAULTS.years,
    compressionId: /** @type {string | null} */ (SIZING_DEFAULTS.compressionId),
    customMultiplier: false,
    customGrowth: false
  };

  const sampleText = /** @type {HTMLTextAreaElement} */ ($("sampleText", root));
  const charMeta = $("charMeta", root);
  const perRecordPrimaryValue = $("perRecordPrimaryValue", root);
  const perRecordPrimaryUnit = $("perRecordPrimaryUnit", root);
  const perRecordSub = $("perRecordSub", root);
  const totalPrimaryValue = $("totalPrimaryValue", root);
  const totalPrimaryUnit = $("totalPrimaryUnit", root);
  const totalSub = $("totalSub", root);
  const unitTableBody = /** @type {HTMLTableSectionElement} */ (
    $("unitTableBody", root)
  );
  const ladderPopoverBody = $("ladderPopoverBody", root);
  const projectionHelper = $("projectionHelper", root);
  const projectionBody = /** @type {HTMLTableSectionElement} */ (
    $("projectionBody", root)
  );
  const extendProjection = /** @type {HTMLButtonElement} */ (
    $("extendProjection", root)
  );
  const compressionMeta = $("compressionMeta", root);
  const compressionChips = $("compressionChips", root);

  /** @type {Map<string, HTMLButtonElement>} */
  const compressionButtons = new Map();

  bindInfoPopover(
    /** @type {HTMLButtonElement} */ ($("ladderInfoBtn", root)),
    $("ladderPopover", root)
  );

  const multiplierChips = createPresetChips({
    container: $("multiplierChips", root),
    presets: MULTIPLIER_PRESETS,
    getValue: () => state.recordCount,
    isCustom: () => state.customMultiplier,
    onSelect: (preset) => {
      state.recordCount = preset.value;
      state.customMultiplier = false;
      customMultiplierChip.clear();
      multiplierChips.sync();
      customMultiplierChip.sync();
      renderResults();
    }
  });

  const growthChips = createPresetChips({
    container: $("growthChips", root),
    presets: GROWTH_PRESETS,
    getValue: () => state.growthPercent,
    isCustom: () => state.customGrowth,
    onSelect: (preset) => {
      state.growthPercent = preset.value;
      state.customGrowth = false;
      customGrowthChip.clear();
      growthChips.sync();
      customGrowthChip.sync();
      renderResults();
    }
  });

  const customMultiplierChip = bindCustomValueChip({
    container: $("multiplierChips", root),
    idPrefix: "customMultiplier",
    triggerLabel: "Enter…",
    placeholder: "Record count",
    integer: true,
    min: 0,
    max: MAX_RECORD_COUNT,
    maxError: `Max is ${formatGrouped(MAX_RECORD_COUNT)} (JS safe integer).`,
    isActive: () => state.customMultiplier,
    getDisplayValue: () => (state.customMultiplier ? state.recordCount : null),
    onApply: (value) => {
      state.recordCount = value;
      state.customMultiplier = true;
      multiplierChips.sync();
      customMultiplierChip.sync();
      renderResults();
    }
  });

  const customGrowthChip = bindCustomValueChip({
    container: $("growthChips", root),
    idPrefix: "customGrowth",
    triggerLabel: "Enter…",
    placeholder: "Growth %",
    suffix: "%",
    integer: false,
    min: 0,
    max: MAX_GROWTH_PERCENT,
    maxError: `Max is ${formatGrouped(MAX_GROWTH_PERCENT)}% (100×).`,
    isActive: () => state.customGrowth,
    getDisplayValue: () => (state.customGrowth ? state.growthPercent : null),
    onApply: (value) => {
      state.growthPercent = value;
      state.customGrowth = true;
      growthChips.sync();
      customGrowthChip.sync();
      renderResults();
    }
  });

  // Exclusive compression toggles — selecting one clears the others;
  // clicking the active one turns compression off.
  for (const preset of COMPRESSION_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = preset.label;
    btn.setAttribute("aria-pressed", "false");
    if (preset.hint) btn.title = preset.hint;
    btn.addEventListener("click", () => {
      state.compressionId =
        state.compressionId === preset.id ? null : preset.id;
      syncCompressionChips();
      renderResults();
    });
    compressionButtons.set(preset.id, btn);
    compressionChips.appendChild(btn);
  }

  function syncCompressionChips() {
    for (const [id, btn] of compressionButtons) {
      const active = state.compressionId === id;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  extendProjection.addEventListener("click", () => {
    if (state.projectionYears >= MAX_PROJECTION_YEARS) return;
    state.projectionYears = Math.min(
      MAX_PROJECTION_YEARS,
      state.projectionYears + PROJECTION_YEAR_STEP
    );
    renderResults();
  });

  function renderResults() {
    const estimate = estimateSizing({
      text: state.text,
      recordCount: state.recordCount,
      growthPercent: state.growthPercent,
      years: state.projectionYears,
      compressionId: state.compressionId
    });

    setText(
      charMeta,
      `${estimate.textLength.toLocaleString("en-US")} characters · ${estimate.rawBytesPerRecord.toLocaleString("en-US")} UTF-8 bytes`
    );
    setText(compressionMeta, estimate.compressionLabel);

    setAnimatedText(perRecordPrimaryValue, estimate.perRecordPrimary.display);
    setText(perRecordPrimaryUnit, estimate.perRecordPrimary.label);
    setText(
      perRecordSub,
      estimate.compressionId
        ? `After ${estimate.compressionLabel.split(" · ")[0]}`
        : "UTF-8 payload size"
    );

    setAnimatedText(totalPrimaryValue, estimate.totalPrimary.display);
    setText(totalPrimaryUnit, estimate.totalPrimary.label);
    setText(totalSub, estimate.summaryLine);

    renderUnitTable(
      unitTableBody,
      buildUnitTableRows(
        estimate.bytesPerRecord,
        estimate.year0Bytes,
        estimate.perRecordPrimary.key,
        estimate.totalPrimary.key
      )
    );
    renderSizePopover(
      ladderPopoverBody,
      estimate.totalDetails,
      estimate.compressionId
        ? `Total after ${estimate.compressionLabel.split(" · ")[0]} · 2 decimal places max`
        : "Total · all units · 2 decimal places max"
    );

    setText(
      projectionHelper,
      `${estimate.growthPercent}% YoY · showing ${estimate.projections.length - 1} of ${MAX_PROJECTION_YEARS} years · “× vs now” is size relative to today`
    );
    renderProjectionTable(projectionBody, estimate.projections);

    const canExtend = state.projectionYears < MAX_PROJECTION_YEARS;
    extendProjection.hidden = !canExtend;
    extendProjection.disabled = !canExtend;
    extendProjection.textContent = canExtend
      ? `+${PROJECTION_YEAR_STEP} years`
      : "50-year max";
    extendProjection.title = canExtend
      ? `Show ${Math.min(MAX_PROJECTION_YEARS, state.projectionYears + PROJECTION_YEAR_STEP)} years total (max ${MAX_PROJECTION_YEARS})`
      : "Already at the 50-year limit";
  }

  const onInput = (event) => {
    state.text = event.target.value;
    renderResults();
  };

  sampleText.addEventListener("input", onInput);
  sampleText.value = state.text;
  syncCompressionChips();
  renderResults();

  return {
    getState: () => ({ ...state }),
    destroy() {
      sampleText.removeEventListener("input", onInput);
    }
  };
}
