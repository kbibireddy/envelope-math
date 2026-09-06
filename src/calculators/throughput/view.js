import { $, clear, setAnimatedText, setText } from "../../ui/dom.js";
import {
  MAX_RECORD_COUNT,
  bindCustomValueChip,
  createPresetChips,
  formatGrouped
} from "../../ui/presets.js";
import {
  ACTIVE_DAYS_PRESETS,
  AUDIENCE_PRESETS,
  PEAK_PRESETS,
  STREAM_TEMPLATES,
  THROUGHPUT_DEFAULTS,
  estimateThroughput,
  formatTps,
  nextStreamId
} from "./model.js";
import {
  INVESTIGATION_FOCUSES,
  assessCapacityInput,
  getCapacityProfile,
  getInvestigationFocus,
  profilesForInvestigation
} from "./capacityProfiles.js";

/**
 * Mount the throughput calculator into a root that already contains markup.
 * @param {HTMLElement} root
 */
export function mountThroughputCalculator(root) {
  const state = {
    audienceMode: /** @type {'dau' | 'mau'} */ (THROUGHPUT_DEFAULTS.audienceMode),
    audienceCount: THROUGHPUT_DEFAULTS.audienceCount,
    activeDaysPerMonth: THROUGHPUT_DEFAULTS.activeDaysPerMonth,
    peakMultiplier: THROUGHPUT_DEFAULTS.peakMultiplier,
    payloadBytes: THROUGHPUT_DEFAULTS.payloadBytes,
    nodeCapacityTps: THROUGHPUT_DEFAULTS.nodeCapacityTps,
    investigationId: /** @type {string | null} */ (null),
    capacityProfileId: /** @type {string | null} */ (null),
    customAudience: false,
    customPeak: false,
    customActiveDays: false,
    streams: THROUGHPUT_DEFAULTS.streams.map((stream) => ({ ...stream }))
  };

  const audienceMeta = $("audienceMeta", root);
  const peakMeta = $("peakMeta", root);
  const mauOnly = $("mauOnly", root);
  const streamList = $("streamList", root);
  const streamTemplates = $("streamTemplates", root);
  const streamTableBody = /** @type {HTMLTableSectionElement} */ (
    $("streamTableBody", root)
  );
  const totalAvgTps = $("totalAvgTps", root);
  const totalPeakTps = $("totalPeakTps", root);
  const throughputSummary = $("throughputSummary", root);
  const bandwidthAvg = $("bandwidthAvg", root);
  const bandwidthPeak = $("bandwidthPeak", root);
  const nodesNeeded = $("nodesNeeded", root);
  const nodesNeededLabel = $("nodesNeededLabel", root);
  const capacityMeta = $("capacityMeta", root);
  const investigationChips = $("investigationChips", root);
  const investigationMeta = $("investigationMeta", root);
  const capacitySystemBlock = $("capacitySystemBlock", root);
  const capacityProfileChips = $("capacityProfileChips", root);
  const capacityGuide = $("capacityGuide", root);
  const capacityGuideTitle = $("capacityGuideTitle", root);
  const capacityGuideLimits = $("capacityGuideLimits", root);
  const capacityGuideConnections = $("capacityGuideConnections", root);
  const capacityGuideTip = $("capacityGuideTip", root);
  const capacityGuideAssess = $("capacityGuideAssess", root);
  const nodeCapacityLabel = $("nodeCapacityLabel", root);
  const payloadInput = /** @type {HTMLInputElement} */ ($("payloadBytes", root));
  const nodeCapacityInput = /** @type {HTMLInputElement} */ (
    $("nodeCapacityTps", root)
  );
  const addStreamBtn = /** @type {HTMLButtonElement} */ ($("addStreamBtn", root));

  /** @type {Map<string, HTMLButtonElement>} */
  const modeButtons = new Map();
  for (const node of root.querySelectorAll("[data-audience-mode]")) {
    const btn = /** @type {HTMLButtonElement} */ (node);
    const mode = btn.dataset.audienceMode;
    if (!mode) continue;
    modeButtons.set(mode, btn);
    btn.addEventListener("click", () => {
      state.audienceMode = /** @type {'dau' | 'mau'} */ (mode);
      syncModeButtons();
      render();
    });
  }

  const audienceChips = createPresetChips({
    container: $("audienceChips", root),
    presets: AUDIENCE_PRESETS,
    getValue: () => state.audienceCount,
    isCustom: () => state.customAudience,
    onSelect: (preset) => {
      state.audienceCount = preset.value;
      state.customAudience = false;
      customAudienceChip.clear();
      audienceChips.sync();
      customAudienceChip.sync();
      render();
    }
  });

  const customAudienceChip = bindCustomValueChip({
    container: $("audienceChips", root),
    idPrefix: "customAudience",
    triggerLabel: "Enter…",
    placeholder: "Users",
    integer: true,
    min: 0,
    max: MAX_RECORD_COUNT,
    maxError: `Max is ${formatGrouped(MAX_RECORD_COUNT)}.`,
    isActive: () => state.customAudience,
    getDisplayValue: () => (state.customAudience ? state.audienceCount : null),
    onApply: (value) => {
      state.audienceCount = value;
      state.customAudience = true;
      audienceChips.sync();
      customAudienceChip.sync();
      render();
    }
  });

  const peakChips = createPresetChips({
    container: $("peakChips", root),
    presets: PEAK_PRESETS,
    getValue: () => state.peakMultiplier,
    isCustom: () => state.customPeak,
    onSelect: (preset) => {
      state.peakMultiplier = preset.value;
      state.customPeak = false;
      customPeakChip.clear();
      peakChips.sync();
      customPeakChip.sync();
      render();
    }
  });

  const customPeakChip = bindCustomValueChip({
    container: $("peakChips", root),
    idPrefix: "customPeak",
    triggerLabel: "Enter…",
    placeholder: "Peak ×",
    suffix: "×",
    integer: false,
    min: 1,
    max: 1000,
    maxError: "Max peak multiplier is 1000×.",
    isActive: () => state.customPeak,
    getDisplayValue: () => (state.customPeak ? state.peakMultiplier : null),
    onApply: (value) => {
      state.peakMultiplier = value;
      state.customPeak = true;
      peakChips.sync();
      customPeakChip.sync();
      render();
    }
  });

  const activeDaysChips = createPresetChips({
    container: $("activeDaysChips", root),
    presets: ACTIVE_DAYS_PRESETS,
    getValue: () => state.activeDaysPerMonth,
    isCustom: () => state.customActiveDays,
    onSelect: (preset) => {
      state.activeDaysPerMonth = preset.value;
      state.customActiveDays = false;
      customActiveDaysChip.clear();
      activeDaysChips.sync();
      customActiveDaysChip.sync();
      render();
    }
  });

  const customActiveDaysChip = bindCustomValueChip({
    container: $("activeDaysChips", root),
    idPrefix: "customActiveDays",
    triggerLabel: "Enter…",
    placeholder: "Days",
    integer: true,
    min: 1,
    max: 31,
    maxError: "Use 1–31 active days per month.",
    isActive: () => state.customActiveDays,
    getDisplayValue: () =>
      state.customActiveDays ? state.activeDaysPerMonth : null,
    onApply: (value) => {
      state.activeDaysPerMonth = value;
      state.customActiveDays = true;
      activeDaysChips.sync();
      customActiveDaysChip.sync();
      render();
    }
  });

  for (const template of STREAM_TEMPLATES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = `+ ${template.name}`;
    btn.title = `${template.actionsPerUserPerDay} actions/user/day`;
    btn.addEventListener("click", () => {
      state.streams.push({
        id: nextStreamId(template.name.toLowerCase()),
        name: template.name,
        actionsPerUserPerDay: template.actionsPerUserPerDay
      });
      renderStreamEditor();
      render();
    });
    streamTemplates.appendChild(btn);
  }

  addStreamBtn.addEventListener("click", () => {
    state.streams.push({
      id: nextStreamId("custom"),
      name: "Custom",
      actionsPerUserPerDay: 1
    });
    renderStreamEditor();
    render();
  });

  payloadInput.value = state.payloadBytes ? String(state.payloadBytes) : "";
  payloadInput.addEventListener("input", () => {
    state.payloadBytes = Math.max(0, Number(payloadInput.value) || 0);
    render();
  });

  nodeCapacityInput.value = state.nodeCapacityTps
    ? String(state.nodeCapacityTps)
    : "";
  nodeCapacityInput.addEventListener("input", () => {
    state.nodeCapacityTps = Math.max(0, Number(nodeCapacityInput.value) || 0);
    render();
  });

  function renderInvestigationChips() {
    clear(investigationChips);
    for (const focus of INVESTIGATION_FOCUSES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = focus.label;
      btn.classList.toggle("active", state.investigationId === focus.id);
      btn.addEventListener("click", () => {
        const switching = state.investigationId !== focus.id;
        state.investigationId = focus.id;
        if (switching) {
          const stillValid = profilesForInvestigation(focus.id).some(
            (profile) => profile.id === state.capacityProfileId
          );
          if (!stillValid) {
            state.capacityProfileId = null;
            state.nodeCapacityTps = 0;
            nodeCapacityInput.value = "";
          }
        }
        renderInvestigationChips();
        renderProfileChips();
        render();
      });
      investigationChips.appendChild(btn);
    }
  }

  function renderProfileChips() {
    const focus = getInvestigationFocus(state.investigationId);
    capacitySystemBlock.hidden = !focus;
    setText(
      investigationMeta,
      focus?.hint ?? "Pick a focus to see relevant systems"
    );

    clear(capacityProfileChips);
    if (!focus) return;

    for (const profile of profilesForInvestigation(focus.id)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = profile.label;
      btn.title = `${formatTps(profile.conservativeTps)}–${formatTps(profile.optimisticTps)} TPS/${profile.unitLabel}`;
      btn.classList.toggle("active", state.capacityProfileId === profile.id);
      btn.addEventListener("click", () => {
        state.capacityProfileId = profile.id;
        state.nodeCapacityTps = profile.conservativeTps;
        nodeCapacityInput.value = String(profile.conservativeTps);
        renderProfileChips();
        render();
      });
      capacityProfileChips.appendChild(btn);
    }
  }

  function renderCapacityGuide() {
    const profile = getCapacityProfile(state.capacityProfileId);
    if (!profile) {
      capacityGuide.hidden = true;
      setText(nodeCapacityLabel, "TPS per unit");
      return;
    }

    capacityGuide.hidden = false;
    setText(
      capacityGuideTitle,
      `${profile.label} · ~${formatTps(profile.conservativeTps)}–${formatTps(profile.optimisticTps)} TPS/${profile.unitLabel}`
    );
    setText(capacityGuideLimits, profile.limits);
    setText(
      capacityGuideConnections,
      profile.connections
        ? `Connections: ${profile.connections}`
        : "Connections: n/a for this service model"
    );
    setText(capacityGuideTip, `Tip: ${profile.tip}`);

    const assessment = assessCapacityInput(profile, state.nodeCapacityTps);
    setText(capacityGuideAssess, assessment.message);
    capacityGuideAssess.dataset.level = assessment.level;
    setText(nodeCapacityLabel, `TPS per ${profile.unitLabel}`);
  }

  function syncModeButtons() {
    for (const [mode, btn] of modeButtons) {
      const active = state.audienceMode === mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    }
    mauOnly.hidden = state.audienceMode !== "mau";
  }

  function renderStreamEditor() {
    clear(streamList);
    const fragment = document.createDocumentFragment();

    state.streams.forEach((stream, index) => {
      const row = document.createElement("div");
      row.className = "stream-row";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "stream-name";
      nameInput.value = stream.name;
      nameInput.setAttribute("aria-label", `Stream ${index + 1} name`);
      nameInput.addEventListener("input", () => {
        stream.name = nameInput.value.trim() || `Stream ${index + 1}`;
        render();
      });

      const actionsWrap = document.createElement("label");
      actionsWrap.className = "stream-actions";
      const actionsInput = document.createElement("input");
      actionsInput.type = "number";
      actionsInput.min = "0";
      actionsInput.step = "any";
      actionsInput.value = String(stream.actionsPerUserPerDay);
      actionsInput.setAttribute(
        "aria-label",
        `${stream.name} actions per user per day`
      );
      actionsInput.addEventListener("input", () => {
        stream.actionsPerUserPerDay = Math.max(
          0,
          Number(actionsInput.value) || 0
        );
        render();
      });
      const actionsCaption = document.createElement("span");
      actionsCaption.textContent = "/user/day";
      actionsWrap.append(actionsInput, actionsCaption);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "stream-remove";
      removeBtn.textContent = "Remove";
      removeBtn.disabled = state.streams.length <= 1;
      removeBtn.addEventListener("click", () => {
        if (state.streams.length <= 1) return;
        state.streams = state.streams.filter((item) => item.id !== stream.id);
        renderStreamEditor();
        render();
      });

      row.append(nameInput, actionsWrap, removeBtn);
      fragment.appendChild(row);
    });

    streamList.appendChild(fragment);
  }

  /**
   * @param {ReturnType<typeof estimateThroughput>} estimate
   */
  function renderStreamTable(estimate) {
    clear(streamTableBody);
    const fragment = document.createDocumentFragment();

    for (const row of estimate.streams) {
      const tr = document.createElement("tr");

      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = row.name;

      const actions = document.createElement("td");
      actions.textContent = String(row.actionsPerUserPerDay);

      const avg = document.createElement("td");
      avg.textContent = formatTps(row.avgTps);

      const peak = document.createElement("td");
      peak.textContent = formatTps(row.peakTps);

      const share = document.createElement("td");
      share.textContent = `${Math.round(row.shareOfPeak * 100)}%`;

      tr.append(name, actions, avg, peak, share);
      fragment.appendChild(tr);
    }

    const total = document.createElement("tr");
    total.className = "stream-total";
    const totalLabel = document.createElement("th");
    totalLabel.scope = "row";
    totalLabel.textContent = "Total";
    const totalActions = document.createElement("td");
    totalActions.textContent = String(estimate.totalActionsPerUserPerDay);
    const totalAvg = document.createElement("td");
    totalAvg.textContent = estimate.totalAvgTpsLabel;
    const totalPeak = document.createElement("td");
    totalPeak.textContent = estimate.totalPeakTpsLabel;
    const totalShare = document.createElement("td");
    totalShare.textContent = estimate.streams.length ? "100%" : "—";
    total.append(totalLabel, totalActions, totalAvg, totalPeak, totalShare);
    fragment.appendChild(total);

    streamTableBody.appendChild(fragment);
  }

  function render() {
    const estimate = estimateThroughput({
      audienceMode: state.audienceMode,
      audienceCount: state.audienceCount,
      activeDaysPerMonth: state.activeDaysPerMonth,
      peakMultiplier: state.peakMultiplier,
      payloadBytes: state.payloadBytes,
      nodeCapacityTps: state.nodeCapacityTps,
      streams: state.streams
    });

    setText(audienceMeta, estimate.audienceLabel);
    setText(
      peakMeta,
      `Peak ${estimate.peakMultiplier}× over a flat-day average`
    );
    setAnimatedText(totalAvgTps, estimate.totalAvgTpsLabel);
    setAnimatedText(totalPeakTps, estimate.totalPeakTpsLabel);
    setText(throughputSummary, estimate.summaryLine);
    setText(bandwidthAvg, estimate.avgBandwidthLabel);
    setText(bandwidthPeak, estimate.peakBandwidthLabel);
    setText(
      nodesNeeded,
      estimate.nodesNeeded == null ? "—" : formatGrouped(estimate.nodesNeeded)
    );

    const profile = getCapacityProfile(state.capacityProfileId);
    const unit = profile?.unitLabel ?? "node";
    setText(
      nodesNeededLabel,
      profile && profile.unitLabel !== "node"
        ? `${capitalize(profile.unitLabel)}s @ peak`
        : "Nodes @ peak"
    );
    setText(
      capacityMeta,
      estimate.nodeCapacityTps > 0
        ? `At ${formatTps(estimate.nodeCapacityTps)} TPS/${unit} for peak load`
        : state.investigationId
          ? "Pick a system or enter TPS/unit to size this layer"
          : "Pick an investigation focus first"
    );
    renderCapacityGuide();
    renderStreamTable(estimate);
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  syncModeButtons();
  renderInvestigationChips();
  renderProfileChips();
  renderStreamEditor();
  render();

  return {
    getState: () => ({
      ...state,
      streams: state.streams.map((stream) => ({ ...stream }))
    }),
    destroy() {}
  };
}
