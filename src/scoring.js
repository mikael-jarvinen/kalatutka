/**
 * scoring.js — pure scoring functions.
 *
 * No DOM access. No global mutable state. Inputs in, numbers/objects out.
 * This is the part that matters for testing. See docs/methodology.md for
 * the full algorithm specification (this file is the implementation).
 */

import { WEATHER, TODAY } from "./data/data.js";

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
// Per-factor scorers
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
// Day-level composite scoring
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
