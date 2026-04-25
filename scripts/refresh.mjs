#!/usr/bin/env node
/**
 * refresh.mjs — fetch the three upstream APIs and regenerate src/data/data.js
 * + src/data/snapshot.json.
 *
 * No npm dependencies — uses Node 22 stdlib (`fetch`, `node:fs/promises`).
 *
 * Sources (see docs/data-sources.md for the full reference):
 *   1. Open-Meteo Weather    — daily + hourly forecast, no auth.
 *   2. Open-Meteo Marine     — daily SST, no auth.
 *   3. FMI Open Data WFS     — Föglö Degerby mareograph, no auth, XML.
 *
 * Output is a drop-in replacement for the hand-edited data.js shape: the
 * frontend imports `WEATHER`, `HOURLY`, `MARINE`, `FOGLO`, `OVERRIDE_DEFAULTS`,
 * `LOCATION`, `FETCHED_AT`, `TODAY` — and we emit exactly that.
 *
 * Flags:
 *   --dry-run   write to /tmp/siikasaa-dryrun/ instead of src/data/
 *
 * Env:
 *   SIIKASAA_OUT_DIR   override the output directory (used by the docker
 *                      refresh container to write into the shared volume).
 */

import { writeFile, rename, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOCATION = {
  name: "Saaronniemi, Ruissalo",
  lat: 60.4164,
  lon: 22.0939
};

const FOGLO_FMISID = 134252;
const FOGLO_POS = "60.03188 20.38482"; // gml:pos value to filter on

const PAST_DAYS = 3;       // weather (and HOURLY) past window
const FORECAST_DAYS = 7;   // weather (and HOURLY) forecast window
const MARINE_PAST_DAYS = 10; // need ≥7 to compute trend7d
// FMI WFS caps the time window at 168 hours (7 days) per query.
const FMI_LOOKBACK_HOURS = 167;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const DRY_RUN = process.argv.includes("--dry-run");
const OUT_DIR = process.env.SIIKASAA_OUT_DIR
  ? resolve(process.env.SIIKASAA_OUT_DIR)
  : DRY_RUN
    ? "/tmp/siikasaa-dryrun"
    : resolve(REPO_ROOT, "src/data");

// ---------------------------------------------------------------------------
// Time helpers — we anchor "today" to Europe/Helsinki, not the host clock.
// ---------------------------------------------------------------------------

const TZ = "Europe/Helsinki";

/** Returns YYYY-MM-DD in Europe/Helsinki for the given Date (default: now). */
function todayHelsinki(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

/** Returns YYYY-MM-DDTHH:mm in Europe/Helsinki for the given Date (default: now). */
function nowStampHelsinki(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(d).map(p => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Add `days` (may be negative) to an ISO date string YYYY-MM-DD. */
function addDays(iso, days) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function fetchJSON(url, label) {
  const res = await fetch(url, { headers: { "user-agent": "siikasaa-refresh/1.0" } });
  if (!res.ok) {
    throw new Error(`${label} ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function fetchText(url, label) {
  const res = await fetch(url, { headers: { "user-agent": "siikasaa-refresh/1.0" } });
  if (!res.ok) {
    throw new Error(`${label} ${res.status} ${res.statusText} for ${url}`);
  }
  return res.text();
}

function fetchWeather() {
  const params = new URLSearchParams({
    latitude: String(LOCATION.lat),
    longitude: String(LOCATION.lon),
    hourly: [
      "temperature_2m",
      "precipitation",
      "pressure_msl",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m"
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
      "pressure_msl_mean",
      "cloud_cover_mean"
    ].join(","),
    timezone: TZ,
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS)
  });
  return fetchJSON(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    "weather"
  );
}

function fetchMarine() {
  const params = new URLSearchParams({
    latitude: String(LOCATION.lat),
    longitude: String(LOCATION.lon),
    daily: "sea_surface_temperature_mean",
    timezone: TZ,
    past_days: String(MARINE_PAST_DAYS),
    forecast_days: String(FORECAST_DAYS)
  });
  return fetchJSON(
    `https://marine-api.open-meteo.com/v1/marine?${params}`,
    "marine"
  );
}

function fetchFmiFoglo() {
  const now = new Date();
  const start = new Date(now.getTime() - FMI_LOOKBACK_HOURS * 3600_000);
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "getFeature",
    storedquery_id: "fmi::observations::mareograph::instant::simple",
    fmisid: String(FOGLO_FMISID),
    starttime: start.toISOString().slice(0, 19) + "Z",
    endtime: now.toISOString().slice(0, 19) + "Z",
    parameters: "TW",
    timestep: "180"
  });
  return fetchText(
    `https://opendata.fmi.fi/wfs?${params}`,
    "fmi"
  );
}

// ---------------------------------------------------------------------------
// FMI XML parsing — same regex approach documented in docs/data-sources.md
// ---------------------------------------------------------------------------

/** @returns {{time: string, temp: number}[]} sorted ascending by time */
function parseFmiTw(xml) {
  const elements = xml.match(/<BsWfs:BsWfsElement[^>]*>[\s\S]*?<\/BsWfs:BsWfsElement>/g) || [];
  const values = [];
  for (const elem of elements) {
    const posMatch = elem.match(/<gml:pos>([^<]+)<\/gml:pos>/);
    const valMatch = elem.match(/<BsWfs:ParameterValue>([^<]+)<\/BsWfs:ParameterValue>/);
    const timeMatch = elem.match(/<BsWfs:Time>([^<]+)<\/BsWfs:Time>/);
    if (!posMatch || !valMatch || !timeMatch) continue;
    if (posMatch[1].trim() !== FOGLO_POS) continue;
    if (valMatch[1] === "NaN") continue;
    const temp = Number.parseFloat(valMatch[1]);
    if (!Number.isFinite(temp)) continue;
    values.push({ time: timeMatch[1], temp });
  }
  values.sort((a, b) => a.time.localeCompare(b.time));
  return values;
}

// ---------------------------------------------------------------------------
// Reshapers
// ---------------------------------------------------------------------------

function buildWeather(raw) {
  const d = raw.daily;
  return {
    time: d.time,
    tmax: d.temperature_2m_max,
    tmin: d.temperature_2m_min,
    precip: d.precipitation_sum,
    windMax: d.wind_speed_10m_max,
    windDir: d.wind_direction_10m_dominant,
    pMean: d.pressure_msl_mean,
    cloudMean: d.cloud_cover_mean
  };
}

/**
 * Reshape Open-Meteo's flat hourly arrays into a per-date map.
 * Only emit dates from `today` onward (no need for past-day hourly detail).
 */
function buildHourly(raw, today) {
  const h = raw.hourly;
  const byDate = {};
  for (let i = 0; i < h.time.length; i++) {
    const ts = h.time[i]; // "YYYY-MM-DDTHH:mm" in local tz (timezone=Europe/Helsinki)
    const date = ts.slice(0, 10);
    if (date < today) continue;
    if (!byDate[date]) {
      byDate[date] = { temp: [], cloud: [], wind: [], windDir: [], precip: [] };
    }
    byDate[date].temp.push(h.temperature_2m[i]);
    byDate[date].cloud.push(h.cloud_cover[i]);
    byDate[date].wind.push(h.wind_speed_10m[i]);
    byDate[date].windDir.push(h.wind_direction_10m[i]);
    byDate[date].precip.push(h.precipitation[i]);
  }
  // Trim to 24 entries per date (drops partial DST days gracefully).
  for (const date of Object.keys(byDate)) {
    const day = byDate[date];
    if (day.temp.length !== 24) {
      // Pad/truncate to keep app.js happy. Most days will already be 24.
      const fix = (arr, fill) => {
        if (arr.length > 24) arr.length = 24;
        while (arr.length < 24) arr.push(fill);
      };
      fix(day.temp, day.temp[day.temp.length - 1] ?? 0);
      fix(day.cloud, 0);
      fix(day.wind, 0);
      fix(day.windDir, 0);
      fix(day.precip, 0);
    }
  }
  return byDate;
}

function buildMarine(raw, today) {
  const times = raw.daily.time;
  const sst = raw.daily.sea_surface_temperature_mean;
  const todayIdx = times.indexOf(today);
  if (todayIdx < 0) {
    throw new Error(`marine: today (${today}) not found in returned dates`);
  }
  const sevenAgoIdx = times.indexOf(addDays(today, -7));
  const todayTemp = sst[todayIdx];
  const sevenAgoTemp = sevenAgoIdx >= 0 ? sst[sevenAgoIdx] : null;
  if (todayTemp == null) {
    throw new Error(`marine: SST for today (${today}) is null`);
  }
  return {
    todayTemp: round1(todayTemp),
    trend7d: sevenAgoTemp == null ? 0 : round1(todayTemp - sevenAgoTemp)
  };
}

function buildFoglo(values) {
  if (values.length === 0) {
    throw new Error("foglo: no usable observations returned");
  }
  const latest = values[values.length - 1];
  const latestTime = new Date(latest.time);
  const sevenAgo = new Date(latestTime.getTime() - 7 * 86400_000);
  // Pick the value closest in time to (latest - 7 days).
  let closest = values[0];
  let closestGap = Math.abs(new Date(closest.time) - sevenAgo);
  for (const v of values) {
    const gap = Math.abs(new Date(v.time) - sevenAgo);
    if (gap < closestGap) { closest = v; closestGap = gap; }
  }
  return {
    todayTemp: round1(latest.temp),
    trend7d: round1(latest.temp - closest.temp)
  };
}

function round1(n) { return Math.round(n * 10) / 10; }

// ---------------------------------------------------------------------------
// Output: render data.js
// ---------------------------------------------------------------------------

function renderDataJs({ fetchedAt, today, weather, hourly, marine, foglo }) {
  const j = (v) => JSON.stringify(v);
  const arr = (label, v) => `  ${label}: ${j(v)}`;
  const weatherBody = [
    arr("time", weather.time),
    arr("tmax", weather.tmax),
    arr("tmin", weather.tmin),
    arr("precip", weather.precip),
    arr("windMax", weather.windMax),
    arr("windDir", weather.windDir),
    arr("pMean", weather.pMean),
    arr("cloudMean", weather.cloudMean)
  ].join(",\n");

  const hourlyEntries = Object.entries(hourly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, h]) => {
      const fields = [
        `    temp: ${j(h.temp)}`,
        `    cloud: ${j(h.cloud)}`,
        `    wind: ${j(h.wind)}`,
        `    windDir: ${j(h.windDir)}`,
        `    precip: ${j(h.precip)}`
      ].join(",\n");
      return `  ${j(date)}: {\n${fields}\n  }`;
    })
    .join(",\n");

  return `/**
 * data.js — weather and water-temperature snapshot.
 *
 * AUTO-GENERATED by scripts/refresh.mjs. Do not edit by hand; your changes
 * will be overwritten the next time the refresh job runs. To change the
 * scoring inputs, edit the script. To change the algorithm, edit scoring.js.
 */

/** ISO timestamp when this snapshot was fetched, Europe/Helsinki. */
export const FETCHED_AT = ${j(fetchedAt)};

/** Location: Saaronniemi, Ruissalo, Turku. */
export const LOCATION = ${j(LOCATION)};

/**
 * Daily weather forecast and recent observations, indexed by \`time\`.
 * - tmax / tmin: °C
 * - precip: mm
 * - windMax: km/h (divide by 3.6 for m/s)
 * - windDir: degrees, meteorological convention (0 = from N)
 * - pMean: hPa, mean sea level pressure
 * - cloudMean: %
 */
export const WEATHER = {
${weatherBody}
};

/** Today as an ISO date string (Europe/Helsinki on refresh). */
export const TODAY = ${j(today)};

/**
 * Hourly data per day (for the detail-panel hour strip).
 * Same units as WEATHER. Index 0 = 00:00, 23 = 23:00 local.
 */
export const HOURLY = {
${hourlyEntries}
};

/** Open-Meteo Marine — modeled open-water sea surface temperature. */
export const MARINE = ${j(marine)};

/** FMI Föglö Degerby mareograph — real measurement, ~50 km SW. */
export const FOGLO = ${j(foglo)};

/**
 * Default override values used when the user first opens the app.
 * Seeded from FOGLO so the slider lands on something reasonable.
 */
export const OVERRIDE_DEFAULTS = {
  temp: ${foglo.todayTemp},
  trend7d: ${foglo.trend7d}
};
`;
}

// ---------------------------------------------------------------------------
// File IO
// ---------------------------------------------------------------------------

async function writeAtomic(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = path + ".tmp";
  await writeFile(tmp, contents);
  await rename(tmp, path);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const today = todayHelsinki();
  const fetchedAt = nowStampHelsinki();
  console.log(`[refresh] today (Europe/Helsinki) = ${today}`);
  console.log(`[refresh] output dir = ${OUT_DIR}${DRY_RUN ? " (dry-run)" : ""}`);

  const [rawWeather, rawMarine, rawFmi] = await Promise.all([
    fetchWeather(),
    fetchMarine(),
    fetchFmiFoglo()
  ]);

  const fogloValues = parseFmiTw(rawFmi);
  console.log(`[refresh] fmi: parsed ${fogloValues.length} usable observations`);

  const weather = buildWeather(rawWeather);
  const hourly = buildHourly(rawWeather, today);
  const marine = buildMarine(rawMarine, today);
  const foglo = buildFoglo(fogloValues);

  const dataJs = renderDataJs({ fetchedAt, today, weather, hourly, marine, foglo });
  const snapshotJson = JSON.stringify({
    fetched: fetchedAt,
    today,
    weather: rawWeather,
    marine: rawMarine,
    foglo: fogloValues
  }, null, 2);

  await writeAtomic(join(OUT_DIR, "data.js"), dataJs);
  await writeAtomic(join(OUT_DIR, "snapshot.json"), snapshotJson);

  console.log(`[refresh] wrote ${join(OUT_DIR, "data.js")} (${dataJs.length} bytes)`);
  console.log(`[refresh] wrote ${join(OUT_DIR, "snapshot.json")} (${snapshotJson.length} bytes)`);
  console.log(`[refresh] marine: today=${marine.todayTemp}°C, 7d trend=${marine.trend7d}°C`);
  console.log(`[refresh] foglo:  today=${foglo.todayTemp}°C, 7d trend=${foglo.trend7d}°C`);
}

main().catch(err => {
  console.error("[refresh] failed:", err.message);
  process.exitCode = 1;
});
