import { $, clear, setAnimatedText, setText } from "../../ui/dom.js";
import {
  MAX_RECORD_COUNT,
  bindCustomValueChip,
  createPresetChips,
  formatGrouped
} from "../../ui/presets.js";
import {
  AUDIENCE_PRESETS,
  PEAK_PRESETS,
  RATE_PRESETS,
  THROUGHPUT_DEFAULTS,
  createLayerSnapshot,
  estimateThroughput,
  formatTps,
  nextStreamId,
  removeLayerSnapshot,
  trafficConfigForFocus,
  upsertLayerSnapshot
} from "./model.js";
import {
  INVESTIGATION_FOCUSES,
  assessCapacityInput,
  getCapacityProfile,
  getInvestigationFocus,
  profilesForInvestigation
} from "./capacityProfiles.js";

/**
 * Mount the throughput calculator into markup already present under root.
 * Investigation-first: DAU/MAU only for app servers; other layers use rate units.
 * @param {HTMLElement} root
 */
export function mountThroughputCalculator(root) {
  const state = {
    audienceMode: /** @type {'dau' | 'mau'} */ (THROUGHPUT_DEFAULTS.audienceMode),
    audienceCount: THROUGHPUT_DEFAULTS.audienceCount,
    peakMultiplier: THROUGHPUT_DEFAULTS.peakMultiplier,
    payloadBytes: THROUGHPUT_DEFAULTS.payloadBytes,
    nodeCapacityTps: THROUGHPUT_DEFAULTS.nodeCapacityTps,
    investigationId: /** @type {string | null} */ ("app"),
    capacityProfileId: /** @type {string | null} */ (null),
    customAudience: false,
    customPeak: false,
    customRate: false,
    rateAvgTps: 5_000,
    /** @type {Array<ReturnType<typeof createLayerSnapshot>>} */
    savedLayers: [],
    streams: THROUGHPUT_DEFAULTS.streams.map((stream) => ({ ...stream }))
  };

  const investigationChips = $("investigationChips", root);
  const investigationMeta = $("investigationMeta", root);
  const savedLayersBlock = $("savedLayersBlock", root);
  const savedLayersList = $("savedLayersList", root);
  const saveLayerBtn = /** @type {HTMLButtonElement} */ ($("saveLayerBtn", root));
  const trafficBlock = $("trafficBlock", root);
  const audienceBlock = $("audienceBlock", root);
  const rateBlock = $("rateBlock", root);
  const rateLabel = $("rateLabel", root);
  const rateMeta = $("rateMeta", root);
  const audienceMeta = $("audienceMeta", root);
  const peakMeta = $("peakMeta", root);
  const streamsLabel = $("streamsLabel", root);
  const streamsHelper = $("streamsHelper", root);
  const streamTemplates = $("streamTemplates", root);
  const streamList = $("streamList", root);
  const capacityBlock = $("capacityBlock", root);
  const capacityIntro = $("capacityIntro", root);
  const capacityProfileChips = $("capacityProfileChips", root);
  const capacityMeta = $("capacityMeta", root);
  const capacityGuide = $("capacityGuide", root);
  const capacityGuideTitle = $("capacityGuideTitle", root);
  const capacityGuideLimits = $("capacityGuideLimits", root);
  const capacityGuideConnections = $("capacityGuideConnections", root);
  const capacityGuideTip = $("capacityGuideTip", root);
  const capacityGuideAssess = $("capacityGuideAssess", root);
  const nodeCapacityLabel = $("nodeCapacityLabel", root);
  const streamRateColumn = $("streamRateColumn", root);
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
  const footnoteTraffic = $("footnoteTraffic", root);
  const footnotePeak = $("footnotePeak", root);
  const payloadInput = /** @type {HTMLInputElement} */ ($("payloadBytes", root));
  const nodeCapacityInput = /** @type {HTMLInputElement} */ (
    $("nodeCapacityTps", root)
  );
  const addStreamBtn = /** @type {HTMLButtonElement} */ ($("addStreamBtn", root));

  /** @type {ReturnType<typeof estimateThroughput> | null} */
  let latestEstimate = null;

  saveLayerBtn.addEventListener("click", () => {
    saveCurrentLayer();
  });

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

  /** @type {{ sync: () => void, clear?: () => void }} */
  let rateChips;
  /** @type {{ sync: () => void, clear: () => void }} */
  let customRateChip;

  /**
   * Apply a plain average rate to the rate-mode stream list.
   * Keeps a single Total stream so chips stay the source of truth.
   * @param {number} avgTps
   * @param {boolean} [asCustom]
   */
  function applyRateAvgTps(avgTps, asCustom = false) {
    const value = Math.max(0, Number(avgTps) || 0);
    state.rateAvgTps = value;
    state.customRate = asCustom;
    state.streams = [
      {
        id: state.streams[0]?.id ?? nextStreamId("total"),
        name: "Total",
        avgTps: value
      }
    ];
    rateChips.sync();
    customRateChip.sync();
    renderStreamEditor();
  }

  /** Sync chip selection from the sum of current rate streams. */
  function syncRateFromStreams() {
    const traffic = trafficConfigForFocus(state.investigationId);
    if (!traffic || traffic.mode !== "rate") return;
    const total = state.streams.reduce(
      (sum, stream) => sum + Math.max(0, Number(stream.avgTps) || 0),
      0
    );
    state.rateAvgTps = total;
    state.customRate = !RATE_PRESETS.some((preset) => preset.value === total);
    rateChips.sync();
    customRateChip.sync();
  }

  rateChips = createPresetChips({
    container: $("rateChips", root),
    presets: RATE_PRESETS,
    getValue: () => state.rateAvgTps,
    isCustom: () => state.customRate,
    onSelect: (preset) => {
      applyRateAvgTps(preset.value, false);
      customRateChip.clear();
      render();
    }
  });

  customRateChip = bindCustomValueChip({
    container: $("rateChips", root),
    idPrefix: "customRate",
    triggerLabel: "Enter…",
    placeholder: "Avg rate",
    integer: false,
    min: 0,
    max: 100_000_000,
    maxError: "Max average rate is 100M.",
    isActive: () => state.customRate,
    getDisplayValue: () => (state.customRate ? state.rateAvgTps : null),
    onApply: (value) => {
      applyRateAvgTps(value, true);
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

  addStreamBtn.addEventListener("click", () => {
    const traffic = trafficConfigForFocus(state.investigationId);
    if (!traffic) return;
    if (traffic.mode === "rate") {
      state.streams.push({
        id: nextStreamId("custom"),
        name: "Custom",
        avgTps: 100
      });
      syncRateFromStreams();
    } else {
      state.streams.push({
        id: nextStreamId("custom"),
        name: "Custom",
        actionsPerUserPerDay: 1
      });
    }
    renderStreamEditor();
    render();
  });

  function applyFocusDefaults(focusId) {
    const traffic = trafficConfigForFocus(focusId);
    if (!traffic) return;
    state.streams = traffic.defaultStreams.map((stream) => ({ ...stream }));
    if (traffic.mode === "rate") {
      state.rateAvgTps = state.streams.reduce(
        (sum, stream) => sum + Math.max(0, Number(stream.avgTps) || 0),
        0
      );
      state.customRate = !RATE_PRESETS.some(
        (preset) => preset.value === state.rateAvgTps
      );
      rateChips.sync();
      customRateChip.sync();
      customRateChip.clear();
    }
    renderStreamTemplates();
    renderStreamEditor();
  }

  function renderInvestigationChips() {
    clear(investigationChips);
    for (const focus of INVESTIGATION_FOCUSES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-switch-btn";
      btn.textContent = focus.label;
      btn.setAttribute("role", "radio");
      const selected = state.investigationId === focus.id;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-checked", selected ? "true" : "false");
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
          applyFocusDefaults(focus.id);
        }
        renderInvestigationChips();
        renderProfileChips();
        render();
      });
      investigationChips.appendChild(btn);
    }
  }

  function renderStreamTemplates() {
    clear(streamTemplates);
    const traffic = trafficConfigForFocus(state.investigationId);
    if (!traffic) return;

    for (const template of traffic.templates) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = `+ ${template.name}`;
      if (traffic.mode === "rate") {
        btn.title = `${formatTps(template.avgTps ?? 0)} ${traffic.rateSuffix}`;
      } else {
        btn.title = `${template.actionsPerUserPerDay} ${traffic.rateSuffix}`;
      }
      btn.addEventListener("click", () => {
        if (traffic.mode === "rate") {
          state.streams.push({
            id: nextStreamId(template.name.toLowerCase()),
            name: template.name,
            avgTps: template.avgTps ?? 0
          });
          syncRateFromStreams();
        } else {
          state.streams.push({
            id: nextStreamId(template.name.toLowerCase()),
            name: template.name,
            actionsPerUserPerDay: template.actionsPerUserPerDay ?? 0
          });
        }
        renderStreamEditor();
        render();
      });
      streamTemplates.appendChild(btn);
    }
  }

  function renderProfileChips() {
    clear(capacityProfileChips);
    const focus = getInvestigationFocus(state.investigationId);
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
  }


  /**
   * @param {ReturnType<typeof trafficConfigForFocus>} traffic
   * @param {ReturnType<typeof estimateThroughput>} estimate
   */
  function trafficBriefFor(traffic, estimate) {
    if (!traffic) return estimate.summaryLine;
    if (traffic.mode === "rate") {
      return `${estimate.totalAvgTpsLabel} ${traffic.rateSuffix} · peak ${estimate.peakMultiplier}×`;
    }
    return `${estimate.audienceLabel} · peak ${estimate.peakMultiplier}×`;
  }

  function saveCurrentLayer() {
    const traffic = trafficConfigForFocus(state.investigationId);
    const focus = getInvestigationFocus(state.investigationId);
    if (!traffic || !focus || !latestEstimate) return;
    if (latestEstimate.totalAvgTps <= 0) return;

    const profile = getCapacityProfile(state.capacityProfileId);
    const snapshot = createLayerSnapshot({
      investigationId: focus.id,
      layerLabel: focus.label,
      systemLabel: profile?.label ?? null,
      unitLabel: profile?.unitLabel ?? null,
      estimate: latestEstimate,
      trafficBrief: trafficBriefFor(traffic, latestEstimate)
    });

    state.savedLayers = upsertLayerSnapshot(state.savedLayers, snapshot);
    renderSavedLayers();
    syncSaveButton();
  }

  function renderSavedLayers() {
    clear(savedLayersList);
    const hasSaved = state.savedLayers.length > 0;
    savedLayersBlock.hidden = !hasSaved;
    if (!hasSaved) return;

    const fragment = document.createDocumentFragment();
    for (const snap of state.savedLayers) {
      const row = document.createElement("article");
      row.className = "saved-layer";
      row.setAttribute("role", "listitem");

      const body = document.createElement("div");
      body.className = "saved-layer-body";

      const title = document.createElement("p");
      title.className = "saved-layer-title";
      title.textContent = snap.systemLabel
        ? `${snap.layerLabel} · ${snap.systemLabel}`
        : snap.layerLabel;

      const headline = document.createElement("p");
      headline.className = "saved-layer-headline";
      headline.textContent = snap.headline;

      const brief = document.createElement("p");
      brief.className = "saved-layer-brief";
      brief.textContent = snap.trafficBrief;

      body.append(title, headline, brief);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "saved-layer-remove";
      removeBtn.setAttribute("aria-label", `Remove saved ${snap.layerLabel}`);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        state.savedLayers = removeLayerSnapshot(
          state.savedLayers,
          snap.investigationId
        );
        renderSavedLayers();
        syncSaveButton();
      });

      row.append(body, removeBtn);
      fragment.appendChild(row);
    }

    savedLayersList.appendChild(fragment);
  }

  function syncSaveButton() {
    const focus = getInvestigationFocus(state.investigationId);
    const canSave = Boolean(
      focus && latestEstimate && latestEstimate.totalAvgTps > 0
    );
    saveLayerBtn.hidden = !canSave;
    if (!canSave) return;

    const already = state.savedLayers.some(
      (item) => item.investigationId === focus?.id
    );
    saveLayerBtn.textContent = already ? "Update saved layer" : "Save this layer";
  }

  /**
   * @param {ReturnType<typeof estimateThroughput>} estimate
   */
  function audienceConversionLabel(estimate) {
    if (estimate.trafficMode === "rate") return estimate.audienceLabel;
    return `${estimate.audienceLabel} → ${estimate.totalAvgTpsLabel} avg · ${estimate.totalPeakTpsLabel} peak TPS`;
  }

  function renderStreamEditor() {
    clear(streamList);
    const traffic = trafficConfigForFocus(state.investigationId);
    if (!traffic) return;

    const fragment = document.createDocumentFragment();
    const rateMode = traffic.mode === "rate";

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

      const rateWrap = document.createElement("label");
      rateWrap.className = "stream-actions";
      const rateInput = document.createElement("input");
      rateInput.type = "number";
      rateInput.min = "0";
      rateInput.step = "any";
      rateInput.value = String(
        rateMode ? (stream.avgTps ?? 0) : (stream.actionsPerUserPerDay ?? 0)
      );
      rateInput.setAttribute(
        "aria-label",
        rateMode
          ? `${stream.name} ${traffic.rateSuffix}`
          : `${stream.name} actions per user per day`
      );
      rateInput.addEventListener("input", () => {
        const value = Math.max(0, Number(rateInput.value) || 0);
        if (rateMode) {
          stream.avgTps = value;
          syncRateFromStreams();
        } else {
          stream.actionsPerUserPerDay = value;
        }
        render();
      });
      const rateCaption = document.createElement("span");
      rateCaption.textContent = traffic.rateSuffix;
      rateWrap.append(rateInput, rateCaption);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "stream-remove";
      removeBtn.textContent = "Remove";
      removeBtn.disabled = state.streams.length <= 1;
      removeBtn.addEventListener("click", () => {
        if (state.streams.length <= 1) return;
        state.streams = state.streams.filter((item) => item.id !== stream.id);
        if (rateMode) syncRateFromStreams();
        renderStreamEditor();
        render();
      });

      row.append(nameInput, rateWrap, removeBtn);
      fragment.appendChild(row);
    });

    streamList.appendChild(fragment);
  }

  /**
   * @param {ReturnType<typeof estimateThroughput>} estimate
   * @param {ReturnType<typeof trafficConfigForFocus>} traffic
   */
  function renderStreamTable(estimate, traffic) {
    clear(streamTableBody);
    const fragment = document.createDocumentFragment();
    const rateMode = traffic?.mode === "rate";

    for (const row of estimate.streams) {
      const tr = document.createElement("tr");

      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = row.name;

      const rate = document.createElement("td");
      rate.textContent = rateMode
        ? formatTps(row.avgTps)
        : String(row.actionsPerUserPerDay);

      const avg = document.createElement("td");
      avg.textContent = formatTps(row.avgTps);

      const peak = document.createElement("td");
      peak.textContent = formatTps(row.peakTps);

      const share = document.createElement("td");
      share.textContent = `${Math.round(row.shareOfPeak * 100)}%`;

      tr.append(name, rate, avg, peak, share);
      fragment.appendChild(tr);
    }

    const total = document.createElement("tr");
    total.className = "stream-total";
    const totalLabel = document.createElement("th");
    totalLabel.scope = "row";
    totalLabel.textContent = "Total";
    const totalRate = document.createElement("td");
    totalRate.textContent = rateMode
      ? estimate.totalAvgTpsLabel
      : String(estimate.totalActionsPerUserPerDay);
    const totalAvg = document.createElement("td");
    totalAvg.textContent = estimate.totalAvgTpsLabel;
    const totalPeak = document.createElement("td");
    totalPeak.textContent = estimate.totalPeakTpsLabel;
    const totalShare = document.createElement("td");
    totalShare.textContent = estimate.streams.length ? "100%" : "—";
    total.append(totalLabel, totalRate, totalAvg, totalPeak, totalShare);
    fragment.appendChild(total);

    streamTableBody.appendChild(fragment);
  }

  /**
   * DAU/MAU only for app servers; DB/cache/queue use plain rate chips.
   * Use attribute + inline display so author `display: grid` rules cannot win.
   * @param {HTMLElement} el
   * @param {boolean} isHidden
   */
  function setHidden(el, isHidden) {
    el.toggleAttribute("hidden", isHidden);
    el.inert = isHidden;
    el.style.display = isHidden ? "none" : "";
  }

  function syncTrafficInputVisibility(traffic, hasFocus) {
    const mode = hasFocus ? traffic?.mode : null;
    setHidden(audienceBlock, mode !== "audience");
    setHidden(rateBlock, mode !== "rate");
  }

  function render() {
    const traffic = trafficConfigForFocus(state.investigationId);
    const focus = getInvestigationFocus(state.investigationId);
    const hasFocus = Boolean(focus && traffic);

    setHidden(trafficBlock, !hasFocus);
    setHidden(capacityBlock, !hasFocus);
    syncTrafficInputVisibility(traffic, hasFocus);

    setText(investigationMeta, focus?.hint ?? "Pick a focus to continue");

    if (traffic && focus) {
      setText(streamsLabel, traffic.streamsTitle);
      setText(streamsHelper, traffic.streamsHelper);
      setText(streamRateColumn, traffic.rateColumn);
      setText(rateLabel, traffic.rateLabel);
      setText(capacityIntro, `Systems for ${focus.label}.`);
      setText(
        footnoteTraffic,
        traffic.mode === "audience"
          ? "DAU/MAU × actions/user/day ÷ 86,400 → avg TPS (app / LB)"
          : `${focus.label}: enter ${traffic.rateSuffix} directly (not end-user DAU)`
      );
      setText(footnotePeak, "avg TPS × peak multiplier");
    } else {
      setText(
        footnoteTraffic,
        "App: DAU/MAU × actions/day. DB/cache/queue: RPS / ops/s / msg/s"
      );
      setText(footnotePeak, "avg TPS × peak multiplier");
    }

    const estimate = estimateThroughput({
      trafficMode: traffic?.mode ?? "audience",
      audienceMode: state.audienceMode,
      audienceCount: state.audienceCount,
      peakMultiplier: state.peakMultiplier,
      payloadBytes: state.payloadBytes,
      nodeCapacityTps: state.nodeCapacityTps,
      streams: hasFocus ? state.streams : []
    });
    latestEstimate = hasFocus ? estimate : null;

    if (traffic?.mode === "audience") {
      setText(audienceMeta, audienceConversionLabel(estimate));
    }
    setText(
      rateMeta,
      traffic?.mode === "rate"
        ? `${estimate.totalAvgTpsLabel} avg · ${estimate.totalPeakTpsLabel} peak ${traffic.rateSuffix}`
        : ""
    );
    setText(peakMeta, `${estimate.peakMultiplier}× over flat avg`);
    setAnimatedText(totalAvgTps, hasFocus ? estimate.totalAvgTpsLabel : "0");
    setAnimatedText(totalPeakTps, hasFocus ? estimate.totalPeakTpsLabel : "0");
    setText(
      throughputSummary,
      hasFocus ? estimate.summaryLine : "Pick an investigation to estimate"
    );
    setText(bandwidthAvg, hasFocus ? estimate.avgBandwidthLabel : "—");
    setText(bandwidthPeak, hasFocus ? estimate.peakBandwidthLabel : "—");
    setText(
      nodesNeeded,
      !hasFocus || estimate.nodesNeeded == null
        ? "—"
        : formatGrouped(estimate.nodesNeeded)
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
        : hasFocus
          ? "Pick a system or enter TPS/unit to size this layer"
          : "Pick an investigation focus first"
    );
    renderCapacityGuide();
    renderStreamTable(estimate, traffic);
    syncSaveButton();
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  syncModeButtons();
  renderInvestigationChips();
  applyFocusDefaults("app");
  renderProfileChips();
  renderStreamTemplates();
  renderStreamEditor();
  renderSavedLayers();
  render();

  return {
    getState: () => ({
      ...state,
      streams: state.streams.map((stream) => ({ ...stream })),
      savedLayers: state.savedLayers.map((snap) => ({ ...snap }))
    }),
    destroy() {}
  };
}
