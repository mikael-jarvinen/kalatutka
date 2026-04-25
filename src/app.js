/**
 * app.js — rendering and event handlers.
 *
 * The only file that touches the DOM and holds mutable state.
 * All scoring logic lives in scoring.js (pure). All data lives in data.js.
 */

import {
  WEATHER, HOURLY, TODAY, FETCHED_AT,
  MARINE, FOGLO, OVERRIDE_DEFAULTS
} from "./data/data.js";

import {
  scoreDay,
  compassLetter,
  scoreColor,
  scoreVerdict,
  factorBarColor
} from "./scoring.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const TODAY_IDX = WEATHER.time.indexOf(TODAY);

const state = {
  /** @type {"marine"|"foglo"|"override"} */
  source: "override",
  overrideTemp: OVERRIDE_DEFAULTS.temp,
  overrideTrend: OVERRIDE_DEFAULTS.trend7d,
  selectedIdx: TODAY_IDX
};

// ---------------------------------------------------------------------------
// Source selection — picks which water-temp source feeds the scoring
// ---------------------------------------------------------------------------

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
// Date helpers (UI strings — kept here because they're for display)
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

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  ["marine", "foglo", "override"].forEach(s => {
    document.getElementById("src-" + s).classList.toggle("selected", state.source === s);
  });

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
  renderWeekendCallout();
  renderDetail();
}

function renderDayGrid() {
  const grid = document.getElementById("daysGrid");
  grid.innerHTML = "";
  const temp = getActiveTemp();
  const trend = getActiveTrend();

  for (let i = TODAY_IDX; i < Math.min(TODAY_IDX + 7, WEATHER.time.length); i++) {
    const d = WEATHER.time[i];
    const { total, penalties } = scoreDay(i, temp, trend);
    const card = document.createElement("button");
    card.className = "day-card" + (i === state.selectedIdx ? " selected" : "");
    card.style.background = scoreColor(total);
    card.style.border = "none";
    card.style.cursor = "pointer";
    card.onclick = () => { state.selectedIdx = i; render(); };
    card.innerHTML =
      '<div class="day-label">' + dayOfWeek(d) + (i === TODAY_IDX ? " · tänään" : "") + '</div>' +
      '<div class="day-date">' + formatDate(d) + '</div>' +
      '<div class="day-score">' + total + '</div>' +
      '<div class="day-verdict">' + scoreVerdict(total) + '</div>' +
      '<div class="day-summary">' +
        WEATHER.tmax[i].toFixed(0) + '° · ' +
        (WEATHER.windMax[i] / 3.6).toFixed(0) + ' m/s · ' +
        compassLetter(WEATHER.windDir[i]) +
      '</div>' +
      (penalties.length > 0 ? '<div class="penalty-flag">⚠ ' + penalties.length + '</div>' : '');
    grid.appendChild(card);
  }
}

function renderWeekendCallout() {
  const el = document.getElementById("weekendCallout");
  const temp = getActiveTemp();
  const trend = getActiveTrend();
  const entries = [];

  for (let i = TODAY_IDX; i < Math.min(TODAY_IDX + 7, WEATHER.time.length); i++) {
    const d = new Date(WEATHER.time[i] + "T12:00:00");
    if (d.getDay() === 0 || d.getDay() === 6) {
      entries.push({ i, score: scoreDay(i, temp, trend).total, date: WEATHER.time[i] });
    }
  }
  if (entries.length === 0) { el.innerHTML = ""; return; }

  const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length;
  let cls = "okay", msg = "";
  if (avg >= 70)      { cls = "great"; msg = "Viikonloppu näyttää lupaavalta."; }
  else if (avg >= 50) { cls = "good";  msg = "Viikonloppu on kohtuullinen."; }
  else if (avg >= 30) { cls = "okay";  msg = "Viikonloppu näyttää haastavalta."; }
  else                { cls = "bad";   msg = "Viikonloppu todennäköisesti tyhjä — sää ei ole siian puolella."; }

  const detail = entries
    .map(e => dayOfWeek(e.date) + " " + formatDate(e.date) + ": <strong>" + e.score + "</strong>")
    .join(" · ");

  el.innerHTML =
    '<div class="verdict-banner ' + cls + '">' +
      '<strong>Viikonloppuarvio:</strong> ' + msg +
      '<br><span style="font-size:12px;opacity:0.9">' + detail + '</span>' +
    '</div>';
}

function renderDetail() {
  const container = document.getElementById("detailContainer");
  const i = state.selectedIdx;
  const date = WEATHER.time[i];
  const temp = getActiveTemp();
  const trend = getActiveTrend();
  const { total, baseScore, factors, penalties, mult } = scoreDay(i, temp, trend);
  const hourly = HOURLY[date];

  let hourlyHTML = "";
  if (hourly) {
    hourlyHTML = '<div class="section-title">Tunnit (0–23)</div>' +
      '<div style="display:grid;grid-template-columns:repeat(24,1fr);gap:1px;border-radius:6px;overflow:hidden">';
    for (let h = 0; h < 24; h++) {
      const t = hourly.temp[h];
      const c = hourly.cloud[h];
      const w = hourly.wind[h];
      const isPeak = (h >= 10 && h <= 12) || (h >= 17 && h <= 19);
      const icon = c > 80 ? "☁" : c > 40 ? "⛅" : c > 10 ? "🌤" : "☀";
      hourlyHTML +=
        '<div style="font-size:9px;text-align:center;padding:4px 1px;background:' +
          (isPeak ? "#ffd166" : "#e2e8f0") + ';color:#333" ' +
          'title="' + h + ':00 · ' + t + '°C · ' + c + '% · ' + (w / 3.6).toFixed(0) + ' m/s">' +
          '<div style="font-weight:600;font-size:10px">' + h + '</div>' +
          '<div style="font-size:14px">' + icon + '</div>' +
          '<div>' + Math.round(t) + '°</div>' +
        '</div>';
    }
    hourlyHTML += '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:4px">' +
        '<span style="background:#ffd166;padding:1px 6px;border-radius:3px">keltaiset</span>' +
        ' = siian syöntipiikit (10–12, 17–19)</div>';
  }

  let factorsHTML = '<div class="section-title">Pisteytyksen osatekijät</div><div class="factors-grid">';
  for (const f of factors) {
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

  container.innerHTML =
    '<div class="detail-panel">' +
      '<div class="detail-header">' +
        '<h2>' + dayOfWeek(date) + ' ' + formatDate(date) +
          (i === TODAY_IDX ? " (tänään)" : "") + '</h2>' +
        '<div class="big-score" style="color:' + scoreColor(total) + '">' +
          total + ' / 100 · ' + scoreVerdict(total) +
        '</div>' +
      '</div>' +
      '<div class="score-formula">' +
        '<strong>Laskenta:</strong> Pohjapisteet ' + baseScore + '/100' +
        (mult < 1
          ? ', kerrottuna rangaistuksella <strong>×' + mult.toFixed(2) + '</strong> → <strong>' + total + '</strong>'
          : ', ei rangaistuksia') + '.' +
        (penalties.length > 0
          ? '<div class="penalty-alert">⚠ <strong>Kriittiset tekijät:</strong> ' + penalties.join(" · ") + '</div>'
          : '') +
      '</div>' +
      hourlyHTML +
      factorsHTML +
    '</div>';
}

// ---------------------------------------------------------------------------
// Override controls (water temp + trend sliders)
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

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function init() {
  // Inject the snapshot timestamp into the status bar.
  const stamp = document.getElementById("dataStamp");
  if (stamp) stamp.textContent = FETCHED_AT.replace("T", " ");

  // Inject baked-in source values.
  document.getElementById("marine-temp").textContent = MARINE.todayTemp.toFixed(1) + " °C";
  document.getElementById("marine-trend").textContent =
    "7 vrk: " + (MARINE.trend7d >= 0 ? "+" : "") + MARINE.trend7d.toFixed(1) + " °C";
  document.getElementById("foglo-temp").textContent = FOGLO.todayTemp.toFixed(1) + " °C";
  document.getElementById("foglo-trend").textContent =
    "7 vrk: " + (FOGLO.trend7d >= 0 ? "+" : "") + FOGLO.trend7d.toFixed(1) + " °C";

  // Initialize override slider/input values.
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

function setupSourceCards() {
  for (const card of document.querySelectorAll(".source-card[data-source]")) {
    card.addEventListener("click", () => selectSource(card.dataset.source));
  }
}

init();
