# Data sources

Three APIs feed the model. All are public and free for personal use.

---

## 1. Open-Meteo Weather API

**Use:** Daily weather forecast, hourly weather forecast, and recent observation history.

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**No API key required.** CORS-enabled. Generous rate limits for personal use.

### Example request

```
https://api.open-meteo.com/v1/forecast
  ?latitude=60.4164&longitude=22.0939
  &hourly=temperature_2m,precipitation,pressure_msl,cloud_cover,wind_speed_10m,wind_direction_10m
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,
         wind_direction_10m_dominant,pressure_msl_mean,cloud_cover_mean
  &timezone=Europe%2FHelsinki
  &past_days=3
  &forecast_days=7
```

### Response shape (relevant subset)

```json
{
  "latitude": 60.42118,
  "longitude": 22.10452,
  "timezone": "Europe/Helsinki",
  "daily": {
    "time": ["2026-04-22", "2026-04-23", ...],
    "temperature_2m_max": [10.2, 9.3, ...],
    "temperature_2m_min": [4.1, 1.5, ...],
    "precipitation_sum": [0.0, 0.0, ...],
    "wind_speed_10m_max": [32.8, 21.6, ...],
    "wind_direction_10m_dominant": [320, 328, ...],
    "pressure_msl_mean": [1013.3, 1012.9, ...],
    "cloud_cover_mean": [47, 23, ...]
  },
  "hourly": { ... }
}
```

### Notes

- **Pressure unit:** hPa.
- **Wind speed unit:** km/h. Divide by 3.6 for m/s.
- **Wind direction:** meteorological convention (0° = wind from north, 90° = from east).
- The `latitude/longitude` returned in the response is the **grid cell center**, slightly offset from what you requested. That's fine for our purposes.
- ECMWF IFS HRES + DMI HARMONIE are the underlying models for Saaristomeri. Update cadence is every 3–6 hours.

---

## 2. Open-Meteo Marine API

**Use:** Sea surface temperature forecast for the requested point. Modeled, **open water**.

**Endpoint:** `https://marine-api.open-meteo.com/v1/marine`

### Example request

```
https://marine-api.open-meteo.com/v1/marine
  ?latitude=60.4164&longitude=22.0939
  &daily=sea_surface_temperature_mean
  &timezone=Europe%2FHelsinki
  &past_days=10
  &forecast_days=7
```

### Response shape

```json
{
  "daily": {
    "time": ["2026-04-15", "2026-04-16", ...],
    "sea_surface_temperature_mean": [5.4, 5.4, 5.8, 6.1, ...]
  }
}
```

### Notes

- **Modeled, not measured.** Output is from a coupled ocean model (likely DMI's regional setup for the Baltic). It represents broad open-water surface temperature and **runs 1–3 °C warmer than shore measurements** during cold-wind events.
- Useful for the trend (warming vs. cooling) and as a sanity reference for the absolute value, but **don't trust it as the input to the scoring model when shore measurements differ**.
- Hourly resolution is also available (`hourly=sea_surface_temperature`).

---

## 3. FMI Open Data WFS — Mareograph stations

**Use:** Real coastal water temperature measurements from FMI's mareograph network.

**Endpoint:** `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=...`

**No API key.** Output is **XML** (OGC WFS 2.0), not JSON. Parse with regex or a proper XML parser.

### Stored query for instant observations

`fmi::observations::mareograph::instant::simple`

Returns `BsWfs:BsWfsElement` records with `<gml:pos>`, `<BsWfs:Time>`, `<BsWfs:ParameterName>`, `<BsWfs:ParameterValue>`.

### Available parameters at mareograph stations

| Parameter | Meaning |
|---|---|
| `TW` | **Water temperature in °C** — what we want |
| `WATLEV` | Water level (theoretical mean sea level reference) |
| `WLEVN2K_PT1S_INSTANT` | Water level N2000 reference, instantaneous |

### Useful station list (Finnish mareographs with TW data)

| fmisid | Name | Lat | Lon | Notes |
|---:|---|---:|---:|---|
| 134252 | **Föglö Degerby** | 60.03188 | 20.38482 | **Closest to Saaronniemi (~50 km SW)** |
| 134253 | Hanko | 59.82287 | 22.97658 | South of Saaristomeri |
| 134224 | Rauma | 61.13390 | 21.44263 | North of Saaristomeri |
| 132310 | Helsinki Kaivopuisto | 60.15363 | 24.95622 | Gulf of Finland |
| 134250 | Pietarsaari | 63.70857 | 22.68958 | Bothnian Bay |

**No Turku mareograph exists.** Söötu's mareograph network has a coverage gap between Föglö and Rauma. Föglö is what we use.

### Example request

Build a window of last 7 days, ask for TW only:

```
https://opendata.fmi.fi/wfs
  ?service=WFS&version=2.0.0&request=getFeature
  &storedquery_id=fmi::observations::mareograph::instant::simple
  &fmisid=134252
  &starttime=2026-04-18T00:00:00Z
  &endtime=2026-04-25T00:00:00Z
  &parameters=TW
  &timestep=180
```

`timestep=180` means 180-minute (3-hour) resampling — keeps the response small.

### Response gotchas

- The `bbox` parameter is sometimes ignored by the FMI server. Filter client-side by `<gml:pos>` if you need to.
- The response uses `\<` and `\>` as literal characters; standard XML parsing applies.
- `NaN` values appear when the sensor is offline. Skip them.
- Without `timestep`, you may get per-minute data that exceeds 30s timeouts. Always use timestep, even for short windows.
- Position string format: `"60.03188 20.38482 "` (note trailing space). Trim before comparing.

### Quick parsing in JS (regex approach used in this project)

```javascript
const elements = text.match(/<BsWfs:BsWfsElement[^>]*>[\s\S]*?<\/BsWfs:BsWfsElement>/g) || [];
const fogloPos = "60.03188 20.38482";
const values = [];
for (const elem of elements) {
  const posMatch = elem.match(/<gml:pos>([^<]+)<\/gml:pos>/);
  const valMatch = elem.match(/<BsWfs:ParameterValue>([^<]+)<\/BsWfs:ParameterValue>/);
  const timeMatch = elem.match(/<BsWfs:Time>([^<]+)<\/BsWfs:Time>/);
  if (posMatch && posMatch[1].trim() === fogloPos && valMatch && valMatch[1] !== "NaN") {
    values.push({ time: timeMatch[1], temp: parseFloat(valMatch[1]) });
  }
}
```

A proper `DOMParser` is cleaner if you don't mind the dependency.

---

## How the snapshot is built

`scripts/refresh.mjs` (Node, no npm deps) fetches the three APIs above,
reshapes them into the structures `src/data/data.js` exports, and writes both
the regenerated module and a raw-response `snapshot.json` to `src/data/`
(or to `$SIIKASAA_OUT_DIR` when running inside the docker refresh container).

Run it locally with `npm run refresh`, or `npm run refresh:dry` to write to
`/tmp/siikasaa-dryrun/` without touching the repo.

The script also stamps `FETCHED_AT` (Europe/Helsinki) and `TODAY`, so the
forecast page can show users when the snapshot was last refreshed and the day
grid lines up with the current date even if the host clock is in another
timezone.

---

## Other sources we considered but didn't use

- **Solunar tables / Tides4Fishing** — irrelevant in tideless Baltic.
- **OpenWeatherMap** — requires API key for the useful endpoints; Open-Meteo covers the same ground free.
- **Pohjois-Itämeren aaltopoiju (FMI fmisid 134220)** — measures TWATER, but at ~59.25°N, 21.0°E it's ~130 km south of Saaronniemi. Data quality is fine but the location is irrelevant.
- **aaltopoiju.fi** — convenient web display of FMI data for Saaristomeri, but no documented API. Could scrape if FMI WFS becomes annoying.
- **Vesi.fi** — historical sea temperature aggregations from SYKE; useful for climatology but not real-time enough for daily forecasting.

---

## Citation

If you publish anything based on this:

- Open-Meteo: CC BY 4.0 — credit "Weather data by Open-Meteo.com".
- FMI Open Data: CC BY 4.0 — credit "Source: Finnish Meteorological Institute".
