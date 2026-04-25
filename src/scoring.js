/**
 * scoring.js — pure scoring functions.
 *
 * No DOM access. No global mutable state. Inputs in, numbers/objects out.
 * This is the part that matters for testing. See docs/methodology.md for
 * the full algorithm specification (this file is the implementation).
 *
 * Layered structure:
 *   1. triangular() — generic shape function.
 *   2. siika scoring — original 11-factor model, exported as scoreDay()
 *      and per-factor scorers. Kept byte-identical for backward compat.
 *   3. rantakalastus species — scoreHauki, scoreAhven, scoreKuha. Same
 *      output shape as scoreDay.
 *   4. Dispatchers — scoreSpecies, scoreRantakalastus.
 *   5. Hourly — scoreHour, bestHourWindow, plus the time-of-day helpers.
 *   6. Display helpers — compassLetter, scoreColor, scoreVerdict, etc.
 *   7. SPECIES_META — labels, emoji, tackle text, peak hours.
 */

import { WEATHER, HOURLY, TODAY } from "./data/data.js";

const TODAY_IDX = WEATHER.time.indexOf(TODAY);

// ---------------------------------------------------------------------------
// Generic shape function
// ---------------------------------------------------------------------------

/**
 * Triangular score function.
 *
 *   v ≤ hardLo                  → 0
 *   v ≥ hardHi                  → 0
 *   optLo ≤ v ≤ optHi           → 100
 *   hardLo < v < optLo          → linear ramp 0 → 100
 *   optHi < v < hardHi          → linear ramp 100 → 0
 *
 * @param {number} v
 * @param {number} hardLo
 * @param {number} optLo
 * @param {number} optHi
 * @param {number} hardHi
 * @returns {number} 0–100
 */
export function triangular(v, hardLo, optLo, optHi, hardHi) {
  if (v <= hardLo || v >= hardHi) return 0;
  if (v >= optLo && v <= optHi) return 100;
  if (v < optLo) return ((v - hardLo) / (optLo - hardLo)) * 100;
  return ((hardHi - v) / (hardHi - optHi)) * 100;
}

// ---------------------------------------------------------------------------
// Per-factor scorers (siika defaults — unchanged from Phase 1)
// ---------------------------------------------------------------------------

/** Water temperature score. Optimum 6–10 °C, hard bounds 2 and 14. */
export function scoreWaterTemp(t) {
  return triangular(t, 2, 6, 10, 14);
}

/** Water-temperature 7-day trend score. Step function (see methodology.md). */
export function scoreWaterTrend(dt) {
  if (dt >= 1 && dt <= 4) return 100;
  if (dt >= 0 && dt < 1) return 80;
  if (dt > 4) return 70;
  if (dt >= -1) return 65;
  if (dt >= -2) return 35;
  if (dt >= -3) return 15;
  return 5;
}

/** Pressure-change score: |Δp| in hPa, optimum 3–8, hard bounds 0 and 15. */
export function scorePressureChange(dp) {
  return triangular(Math.abs(dp), 0, 3, 8, 15);
}

/** Wind speed score (km/h input). Calm = 40 (no bottom stir, sight feeding fine). */
export function scoreWindSpeed(kmh) {
  const ms = kmh / 3.6;
  if (ms < 0.5) return 40;
  return triangular(ms, 0, 2, 6, 14);
}

/**
 * Wind direction score relative to Saaronniemi cape geometry.
 * Best = SW (225°, onshore + warm). Worst = NE (45°, offshore + cold).
 */
export function scoreWindDir(deg) {
  const dist = Math.min(Math.abs(deg - 225), 360 - Math.abs(deg - 225));
  return Math.round(100 * (1 - dist / 180));
}

/** Today's precipitation (mm). */
export function scorePrecipToday(mm) {
  if (mm < 0.5) return 100;
  if (mm < 2) return 80;
  if (mm < 5) return 50;
  if (mm < 10) return 25;
  return 10;
}

/** Cumulative precipitation in the previous 48h (mm). */
export function scorePrecip48h(mm) {
  if (mm < 2) return 100;
  if (mm < 8) return 70;
  if (mm < 20) return 40;
  return 15;
}

/** Cloud cover (% mean). Note: piecewise, not triangular. */
export function scoreCloud(p) {
  if (p <= 10) return 85;
  if (p <= 60) return 100;
  if (p <= 80) return 70;
  if (p <= 95) return 45;
  return 25;
}

/** Air temperature (°C max). Lower weight than water temp; air is a poor proxy. */
export function scoreAirTemp(t) {
  return triangular(t, -5, 6, 14, 22);
}

/** Air-temperature 48h trend (Δ°C). */
export function scoreAirTrend(dt) {
  if (dt >= 0 && dt <= 5) return 100;
  if (dt > 5) return 70;
  if (dt >= -2) return 70;
  if (dt >= -5) return 40;
  return 20;
}

// ---------------------------------------------------------------------------
// Day-level composite scoring — siika (Phase 1, unchanged behaviour)
// ---------------------------------------------------------------------------

/**
 * Compute the full score for a single day.
 *
 * @param {number} idx              Index into WEATHER.time
 * @param {number} waterTempToday   °C — current shore water temp (whatever source)
 * @param {number} waterTrend7d     °C — water temperature change over last 7 days
 * @returns {{
 *   total: number,        // final 0–100 score after multipliers
 *   baseScore: number,    // 0–100 weighted-average score before multipliers
 *   factors: Array<{key:string, label:string, weight:number, score:number,
 *                   value:string, reason:string, critical?:boolean}>,
 *   penalties: string[],  // human-readable penalty descriptions
 *   mult: number,         // product of multipliers (1.0 = no penalty)
 *   projectedWater: number  // °C — water temp projected to this day
 * }}
 */
export function scoreDay(idx, waterTempToday, waterTrend7d) {
  const factors = [];

  // Pressure change
  const pToday = WEATHER.pMean[idx];
  const p24Ago = idx > 0 ? WEATHER.pMean[idx - 1] : pToday;
  const p48Ago = idx > 1 ? WEATHER.pMean[idx - 2] : pToday;
  const dp24 = pToday - p24Ago;
  const dp48 = pToday - p48Ago;

  // Precipitation
  const precip24 = WEATHER.precip[idx];
  const precip48Prev =
    (idx > 0 ? WEATHER.precip[idx - 1] : 0) +
    (idx > 1 ? WEATHER.precip[idx - 2] : 0);

  // Air temperature trend
  const tmaxPrev = idx > 1 ? WEATHER.tmax[idx - 2] : WEATHER.tmax[idx];
  const airTrend = WEATHER.tmax[idx] - tmaxPrev;

  // Wind
  const windKmh = WEATHER.windMax[idx];
  const windMs = windKmh / 3.6;
  const windDir = WEATHER.windDir[idx];
  const cloudPct = WEATHER.cloudMean[idx];

  // Project water temperature for future days (crude — see methodology.md)
  const daysFromToday = idx - TODAY_IDX;
  let projectedWater = waterTempToday;
  if (daysFromToday > 0 && TODAY_IDX >= 0) {
    const airAvgToday = (WEATHER.tmax[TODAY_IDX] + WEATHER.tmin[TODAY_IDX]) / 2;
    const airAvgTarget = (WEATHER.tmax[idx] + WEATHER.tmin[idx]) / 2;
    projectedWater =
      waterTempToday +
      (airAvgTarget - airAvgToday) * 0.2 * Math.min(daysFromToday, 5) / 5;
    projectedWater = Math.max(1, Math.min(18, projectedWater));
  }

  // Score each factor
  const wtScore = scoreWaterTemp(projectedWater);
  const wtrendScore = scoreWaterTrend(waterTrend7d);
  const p24Score = scorePressureChange(dp24);
  const p48Score = scorePressureChange(dp48);
  const wSpeedScore = scoreWindSpeed(windKmh);
  const wDirScore = scoreWindDir(windDir);
  const pr24 = scorePrecipToday(precip24);
  const pr48 = scorePrecip48h(precip48Prev);
  const cloudScore = scoreCloud(cloudPct);
  const airTempScore = scoreAirTemp(WEATHER.tmax[idx]);
  const airTrendScore = scoreAirTrend(airTrend);

  factors.push({
    key: "wt", label: "Vesilämpötila", weight: 20, score: wtScore, critical: true,
    value: projectedWater.toFixed(1) + " °C" + (daysFromToday > 0 ? " (arvio)" : ""),
    reason:
      projectedWater < 3 ? "Liian kylmä" :
      projectedWater < 5 ? "Liian kylmä — siika syvemmällä" :
      projectedWater < 6 ? "Rajalla" :
      projectedWater <= 10 ? "Optimi" :
      projectedWater <= 12 ? "Kauden loppu" : "Kausi ohi"
  });
  factors.push({
    key: "wtrend", label: "Vesilämpötilan trendi", weight: 10, score: wtrendScore, critical: true,
    value: (waterTrend7d >= 0 ? "+" : "") + waterTrend7d.toFixed(1) + " °C / 7 vrk",
    reason:
      waterTrend7d > 0.5 ? "Lämpenevää" :
      waterTrend7d > -0.5 ? "Vakaa" :
      waterTrend7d > -2 ? "Hienoista kylmenemistä" :
      "Selvä romahdus"
  });
  factors.push({
    key: "p24", label: "Paineen muutos 24h", weight: 12, score: p24Score,
    value: (dp24 >= 0 ? "+" : "") + dp24.toFixed(1) + " hPa",
    reason:
      p24Score >= 70 ? "Ihanteellinen" :
      Math.abs(dp24) < 3 ? "Liian stabiili" :
      Math.abs(dp24) > 10 ? "Liian voimakas" : "Ei optimaalinen"
  });
  factors.push({
    key: "p48", label: "Paineen muutos 48h", weight: 6, score: p48Score,
    value: (dp48 >= 0 ? "+" : "") + dp48.toFixed(1) + " hPa",
    reason: p48Score >= 70 ? "Sääjärjestelmä muuttunut" : "Hidasta"
  });
  factors.push({
    key: "ws", label: "Tuulen voimakkuus", weight: 10, score: wSpeedScore,
    value: windMs.toFixed(1) + " m/s",
    reason:
      wSpeedScore >= 70 ? "Sopiva" :
      windMs < 1 ? "Tyyntä" :
      windMs > 10 ? "Liian kova" : "Reipasta"
  });
  factors.push({
    key: "wd", label: "Tuulen suunta", weight: 10, score: wDirScore,
    value: Math.round(windDir) + "° " + compassLetter(windDir),
    reason:
      wDirScore >= 70 ? "Onshore (S/SW/W)" :
      wDirScore >= 40 ? "Sivutuuli" : "Offshore — kylmä"
  });
  factors.push({
    key: "r24", label: "Sade 24h", weight: 6, score: pr24,
    value: precip24.toFixed(1) + " mm",
    reason: pr24 >= 80 ? "Kuiva" : precip24 > 5 ? "Rankkaa" : "Kohtalaista"
  });
  factors.push({
    key: "r48", label: "Sade edellä 48h", weight: 6, score: pr48,
    value: precip48Prev.toFixed(1) + " mm",
    reason: pr48 >= 80 ? "Kuivia" : precip48Prev > 10 ? "Sateisia" : "Kohtalaisesti"
  });
  factors.push({
    key: "cc", label: "Pilvisyys", weight: 6, score: cloudScore,
    value: Math.round(cloudPct) + " %",
    reason: cloudScore >= 80 ? "Aurinkoa" : cloudPct > 90 ? "Täyspilvinen" : "Vaihtelevaa"
  });
  factors.push({
    key: "at", label: "Ilman lämpötila", weight: 4, score: airTempScore,
    value: WEATHER.tmax[idx].toFixed(1) + " °C",
    reason:
      airTempScore >= 70 ? "Optimi" :
      WEATHER.tmax[idx] < 3 ? "Liian kylmä" : "Rajalla"
  });
  factors.push({
    key: "att", label: "Ilman trendi 48h", weight: 10, score: airTrendScore,
    value: (airTrend >= 0 ? "+" : "") + airTrend.toFixed(1) + " °C",
    reason:
      airTrendScore >= 80 ? "Lämpenevää" :
      airTrend < -3 ? "Kylmenee" : "Pieni muutos"
  });

  // Weighted average
  let total = 0, totalW = 0;
  for (const f of factors) { total += f.score * f.weight; totalW += f.weight; }
  const baseScore = total / totalW;

  // Critical penalty multipliers
  const penalties = [];
  let mult = 1.0;
  if (projectedWater < 4) {
    mult *= 0.4;
    penalties.push("Vesi " + projectedWater.toFixed(1) + " °C (<4) · ×0.4");
  } else if (projectedWater < 5) {
    mult *= 0.6;
    penalties.push("Vesi " + projectedWater.toFixed(1) + " °C (kylmä) · ×0.6");
  } else if (projectedWater > 12) {
    mult *= 0.5;
    penalties.push("Vesi >12 °C — kausi ohi · ×0.5");
  }
  if (waterTrend7d <= -2.5) {
    mult *= 0.5;
    penalties.push("Veden äkillinen romahdus · ×0.5");
  } else if (waterTrend7d <= -1.5) {
    mult *= 0.75;
    penalties.push("Vesi kylmenee · ×0.75");
  }
  if (wDirScore < 30 && windMs > 8 && projectedWater < 7) {
    mult *= 0.7;
    penalties.push("Kylmä kova offshore-tuuli · ×0.7");
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(baseScore * mult))),
    baseScore: Math.round(baseScore),
    factors,
    penalties,
    mult,
    projectedWater
  };
}

// ---------------------------------------------------------------------------
// Shared helpers for the rantakalastus species
// ---------------------------------------------------------------------------

/**
 * Generic onshore-preference wind direction scorer (no Saaronniemi-specific
 * 225° peak). Treats S/SW/W (135–315) as onshore-positive and N/NE
 * (315–135 the short way) as offshore-negative. Smooth ramp.
 */
function scoreWindDirGeneric(deg) {
  // Compass arc: 270° (W) is most onshore for a generic open-Baltic shore;
  // we widen the optimum band to 180–270 and ramp out.
  const onshoreCenter = 225;
  const dist = Math.min(Math.abs(deg - onshoreCenter), 360 - Math.abs(deg - onshoreCenter));
  return Math.round(100 * (1 - dist / 180));
}

/** Pressure-change scorer with a falling-pressure bonus (hauki). */
function scorePressureChangeHauki(dp) {
  const base = scorePressureChange(dp);
  // Light bonus when pressure is falling within the optimum band:
  if (dp < 0 && Math.abs(dp) >= 3 && Math.abs(dp) <= 8) {
    return Math.min(100, base + 10);
  }
  return base;
}

/** Cloud preference for hauki: overcast best, clear worst. */
function scoreCloudHauki(p) {
  if (p >= 70) return 100;
  if (p >= 40) return 80;
  if (p >= 20) return 55;
  return 30;
}

/** Cloud preference for kuha: low-light favoured even more strongly. */
function scoreCloudKuha(p) {
  if (p >= 70) return 100;
  if (p >= 40) return 75;
  if (p >= 20) return 45;
  return 20;
}

/** Cloud preference for ahven: partly-cloudy band best. */
function scoreCloudAhven(p) {
  if (p <= 10) return 70;
  if (p <= 60) return 100;
  if (p <= 80) return 75;
  if (p <= 95) return 50;
  return 30;
}

/** Precipitation today, kuha-friendly polarity (light rain mildly positive). */
function scorePrecipTodayKuha(mm) {
  if (mm < 0.5) return 80;
  if (mm < 5) return 100;
  if (mm < 15) return 70;
  return 40;
}

/** 48h cumulative precipitation, kuha-friendly. */
function scorePrecip48hKuha(mm) {
  if (mm < 2) return 80;
  if (mm < 15) return 100;
  if (mm < 30) return 60;
  return 30;
}

/** Hauki precipitation tolerance (light = neutral, heavy = mildly negative). */
function scorePrecipTodayHauki(mm) {
  if (mm < 5) return 90;
  if (mm < 15) return 70;
  return 50;
}

function scorePrecip48hHauki(mm) {
  if (mm < 10) return 90;
  if (mm < 25) return 70;
  return 50;
}

/** Hauki water-temp triangular: optimum 12–18 °C. */
function scoreWaterTempHauki(t) {
  return triangular(t, 4, 12, 18, 23);
}

/** Ahven water-temp triangular: optimum 14–19 °C. */
function scoreWaterTempAhven(t) {
  return triangular(t, 6, 14, 19, 24);
}

/** Kuha water-temp triangular: optimum 18–22 °C. */
function scoreWaterTempKuha(t) {
  return triangular(t, 10, 18, 22, 25);
}

/**
 * Project water temperature for a future day, with a per-species clamp.
 * Same crude air-delta projection as siika.
 */
function projectWater(idx, waterTempToday, clamp) {
  const daysFromToday = idx - TODAY_IDX;
  if (daysFromToday <= 0 || TODAY_IDX < 0) {
    return { projected: waterTempToday, daysFromToday };
  }
  const airAvgToday = (WEATHER.tmax[TODAY_IDX] + WEATHER.tmin[TODAY_IDX]) / 2;
  const airAvgTarget = (WEATHER.tmax[idx] + WEATHER.tmin[idx]) / 2;
  let p = waterTempToday +
    (airAvgTarget - airAvgToday) * 0.2 * Math.min(daysFromToday, 5) / 5;
  p = Math.max(clamp[0], Math.min(clamp[1], p));
  return { projected: p, daysFromToday };
}

/** Compute pressure deltas, precip totals, air-temp trend etc. shared by all species. */
function dayInputs(idx) {
  const pToday = WEATHER.pMean[idx];
  const p24Ago = idx > 0 ? WEATHER.pMean[idx - 1] : pToday;
  const p48Ago = idx > 1 ? WEATHER.pMean[idx - 2] : pToday;
  const dp24 = pToday - p24Ago;
  const dp48 = pToday - p48Ago;
  const precip24 = WEATHER.precip[idx];
  const precip48Prev =
    (idx > 0 ? WEATHER.precip[idx - 1] : 0) +
    (idx > 1 ? WEATHER.precip[idx - 2] : 0);
  const tmaxPrev = idx > 1 ? WEATHER.tmax[idx - 2] : WEATHER.tmax[idx];
  const airTrend = WEATHER.tmax[idx] - tmaxPrev;
  const windKmh = WEATHER.windMax[idx];
  const windMs = windKmh / 3.6;
  const windDir = WEATHER.windDir[idx];
  const cloudPct = WEATHER.cloudMean[idx];
  return {
    dp24, dp48, precip24, precip48Prev, airTrend,
    windKmh, windMs, windDir, cloudPct
  };
}

// ---------------------------------------------------------------------------
// Season gates — return a 0–1 multiplier applied to the base score
// ---------------------------------------------------------------------------

function dateMonth(dateStr) {
  // dateStr = "YYYY-MM-DD"
  return Number(dateStr.slice(5, 7));
}

function dateDayOfYear(dateStr) {
  const d = new Date(dateStr + "T12:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / 86400_000) + 1;
}

/** Hauki: spring post-spawn + autumn peak, summer slump driven by water temp. */
function seasonGateHauki(dateStr, projectedWater) {
  const m = dateMonth(dateStr);
  // Hard off in midwinter (Dec–Mar after freeze).
  if (m === 1 || m === 2 || m === 3) return 0.2;
  // Summer slump triggered by warm water rather than the calendar.
  if (projectedWater > 19) return 0.5;
  return 1;
}

/** Ahven: broad season, tail off in deep winter. */
function seasonGateAhven(dateStr, projectedWater) {
  const m = dateMonth(dateStr);
  if (m === 1 || m === 2) return 0.2;
  if (m === 3 || m === 12) return 0.5;
  return 1;
}

/** Kuha: closed Apr 1 – May 31, peak Jun 15 – Sep, taper through Oct, off in winter. */
function seasonGateKuha(dateStr, projectedWater) {
  const m = dateMonth(dateStr);
  // Closed season for kuha in Finnish saltwater
  if (m === 4 || m === 5) return 0;
  if (m === 6) {
    // Soft ramp June 15 -> June 25
    const day = Number(dateStr.slice(8, 10));
    if (day < 15) return 0.2;
    if (day < 25) return 0.6;
    return 1;
  }
  if (m === 7 || m === 8 || m === 9) return 1;
  if (m === 10) return 0.6;
  if (m === 11 || m === 12 || m === 1 || m === 2 || m === 3) return 0.1;
  return 0.5;
}

// ---------------------------------------------------------------------------
// Rantakalastus species — Hauki, Ahven, Kuha
// ---------------------------------------------------------------------------

/** Score a hauki day. Same return shape as scoreDay(). */
export function scoreHauki(idx, waterTempToday, waterTrend7d) {
  const inputs = dayInputs(idx);
  const dateStr = WEATHER.time[idx];
  const { projected: projectedWater, daysFromToday } =
    projectWater(idx, waterTempToday, [2, 24]);

  const wtScore = scoreWaterTempHauki(projectedWater);
  const wtrendScore = scoreWaterTrend(waterTrend7d);
  const p24Score = scorePressureChangeHauki(inputs.dp24);
  const p48Score = scorePressureChange(inputs.dp48);
  const wSpeedScore = scoreWindSpeed(inputs.windKmh);
  const wDirScore = scoreWindDirGeneric(inputs.windDir);
  const pr24 = scorePrecipTodayHauki(inputs.precip24);
  const pr48 = scorePrecip48hHauki(inputs.precip48Prev);
  const cloudScore = scoreCloudHauki(inputs.cloudPct);
  const airTempScore = triangular(WEATHER.tmax[idx], 0, 8, 18, 25);
  const airTrendScore = scoreAirTrend(inputs.airTrend);

  const factors = [
    {
      key: "wt", label: "Vesilämpötila", weight: 22, score: wtScore, critical: true,
      value: projectedWater.toFixed(1) + " °C" + (daysFromToday > 0 ? " (arvio)" : ""),
      reason:
        projectedWater < 6 ? "Kylmää — hauki hidas" :
        projectedWater < 12 ? "OK kevät/syys" :
        projectedWater <= 18 ? "Optimi" :
        projectedWater <= 22 ? "Lämmin — hämärässä" : "Liian lämmin"
    },
    {
      key: "wtrend", label: "Veden trendi", weight: 5, score: wtrendScore,
      value: (waterTrend7d >= 0 ? "+" : "") + waterTrend7d.toFixed(1) + " °C / 7 vrk",
      reason:
        waterTrend7d > 0.5 ? "Lämpenevää" :
        waterTrend7d > -1 ? "Vakaa" : "Kylmenee"
    },
    {
      key: "p24", label: "Paineen muutos 24h", weight: 13, score: p24Score,
      value: (inputs.dp24 >= 0 ? "+" : "") + inputs.dp24.toFixed(1) + " hPa",
      reason:
        inputs.dp24 < -3 && inputs.dp24 > -8 ? "Laskussa — ennen rintamaa" :
        p24Score >= 70 ? "Hyvä muutos" :
        Math.abs(inputs.dp24) < 3 ? "Liian stabiili" : "Ei optimaalinen"
    },
    {
      key: "p48", label: "Paineen muutos 48h", weight: 5, score: p48Score,
      value: (inputs.dp48 >= 0 ? "+" : "") + inputs.dp48.toFixed(1) + " hPa",
      reason: p48Score >= 70 ? "Sääjärjestelmä liikkuu" : "Hidasta"
    },
    {
      key: "ws", label: "Tuulen voimakkuus", weight: 15, score: wSpeedScore,
      value: inputs.windMs.toFixed(1) + " m/s",
      reason:
        inputs.windMs >= 4 && inputs.windMs <= 8 ? "Optimi 4–8 m/s" :
        inputs.windMs < 3 ? "Liian tyyntä" :
        inputs.windMs > 10 ? "Liian kovaa" : "Reipasta"
    },
    {
      key: "wd", label: "Tuulen suunta", weight: 10, score: wDirScore,
      value: Math.round(inputs.windDir) + "° " + compassLetter(inputs.windDir),
      reason:
        wDirScore >= 70 ? "Onshore — syöttikalat rantaan" :
        wDirScore >= 40 ? "Sivutuuli" : "Offshore — kylmä"
    },
    {
      key: "r24", label: "Sade 24h", weight: 3, score: pr24,
      value: inputs.precip24.toFixed(1) + " mm",
      reason: inputs.precip24 < 1 ? "Kuiva" : inputs.precip24 < 8 ? "Pieni sade" : "Rankkaa"
    },
    {
      key: "r48", label: "Sade edellä 48h", weight: 2, score: pr48,
      value: inputs.precip48Prev.toFixed(1) + " mm",
      reason: pr48 >= 80 ? "Kuivia" : "Sateisia"
    },
    {
      key: "cc", label: "Pilvisyys", weight: 15, score: cloudScore,
      value: Math.round(inputs.cloudPct) + " %",
      reason:
        inputs.cloudPct >= 70 ? "Pilvistä — hauelle hyvä" :
        inputs.cloudPct >= 40 ? "Vaihtelevaa" :
        inputs.cloudPct >= 20 ? "Aurinkoinen" : "Kirkas — vaikea"
    },
    {
      key: "at", label: "Ilman lämpötila", weight: 2, score: airTempScore,
      value: WEATHER.tmax[idx].toFixed(1) + " °C",
      reason: airTempScore >= 70 ? "Sopiva" : "Rajalla"
    },
    {
      key: "att", label: "Ilman trendi 48h", weight: 3, score: airTrendScore,
      value: (inputs.airTrend >= 0 ? "+" : "") + inputs.airTrend.toFixed(1) + " °C",
      reason: airTrendScore >= 80 ? "Lämpenevää" : "Pieni muutos"
    },
    // Time-of-day surfaced as a factor for scoring purposes.
    {
      key: "tod", label: "Vuorokaudenaika", weight: 5, score: 70,
      value: "Aamu/ilta",
      reason: "Hämärät parhaat — katso tunnit"
    }
  ];

  let total = 0, totalW = 0;
  for (const f of factors) { total += f.score * f.weight; totalW += f.weight; }
  let baseScore = total / totalW;

  const seasonMult = seasonGateHauki(dateStr, projectedWater);
  const penalties = [];
  let mult = seasonMult;
  if (seasonMult < 1) {
    penalties.push("Kausi: ×" + seasonMult.toFixed(2));
  }
  if (projectedWater < 4) {
    mult *= 0.4;
    penalties.push("Vesi <4 °C · ×0.4");
  } else if (projectedWater > 23) {
    mult *= 0.4;
    penalties.push("Vesi >23 °C · ×0.4");
  }
  if (waterTrend7d <= -2.5) {
    mult *= 0.7;
    penalties.push("Veden äkillinen romahdus · ×0.7");
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(baseScore * mult))),
    baseScore: Math.round(baseScore),
    factors,
    penalties,
    mult,
    projectedWater
  };
}

/** Score an ahven day. Same return shape as scoreDay(). */
export function scoreAhven(idx, waterTempToday, waterTrend7d) {
  const inputs = dayInputs(idx);
  const dateStr = WEATHER.time[idx];
  const { projected: projectedWater, daysFromToday } =
    projectWater(idx, waterTempToday, [2, 25]);

  const wtScore = scoreWaterTempAhven(projectedWater);
  const wtrendScore = scoreWaterTrend(waterTrend7d);
  const p24Score = scorePressureChange(inputs.dp24);
  const p48Score = scorePressureChange(inputs.dp48);
  const wSpeedScore = scoreWindSpeed(inputs.windKmh);
  const wDirScore = scoreWindDirGeneric(inputs.windDir);
  const pr24 = scorePrecipToday(inputs.precip24);
  const pr48 = scorePrecip48h(inputs.precip48Prev);
  const cloudScore = scoreCloudAhven(inputs.cloudPct);
  const airTempScore = triangular(WEATHER.tmax[idx], 0, 10, 22, 28);
  const airTrendScore = scoreAirTrend(inputs.airTrend);

  const factors = [
    {
      key: "wt", label: "Vesilämpötila", weight: 25, score: wtScore, critical: true,
      value: projectedWater.toFixed(1) + " °C" + (daysFromToday > 0 ? " (arvio)" : ""),
      reason:
        projectedWater < 8 ? "Kylmää — ahven hidas" :
        projectedWater < 14 ? "OK kevät/syys" :
        projectedWater <= 19 ? "Optimi" :
        projectedWater <= 22 ? "Lämmin" : "Liian lämmin"
    },
    {
      key: "wtrend", label: "Veden trendi", weight: 8, score: wtrendScore,
      value: (waterTrend7d >= 0 ? "+" : "") + waterTrend7d.toFixed(1) + " °C / 7 vrk",
      reason:
        waterTrend7d > 1 ? "Selvä lämpeneminen" :
        waterTrend7d > -1 ? "Vakaa" : "Kylmenee"
    },
    {
      key: "p24", label: "Paineen muutos 24h", weight: 8, score: p24Score,
      value: (inputs.dp24 >= 0 ? "+" : "") + inputs.dp24.toFixed(1) + " hPa",
      reason: p24Score >= 70 ? "Hyvä muutos" : "Ei optimi"
    },
    {
      key: "p48", label: "Paineen muutos 48h", weight: 4, score: p48Score,
      value: (inputs.dp48 >= 0 ? "+" : "") + inputs.dp48.toFixed(1) + " hPa",
      reason: p48Score >= 70 ? "Liikkuva sää" : "Hidasta"
    },
    {
      key: "ws", label: "Tuulen voimakkuus", weight: 10, score: wSpeedScore,
      value: inputs.windMs.toFixed(1) + " m/s",
      reason:
        inputs.windMs >= 2 && inputs.windMs <= 6 ? "Optimi 2–6 m/s" :
        inputs.windMs < 1 ? "Tyyntä — OK" :
        inputs.windMs > 8 ? "Kova — parvet hajaantuvat" : "Reipasta"
    },
    {
      key: "wd", label: "Tuulen suunta", weight: 5, score: wDirScore,
      value: Math.round(inputs.windDir) + "° " + compassLetter(inputs.windDir),
      reason:
        wDirScore >= 70 ? "Onshore — syöttikalat rantaan" :
        wDirScore >= 40 ? "Sivutuuli" : "Offshore"
    },
    {
      key: "r24", label: "Sade 24h", weight: 5, score: pr24,
      value: inputs.precip24.toFixed(1) + " mm",
      reason: pr24 >= 80 ? "Kuiva" : inputs.precip24 > 5 ? "Rankkaa" : "Pieni sade"
    },
    {
      key: "r48", label: "Sade edellä 48h", weight: 5, score: pr48,
      value: inputs.precip48Prev.toFixed(1) + " mm",
      reason: pr48 >= 80 ? "Kuivia" : "Sateisia"
    },
    {
      key: "cc", label: "Pilvisyys", weight: 12, score: cloudScore,
      value: Math.round(inputs.cloudPct) + " %",
      reason:
        cloudScore >= 90 ? "Puolipilvistä — paras" :
        inputs.cloudPct < 20 ? "Hyvin kirkasta" :
        inputs.cloudPct > 90 ? "Täyspilvinen" : "OK"
    },
    {
      key: "at", label: "Ilman lämpötila", weight: 4, score: airTempScore,
      value: WEATHER.tmax[idx].toFixed(1) + " °C",
      reason: airTempScore >= 70 ? "Sopiva" : "Rajalla"
    },
    {
      key: "att", label: "Ilman trendi 48h", weight: 4, score: airTrendScore,
      value: (inputs.airTrend >= 0 ? "+" : "") + inputs.airTrend.toFixed(1) + " °C",
      reason: airTrendScore >= 80 ? "Lämpenevää" : "Pieni muutos"
    },
    {
      key: "tod", label: "Vuorokaudenaika", weight: 10, score: 80,
      value: "Päiväaikaan",
      reason: "Aamupäivä ja iltapäivä — katso tunnit"
    }
  ];

  let total = 0, totalW = 0;
  for (const f of factors) { total += f.score * f.weight; totalW += f.weight; }
  let baseScore = total / totalW;

  const seasonMult = seasonGateAhven(dateStr, projectedWater);
  const penalties = [];
  let mult = seasonMult;
  if (seasonMult < 1) penalties.push("Kausi: ×" + seasonMult.toFixed(2));
  if (projectedWater < 6) {
    mult *= 0.5;
    penalties.push("Vesi <6 °C · ×0.5");
  } else if (projectedWater > 23) {
    mult *= 0.5;
    penalties.push("Vesi >23 °C · ×0.5");
  }
  if (waterTrend7d <= -2.5) {
    mult *= 0.7;
    penalties.push("Veden romahdus · ×0.7");
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(baseScore * mult))),
    baseScore: Math.round(baseScore),
    factors,
    penalties,
    mult,
    projectedWater
  };
}

/** Score a kuha day. Same return shape as scoreDay(). */
export function scoreKuha(idx, waterTempToday, waterTrend7d) {
  const inputs = dayInputs(idx);
  const dateStr = WEATHER.time[idx];
  const { projected: projectedWater, daysFromToday } =
    projectWater(idx, waterTempToday, [4, 26]);

  const wtScore = scoreWaterTempKuha(projectedWater);
  const wtrendScore = scoreWaterTrend(waterTrend7d);
  const p24Score = scorePressureChange(inputs.dp24);
  const p48Score = scorePressureChange(inputs.dp48);
  const wSpeedScore = scoreWindSpeed(inputs.windKmh);
  const wDirScore = scoreWindDirGeneric(inputs.windDir);
  const pr24 = scorePrecipTodayKuha(inputs.precip24);
  const pr48 = scorePrecip48hKuha(inputs.precip48Prev);
  const cloudScore = scoreCloudKuha(inputs.cloudPct);
  const airTempScore = triangular(WEATHER.tmax[idx], 5, 14, 24, 30);
  const airTrendScore = scoreAirTrend(inputs.airTrend);

  const factors = [
    {
      key: "wt", label: "Vesilämpötila", weight: 22, score: wtScore, critical: true,
      value: projectedWater.toFixed(1) + " °C" + (daysFromToday > 0 ? " (arvio)" : ""),
      reason:
        projectedWater < 12 ? "Liian kylmä" :
        projectedWater < 18 ? "Käynnistymässä" :
        projectedWater <= 22 ? "Optimi" :
        projectedWater <= 24 ? "Lämmin — yöllä" : "Liian lämmin"
    },
    {
      key: "wtrend", label: "Veden trendi", weight: 5, score: wtrendScore,
      value: (waterTrend7d >= 0 ? "+" : "") + waterTrend7d.toFixed(1) + " °C / 7 vrk",
      reason: waterTrend7d > 0 ? "Lämpenevää" : waterTrend7d > -1 ? "Vakaa" : "Kylmenee"
    },
    {
      key: "p24", label: "Paineen muutos 24h", weight: 7, score: p24Score,
      value: (inputs.dp24 >= 0 ? "+" : "") + inputs.dp24.toFixed(1) + " hPa",
      reason: p24Score >= 70 ? "Hyvä muutos" : "Liian stabiili"
    },
    {
      key: "p48", label: "Paineen muutos 48h", weight: 3, score: p48Score,
      value: (inputs.dp48 >= 0 ? "+" : "") + inputs.dp48.toFixed(1) + " hPa",
      reason: p48Score >= 70 ? "Liikkuva sää" : "Hidasta"
    },
    {
      key: "ws", label: "Tuulen voimakkuus", weight: 10, score: wSpeedScore,
      value: inputs.windMs.toFixed(1) + " m/s",
      reason:
        inputs.windMs >= 4 && inputs.windMs <= 8 ? "Kuhakeli — optimi" :
        inputs.windMs < 1 ? "Tyyntä — yöllä" :
        inputs.windMs > 12 ? "Liian kovaa" : "Reipasta"
    },
    {
      key: "wd", label: "Tuulen suunta", weight: 5, score: wDirScore,
      value: Math.round(inputs.windDir) + "° " + compassLetter(inputs.windDir),
      reason: wDirScore >= 70 ? "Onshore" : wDirScore >= 40 ? "Sivutuuli" : "Offshore"
    },
    {
      key: "r24", label: "Sade 24h", weight: 4, score: pr24,
      value: inputs.precip24.toFixed(1) + " mm",
      reason:
        inputs.precip24 < 0.5 ? "Kuiva — kirkas vesi" :
        inputs.precip24 < 5 ? "Pieni sade — kuhakeli" :
        inputs.precip24 < 15 ? "Reipas sade" : "Rankkaa"
    },
    {
      key: "r48", label: "Sade edellä 48h", weight: 4, score: pr48,
      value: inputs.precip48Prev.toFixed(1) + " mm",
      reason: pr48 >= 80 ? "Hieman sameaa — hyvä" : "Vaihtelee"
    },
    {
      key: "cc", label: "Pilvisyys", weight: 18, score: cloudScore, critical: true,
      value: Math.round(inputs.cloudPct) + " %",
      reason:
        inputs.cloudPct >= 70 ? "Pilvistä — kuhalle paras" :
        inputs.cloudPct >= 40 ? "Vaihtelevaa" :
        inputs.cloudPct >= 20 ? "Aurinkoinen — yöllä parempi" : "Kirkas — odota hämärää"
    },
    {
      key: "at", label: "Ilman lämpötila", weight: 2, score: airTempScore,
      value: WEATHER.tmax[idx].toFixed(1) + " °C",
      reason: airTempScore >= 70 ? "Lämmin — hyvä" : "Viileä"
    },
    {
      key: "att", label: "Ilman trendi 48h", weight: 3, score: airTrendScore,
      value: (inputs.airTrend >= 0 ? "+" : "") + inputs.airTrend.toFixed(1) + " °C",
      reason: airTrendScore >= 80 ? "Lämpenevää" : "Pieni muutos"
    },
    {
      key: "tod", label: "Vuorokaudenaika", weight: 17, score: 85, critical: true,
      value: "Hämärä / yö",
      reason: "Iltahämärä ja yö parhaat — katso tunnit"
    }
  ];

  let total = 0, totalW = 0;
  for (const f of factors) { total += f.score * f.weight; totalW += f.weight; }
  let baseScore = total / totalW;

  const seasonMult = seasonGateKuha(dateStr, projectedWater);
  const penalties = [];
  let mult = seasonMult;
  if (seasonMult === 0) {
    penalties.push("Rauhoitusaika 1.4.–31.5.");
  } else if (seasonMult < 1) {
    penalties.push("Kausi: ×" + seasonMult.toFixed(2));
  }
  if (projectedWater < 10) {
    mult *= 0.3;
    penalties.push("Vesi <10 °C · ×0.3");
  } else if (projectedWater > 24) {
    mult *= 0.5;
    penalties.push("Vesi >24 °C · ×0.5");
  }
  if (waterTrend7d <= -2.5) {
    mult *= 0.6;
    penalties.push("Veden romahdus · ×0.6");
  }

  return {
    total: Math.max(0, Math.min(100, Math.round(baseScore * mult))),
    baseScore: Math.round(baseScore),
    factors,
    penalties,
    mult,
    projectedWater
  };
}

// ---------------------------------------------------------------------------
// Dispatchers
// ---------------------------------------------------------------------------

/** Score a single species for a single day. */
export function scoreSpecies(species, idx, waterTempToday, waterTrend7d) {
  switch (species) {
    case "siika": return scoreDay(idx, waterTempToday, waterTrend7d);
    case "hauki": return scoreHauki(idx, waterTempToday, waterTrend7d);
    case "ahven": return scoreAhven(idx, waterTempToday, waterTrend7d);
    case "kuha":  return scoreKuha(idx, waterTempToday, waterTrend7d);
    default: throw new Error("Unknown species: " + species);
  }
}

/**
 * Score the three rantakalastus species for a single day, identifying the
 * highest-scoring one.
 *
 * @returns {{ best: "hauki"|"ahven"|"kuha", scores: { hauki, ahven, kuha } }}
 */
export function scoreRantakalastus(idx, waterTempToday, waterTrend7d) {
  const scores = {
    hauki: scoreHauki(idx, waterTempToday, waterTrend7d),
    ahven: scoreAhven(idx, waterTempToday, waterTrend7d),
    kuha:  scoreKuha(idx, waterTempToday, waterTrend7d)
  };
  const order = ["hauki", "ahven", "kuha"];
  let best = order[0];
  for (const k of order) {
    if (scores[k].total > scores[best].total) best = k;
  }
  return { best, scores };
}

// ---------------------------------------------------------------------------
// Hourly scoring
// ---------------------------------------------------------------------------

/**
 * Approximate sunrise/sunset (decimal hours, Europe/Helsinki) at Saaronniemi
 * (60.4164°N) for a given date. Coarse but good enough for fishing windows.
 */
function approxSunHours(dateStr) {
  const dayOfYear = dateDayOfYear(dateStr);
  const decl = 23.44 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365);
  const lat = 60.4164;
  const cosH = -Math.tan(lat * Math.PI / 180) * Math.tan(decl * Math.PI / 180);
  if (cosH > 1) return { sunrise: 12, sunset: 12 };       // polar night
  if (cosH < -1) return { sunrise: 0, sunset: 24 };       // midnight sun
  const halfDay = (Math.acos(cosH) * 180 / Math.PI) / 15;
  // Solar noon ≈ 13:08 local at 22°E in summer (DST). Close enough.
  const noon = 13.13;
  return {
    sunrise: Math.max(0, noon - halfDay),
    sunset: Math.min(24, noon + halfDay)
  };
}

/**
 * Time-of-day score for a species at a given hour of a given date.
 * Returns 0–100. Combines explicit peak hours and sun-relative dawn/dusk
 * windows; kuha additionally rewards full nautical twilight + night.
 */
function scoreTimeOfDay(species, dateStr, hour) {
  const peakHours = SPECIES_META[species].peakHours;
  const nightWindow = SPECIES_META[species].nightWindow;
  const { sunrise, sunset } = approxSunHours(dateStr);

  let score = 30; // base

  if (peakHours && peakHours.length > 0) {
    if (peakHours.includes(hour)) score = 100;
    else if (peakHours.includes(hour - 1) || peakHours.includes(hour + 1)) score = 65;
  }

  // Dawn/dusk windows (always, regardless of explicit peakHours)
  const dawnDist = Math.abs(hour + 0.5 - sunrise);   // hour midpoint
  const duskDist = Math.abs(hour + 0.5 - sunset);
  const sunDist = Math.min(dawnDist, duskDist);
  if (sunDist <= 1.5) score = Math.max(score, 100);
  else if (sunDist <= 2.5) score = Math.max(score, 70);

  // Kuha night bonus: nautical twilight + full night
  if (nightWindow) {
    const isNight = (hour + 0.5) < (sunrise - 1) || (hour + 0.5) > (sunset + 1);
    if (isNight) score = Math.max(score, 85);

    // Suppress harsh midday for kuha
    const solarNoon = (sunrise + sunset) / 2;
    if (Math.abs(hour + 0.5 - solarNoon) < 2) score = Math.min(score, 40);
  }

  return score;
}

/**
 * Hourly composite score for a species. Blends the daily score with the
 * time-of-day factor. Cheap on purpose — only invoked during detail render.
 */
export function scoreHour(species, idx, hour, waterTempToday, waterTrend7d) {
  const daily = scoreSpecies(species, idx, waterTempToday, waterTrend7d);
  const dateStr = WEATHER.time[idx];
  const tod = scoreTimeOfDay(species, dateStr, hour);
  // Hourly = daily score modulated by time-of-day (0.4x at worst, 1.0x at peak)
  const todMult = 0.4 + 0.6 * (tod / 100);
  return Math.round(daily.total * todMult);
}

/**
 * Find the best 2-hour window of a day for a species.
 * @returns {{ startHour: number, endHour: number, score: number }}
 */
export function bestHourWindow(species, idx, waterTempToday, waterTrend7d) {
  let best = { startHour: 0, endHour: 2, score: 0 };
  for (let h = 0; h <= 22; h++) {
    const s1 = scoreHour(species, idx, h, waterTempToday, waterTrend7d);
    const s2 = scoreHour(species, idx, h + 1, waterTempToday, waterTrend7d);
    const avg = (s1 + s2) / 2;
    if (avg > best.score) {
      best = { startHour: h, endHour: h + 2, score: Math.round(avg) };
    }
  }
  return best;
}

/**
 * Returns the hours of a given date that count as a "peak" for the species
 * (used by the UI to tint the hourly strip).
 */
export function peakHoursForDay(species, dateStr) {
  const peaks = new Set();
  for (let h = 0; h < 24; h++) {
    if (scoreTimeOfDay(species, dateStr, h) >= 90) peaks.add(h);
  }
  return peaks;
}

// ---------------------------------------------------------------------------
// Display helpers (still pure — no DOM)
// ---------------------------------------------------------------------------

/**
 * 16-point compass abbreviation for a meteorological wind direction.
 * @param {number} deg 0–360
 * @returns {string} e.g. "NW", "ESE"
 */
export function compassLetter(deg) {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

/** Hex color for a 0–100 score. */
export function scoreColor(s) {
  if (s >= 80) return "#2a9d8f";
  if (s >= 60) return "#8ab17d";
  if (s >= 40) return "#e9c46a";
  if (s >= 20) return "#e76f51";
  return "#9d0208";
}

/** Finnish verdict for a 0–100 score. */
export function scoreVerdict(s) {
  if (s >= 80) return "Erinomainen";
  if (s >= 60) return "Hyvä";
  if (s >= 40) return "Keskinkertainen";
  if (s >= 20) return "Huono";
  return "Surkea";
}

/** Color for a single factor's score bar. */
export function factorBarColor(s) {
  if (s >= 70) return "#2a9d8f";
  if (s >= 40) return "#e9c46a";
  return "#e76f51";
}

// ---------------------------------------------------------------------------
// Species metadata — labels, peak hours, tackle text
// ---------------------------------------------------------------------------

export const SPECIES_META = {
  siika: {
    label: "Siika",
    emoji: "🐟",
    color: "#0a3d62",
    peakHours: [10, 11, 17, 18],
    nightWindow: false,
    tackle:
      "Pohjaonki harvasukamadolla (lierolla). Pieni paino, ohut perukesiima, " +
      "pieni koukku.",
    tackleLong:
      "Klassinen siikatakla on pohjaonki: 0.20 mm siima, 1–2 g paino, " +
      "10–14 koukku ja syöttinä elävä harvasukamato (lieru) tai " +
      "kastemato. Heitä paino noin 5–15 m rannasta sora–hiekkapohjalle. " +
      "Anna olla. Siika on syömässä rauhallista syöttiä — älä liikuttele. " +
      "Vavan herkkä kärki näyttää nykäisyn; lyö ohuesti, älä riuhdo."
  },
  hauki: {
    label: "Hauki",
    emoji: "🐊",
    color: "#3d5a80",
    peakHours: null, // sunrise/sunset relative
    nightWindow: false,
    tackle:
      "Jerkbait, tasapainojigi tai vaappu — heitä rantapoukamiin ja " +
      "hidasta vetoja.",
    tackleLong:
      "Kevätkauden jälkihaut: 10–18 cm jerkbait (Westin Swim, Strike Pro " +
      "Buster) tai softi 4–6\" 14–28 g jighead. Heitä matalille " +
      "kasvustoille, vedä hidas pulse–pause. Syksyllä (loka–marras) " +
      "isompi kalkkari ja syvempi vaappu (Rapala Down Deep, Husky Jerk). " +
      "Kovassa tuulessa raskaammat jigit pitävät vedessä. " +
      "Tärkeintä: hämärä, sade tai pilvi — vältä kirkas keskipäivä."
  },
  ahven: {
    label: "Ahven",
    emoji: "🐠",
    color: "#e9c46a",
    peakHours: [9, 10, 11, 15, 16, 17, 18],
    nightWindow: false,
    tackle:
      "Kevyt jigi 3–7 g pehmeällä softilla, tai pilkki/madeonki kelluvalla.",
    tackleLong:
      "Aktiivisin: 5–10 cm softi (Berkley Powerbait, Savage Gear) " +
      "3–7 g jigheadissa. Hidas hyppely pohjassa parven yläpuolella. " +
      "Pinnasta tunnistaa parven liikkeen vedessä; heitä parven läpi. " +
      "Suuremmille \"kilon ahvenille\" syksyllä: 8–12 cm shadi 14–18 g, " +
      "syvemmiltä pudotuksilta. Madeonki maistuva kuoluttu kelluvalla " +
      "tai paino+koukku kombossa lapsille ja rauhallisille ongintaan."
  },
  kuha: {
    label: "Kuha",
    emoji: "🌙",
    color: "#5e548e",
    peakHours: null, // sunrise/sunset + night
    nightWindow: true,
    tackle:
      "Pehmeä softi 7–14 g jigheadissa pohjapainoon, tai syvä jerkbait " +
      "hämärässä ja yöllä.",
    tackleLong:
      "Pääase: 4–5\" shad/curl-tail (Sandeel Slim, Manns Stretch) " +
      "7–14 g jighead, vedä hitaasti pohjaa pitkin tai tee 1–2 nytkäystä, " +
      "sitten pause. Iltahämärässä ja yöllä: suspending jerkbait " +
      "(Rapala Husky Jerk Deep, X-Rap Magnum) hidaspaussilla. " +
      "Kuhalle myös syöttikala (silakka, kuore) pohjaongella. " +
      "Toimii parhaiten 21:00–02:00 kesäaikaan, syksyllä jo iltapäivästä."
  }
};
