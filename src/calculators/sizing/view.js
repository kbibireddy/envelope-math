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
  renderUnitGrid
} from "../../ui/results.js";
import {
  GROWTH_PRESETS,
  MULTIPLIER_PRESETS,
  SIZING_DEFAULTS,
  estimateSizing
} from "./model.js";

/**
 * Mount the sizing calculator into a root that already contains sizing markup.
 * @param {HTMLElement} root
 */
export function mountSizingCalculator(root) {
  const state = {
    text: SIZING_DEFAULTS.sampleText,
    recordCount: SIZING_DEFAULTS.recordCount,
    growthPercent: SIZING_DEFAULTS.growthPercent,
    customMultiplier: false,
    customGrowth: false
  };

  const sampleText = /** @type {HTMLTextAreaElement} */ ($("sampleText", root));
  const charMeta = $("charMeta", root);
  const perRecordPrimaryValue = $("perRecordPrimaryValue", root);
  const perRecordPrimaryUnit = $("perRecordPrimaryUnit", root);
  const perRecordSub = $("perRecordSub", root);
  const perRecordUnits = $("perRecordUnits", root);
  const perRecordPopoverBody = $("perRecordPopoverBody", root);
  const totalPrimaryValue = $("totalPrimaryValue", root);
  const totalPrimaryUnit = $("totalPrimaryUnit", root);
  const totalSub = $("totalSub", root);
  const totalUnits = $("totalUnits", root);
  const totalPopoverBody = $("totalPopoverBody", root);
  const projectionHelper = $("projectionHelper", root);
  const projectionBody = /** @type {HTMLTableSectionElement} */ (
    $("projectionBody", root)
  );

  bindInfoPopover(
    /** @type {HTMLButtonElement} */ ($("perRecordInfoBtn", root)),
    $("perRecordPopover", root)
  );
  bindInfoPopover(
    /** @type {HTMLButtonElement} */ ($("totalInfoBtn", root)),
    $("totalPopover", root)
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

  function renderResults() {
    const estimate = estimateSizing({
      text: state.text,
      recordCount: state.recordCount,
      growthPercent: state.growthPercent,
      years: SIZING_DEFAULTS.years
    });

    setText(
      charMeta,
      `${estimate.textLength.toLocaleString("en-US")} characters · ${estimate.bytesPerRecord.toLocaleString("en-US")} UTF-8 bytes`
    );

    setAnimatedText(perRecordPrimaryValue, estimate.perRecordPrimary.display);
    setText(perRecordPrimaryUnit, estimate.perRecordPrimary.label);
    setText(perRecordSub, "UTF-8 payload size");
    renderUnitGrid(perRecordUnits, estimate.perRecordUnits);
    renderSizePopover(
      perRecordPopoverBody,
      estimate.perRecordDetails,
      "All units · 2 decimal places max"
    );

    setAnimatedText(totalPrimaryValue, estimate.totalPrimary.display);
    setText(totalPrimaryUnit, estimate.totalPrimary.label);
    setText(totalSub, estimate.summaryLine);
    renderUnitGrid(totalUnits, estimate.totalUnits);
    renderSizePopover(
      totalPopoverBody,
      estimate.totalDetails,
      "All units · 2 decimal places max"
    );

    setText(
      projectionHelper,
      `${estimate.growthPercent}% YoY · ${estimate.projections.length - 1} years`
    );
    renderProjectionTable(projectionBody, estimate.projections);
  }

  const onInput = (event) => {
    state.text = event.target.value;
    renderResults();
  };

  sampleText.addEventListener("input", onInput);
  sampleText.value = state.text;
  renderResults();

  return {
    getState: () => ({ ...state }),
    destroy() {
      sampleText.removeEventListener("input", onInput);
    }
  };
}
