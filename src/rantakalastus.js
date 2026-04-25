/**
 * rantakalastus.js — multi-species shore-fishing forecast renderer.
 *
 * Mirrors app.js but for hauki + ahven + kuha. The day grid shows the best
 * species per day with mini-scores for the others; the detail panel stacks
 * three species blocks each with its own hourly strip and factor breakdown.
 */

import {
  WEATHER, HOURLY, TODAY, FETCHED_AT,
  MARINE, FOGLO, OVERRIDE_DEFAULTS
} from "./data/data.js";

import {
  scoreSpecies,
  scoreRantakalastus,
  bestHourWindow,
  peakHoursForDay,
  compassLetter,
  scoreColor,
  scoreVerdict,
  factorBarColor,
  SPECIES_META
} from "./scoring.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const TODAY_IDX = WEATHER.time.indexOf(TODAY);
const SPECIES = ["hauki", "ahven", "kuha"];

const state = {
  /** @type {"marine"|"foglo"|"override"} */
  source: "foglo",
  overrideTemp: OVERRIDE_DEFAULTS.temp,
  overrideTrend: OVERRIDE_DEFAULTS.trend7d,
  selectedIdx: TODAY_IDX
};

function getActiveTemp() {
  if (state.source === "override") return state.overrideTemp;
  if (state.source === "foglo") return FOGLO.todayTemp;
  return MARINE.todayTemp;
}

function getActiveTrend() {
  if (state.source === "override") return state.overrideTrend;
  if (state.source === "foglo") return FOGLO.trend7d;
  return MARINE.trend7d;
}

function selectSource(s) {
  if (state.source === s) return;
  state.source = s;
  render();
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const MONTHS_FI = ["tammi","helmi","maalis","huhti","touko","kesä","heinä","elo","syys","loka","marras","joulu"];
const DAY_NAMES_FI = ["Su","Ma","Ti","Ke","To","Pe","La"];

function formatDate(s) {
  const d = new Date(s + "T12:00:00");
  return d.getDate() + ". " + MONTHS_FI[d.getMonth()];
}

function dayOfWeek(s) {
  const d = new Date(s + "T12:00:00");
  return DAY_NAMES_FI[d.getDay()];
}

function formatHourRange(start, end) {
  const pad = (n) => String(n).padStart(2, "0");
  return pad(start) + "–" + pad(end);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  for (const s of ["marine", "foglo", "override"]) {
    document.getElementById("src-" + s).classList.toggle("selected", state.source === s);
  }

  const sourceLabels = {
    marine: "Open-Meteo Marine (avovesi, mallinnettu)",
    foglo: "FMI Föglö Degerby (rannikkomittaus)",
    override:
      "Oma havainto (" +
      state.overrideTemp.toFixed(1) +
      " °C, trendi " +
      (state.overrideTrend >= 0 ? "+" : "") +
      state.overrideTrend.toFixed(1) +
      " °C)"
  };
  document.getElementById("activeSource").textContent = sourceLabels[state.source];

  renderDayGrid();
  renderDetail();
}

function renderDayGrid() {
  const grid = document.getElementById("daysGrid");
  grid.innerHTML = "";
  const temp = getActiveTemp();
  const trend = getActiveTrend();

  for (let i = TODAY_IDX; i < Math.min(TODAY_IDX + 7, WEATHER.time.length); i++) {
    const d = WEATHER.time[i];
    const { best, scores } = scoreRantakalastus(i, temp, trend);
    const bestTotal = scores[best].total;
    const bestMeta = SPECIES_META[best];
    const bestWindow = bestHourWindow(best, i, temp, trend);

    const miniLine = SPECIES.map(sp => {
      const initial = sp[0].toUpperCase();
      return initial + " " + scores[sp].total;
    }).join(" · ");

    const card = document.createElement("button");
    card.className = "day-card" + (i === state.selectedIdx ? " selected" : "");
    card.style.background = scoreColor(bestTotal);
    card.style.border = "none";
    card.style.cursor = "pointer";
    card.onclick = () => { state.selectedIdx = i; render(); };
    card.innerHTML =
      '<div class="day-label">' + dayOfWeek(d) + (i === TODAY_IDX ? " · tänään" : "") + '</div>' +
      '<div class="day-date">' + formatDate(d) + '</div>' +
      '<div class="best-species">' + bestMeta.emoji + " " + bestMeta.label + '</div>' +
      '<div class="day-score">' + bestTotal + '</div>' +
      '<div class="day-verdict">' + scoreVerdict(bestTotal) + '</div>' +
      '<div class="species-mini">' + miniLine + '</div>' +
      (bestTotal > 0
        ? '<div class="best-window">Paras ' + formatHourRange(bestWindow.startHour, bestWindow.endHour) + '</div>'
        : '');
    grid.appendChild(card);
  }
}

function renderDetail() {
  const container = document.getElementById("detailContainer");
  const i = state.selectedIdx;
  const date = WEATHER.time[i];
  const temp = getActiveTemp();
  const trend = getActiveTrend();
  const hourly = HOURLY[date];

  const speciesBlocks = SPECIES.map(sp => renderSpeciesBlock(sp, i, date, temp, trend, hourly)).join("");

  container.innerHTML =
    '<div class="detail-panel">' +
      '<div class="detail-header">' +
        '<h2>' + dayOfWeek(date) + ' ' + formatDate(date) +
          (i === TODAY_IDX ? " (tänään)" : "") + '</h2>' +
        '<div style="font-size:13px;color:#475569">' +
          'Lämpötila: ' + temp.toFixed(1) + ' °C · trendi ' +
          (trend >= 0 ? "+" : "") + trend.toFixed(1) + ' °C' +
        '</div>' +
      '</div>' +
      speciesBlocks +
    '</div>';
}

function renderSpeciesBlock(species, idx, date, temp, trend, hourly) {
  const meta = SPECIES_META[species];
  const result = scoreSpecies(species, idx, temp, trend);
  const window = bestHourWindow(species, idx, temp, trend);
  const peaks = peakHoursForDay(species, date);

  let hourlyHTML = "";
  if (hourly) {
    hourlyHTML =
      '<div style="display:grid;grid-template-columns:repeat(24,1fr);gap:1px;border-radius:6px;overflow:hidden;margin-top:6px">';
    for (let h = 0; h < 24; h++) {
      const t = hourly.temp[h];
      const c = hourly.cloud[h];
      const w = hourly.wind[h];
      const isPeak = peaks.has(h);
      const isWindow = h >= window.startHour && h < window.endHour;
      const cls = isPeak ? "peak-" + species : "";
      const icon = c > 80 ? "☁" : c > 40 ? "⛅" : c > 10 ? "🌤" : "☀";
      const bg = isPeak ? "" : "#e2e8f0";
      const border = isWindow ? "outline:2px solid #0a3d62;outline-offset:-2px;" : "";
      hourlyHTML +=
        '<div class="hour-cell ' + cls + '" style="font-size:9px;text-align:center;padding:4px 1px;' +
          (bg ? 'background:' + bg + ';' : '') +
          (cls ? '' : 'color:#333;') +
          border +
          '" title="' + h + ':00 · ' + t + '°C · ' + c + '% · ' + (w / 3.6).toFixed(0) + ' m/s">' +
          '<div style="font-weight:600;font-size:10px">' + h + '</div>' +
          '<div style="font-size:14px">' + icon + '</div>' +
          '<div>' + Math.round(t) + '°</div>' +
        '</div>';
    }
    hourlyHTML += '</div>';
  }

  let factorsHTML = '<div class="factors-grid" style="margin-top:8px">';
  for (const f of result.factors) {
    factorsHTML +=
      '<div class="factor' + (f.critical ? ' critical' : '') + '">' +
        '<div class="label">' +
          '<span>' + f.label + '</span>' +
          '<span class="w">×' + f.weight + '</span>' +
          '<span style="color:' + factorBarColor(f.score) + ';font-weight:700">' +
            Math.round(f.score) +
          '</span>' +
        '</div>' +
        '<div class="value">' + f.value + '</div>' +
        '<div class="bar-wrap">' +
          '<div class="bar" style="width:' + f.score + '%;background:' + factorBarColor(f.score) + '"></div>' +
        '</div>' +
        '<div class="reason">' + f.reason + '</div>' +
      '</div>';
  }
  factorsHTML += '</div>';

  const penaltyHTML = result.penalties.length > 0
    ? '<div class="penalty-alert" style="margin-top:8px">⚠ <strong>Rangaistukset:</strong> ' +
        result.penalties.join(" · ") + '</div>'
    : '';

  return (
    '<section class="species-block">' +
      '<div class="species-header">' +
        '<div class="name"><span class="emoji">' + meta.emoji + '</span>' + meta.label + '</div>' +
        '<div class="right">' +
          '<span class="window-pill">Paras tunti: ' +
            formatHourRange(window.startHour, window.endHour) +
            ' (' + window.score + ')' +
          '</span>' +
          '<span class="score-pill" style="color:' + scoreColor(result.total) + '">' +
            result.total + ' / 100 · ' + scoreVerdict(result.total) +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="tackle-hint">Vinkki: ' + meta.tackle + '</div>' +
      hourlyHTML +
      penaltyHTML +
      factorsHTML +
    '</section>'
  );
}

// ---------------------------------------------------------------------------
// Override controls (shared shape with app.js, duplicated for now)
// ---------------------------------------------------------------------------

function setupOverrideControls() {
  const overrideRange = document.getElementById("overrideRange");
  const overrideNum = document.getElementById("overrideNum");
  const overrideBadge = document.getElementById("overrideBadge");
  const trendRange = document.getElementById("trendRange");
  const trendBadge = document.getElementById("trendBadge");
  const overrideValDisplay = document.getElementById("override-val");
  const overrideTrendDisplay = document.getElementById("override-trend");

  function applyTemp(v) {
    if (v === state.overrideTemp && state.source === "override") return;
    state.overrideTemp = v;
    overrideRange.value = v;
    overrideNum.value = v;
    overrideBadge.textContent = v.toFixed(1) + " °C";
    overrideValDisplay.textContent = v.toFixed(1) + " °C";
    state.source = "override";
    render();
  }
  function applyTrend(v) {
    if (v === state.overrideTrend && state.source === "override") return;
    state.overrideTrend = v;
    trendRange.value = v;
    trendBadge.textContent = (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + " °C";
    overrideTrendDisplay.textContent =
      "7 vrk: " + (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + " °C";
    state.source = "override";
    render();
  }

  overrideRange.addEventListener("input", e => applyTemp(parseFloat(e.target.value)));
  overrideNum.addEventListener("input",   e => applyTemp(parseFloat(e.target.value)));
  trendRange.addEventListener("input",    e => applyTrend(parseFloat(e.target.value)));
}

function setupSourceCards() {
  for (const card of document.querySelectorAll(".source-card[data-source]")) {
    card.addEventListener("click", () => selectSource(card.dataset.source));
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function init() {
  const stamp = document.getElementById("dataStamp");
  if (stamp) stamp.textContent = FETCHED_AT.replace("T", " ");

  document.getElementById("marine-temp").textContent = MARINE.todayTemp.toFixed(1) + " °C";
  document.getElementById("marine-trend").textContent =
    "7 vrk: " + (MARINE.trend7d >= 0 ? "+" : "") + MARINE.trend7d.toFixed(1) + " °C";
  document.getElementById("foglo-temp").textContent = FOGLO.todayTemp.toFixed(1) + " °C";
  document.getElementById("foglo-trend").textContent =
    "7 vrk: " + (FOGLO.trend7d >= 0 ? "+" : "") + FOGLO.trend7d.toFixed(1) + " °C";

  document.getElementById("overrideRange").value = state.overrideTemp;
  document.getElementById("overrideNum").value = state.overrideTemp;
  document.getElementById("overrideBadge").textContent = state.overrideTemp.toFixed(1) + " °C";
  document.getElementById("trendRange").value = state.overrideTrend;
  document.getElementById("trendBadge").textContent =
    (state.overrideTrend >= 0 ? "+" : "−") + Math.abs(state.overrideTrend).toFixed(1) + " °C";
  document.getElementById("override-val").textContent = state.overrideTemp.toFixed(1) + " °C";
  document.getElementById("override-trend").textContent =
    "7 vrk: " + (state.overrideTrend >= 0 ? "+" : "−") + Math.abs(state.overrideTrend).toFixed(1) + " °C";

  setupOverrideControls();
  setupSourceCards();
  render();
}

init();
