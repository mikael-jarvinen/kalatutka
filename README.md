# Siikasää — Saaronniemi Fishing Forecaster

A weather-based scoring tool that predicts whitefish (siika, *Coregonus lavaretus*) shore fishing conditions at **Saaronniemi, Ruissalo** (Turku, Finland). Uses a research-backed multi-factor model that explicitly accounts for water temperature, atmospheric pressure trends, and Saaronniemi-specific wind geometry — not generic solunar/moon-phase nonsense.

> **Why this exists.** Standard fishing calendars apply solunar theory, which assumes meaningful tides. The Baltic Sea has tidal range under 20 cm. Standard weather-based fishing apps don't know that the cape at Saaronniemi opens to the W/SW, that whitefish in this water are sight-feeders, or that shallow shore water can drop 4 °C in a single windy night. This tool does.

---

## Current state

A two-page static site that scores the next 7 days **0–100** for whitefish bottom fishing. Each day shows a verdict (Erinomainen / Hyvä / Keskinkertainen / Huono / Surkea), the factors driving the score, and any critical penalties applied. A separate research page (FI + EN) explains the biology and the algorithm.

The data is a snapshot from Open-Meteo (weather + sea surface temperature) and FMI (Föglö Degerby coastal water temperature), refreshed automatically by `scripts/refresh.mjs`. The user can override water temperature and trend with their own shore measurement on the forecast page, which becomes the active source.

**No backend at runtime, no build step.** The frontend is plain HTML/CSS/ES modules. In production the whole thing runs as `docker compose up -d` (one nginx container, one Node refresh container — see `deploy/README.md`).

---

## Repository layout

```
.
├── README.md              ← this file
├── CLAUDE.md              ← memory file for Claude Code (read first)
├── docker-compose.yml     ← deployment stack (web + refresh)
├── Dockerfile.web         ← nginx:alpine serving src/
├── Dockerfile.refresh     ← node:22-alpine running the refresh loop
├── docs/
│   ├── research.md        ← scientific basis (Finnish, comprehensive)
│   ├── methodology.md     ← scoring algorithm details
│   ├── decisions.md       ← design decision log + rationale
│   └── data-sources.md    ← API specs + FMI station notes
├── src/
│   ├── index.html         ← forecast page
│   ├── research.html      ← research page (two tabs)
│   ├── styles.css         ← all styling (vanilla CSS, no framework)
│   ├── scoring.js         ← pure scoring functions (testable)
│   ├── app.js             ← forecast renderer + event handlers
│   ├── research.js        ← tab switching for the research page
│   └── data/
│       ├── data.js        ← AUTO-GENERATED snapshot
│       └── snapshot.json  ← raw API responses (machine-readable)
├── scripts/
│   └── refresh.mjs        ← the script that regenerates data/data.js
└── deploy/
    ├── nginx.conf
    ├── refresh-entrypoint.sh
    └── README.md          ← deployment runbook
```

---

## Getting started

### Run locally

```bash
# No dependencies. Just open the HTML.
open src/index.html

# Or serve it (some browsers block module imports from file://)
python3 -m http.server 8000 --directory src
# → http://localhost:8000
```

### Refresh the data snapshot

```bash
npm run refresh        # rewrites src/data/data.js + snapshot.json
npm run refresh:dry    # writes to /tmp/siikasaa-dryrun/ instead
```

The script needs no npm dependencies (Node 22 stdlib `fetch`). In production
it runs inside the docker `refresh` service on a `REFRESH_INTERVAL_HOURS` loop
— see `deploy/README.md`.

### Tests

No tests yet. `src/scoring.js` is structured as pure functions specifically so unit tests can be added.

---

## How the scoring works (one-paragraph version)

Each day gets a **base score** from a weighted average of 11 factors (water temperature 20, water-temperature trend 10, pressure change 24h 12, pressure change 48h 6, wind speed 10, wind direction relative to Saaronniemi 10, precipitation 24h 6, precipitation 48h 6, cloud cover 6, air temperature 4, air-temperature trend 10). Each factor is scored 0–100 by a triangular function around its biological optimum.

Then **critical penalty multipliers** are applied for conditions that biologically shut down feeding regardless of other factors: water below 4 °C (×0.4), water below 5 °C (×0.6), water above 12 °C — season ends (×0.5), sudden water-temperature collapse ≥2.5 °C (×0.5), or the cold offshore wind compound (×0.7).

Final score = round(base × penalty_multipliers), clamped to 0–100. See `docs/methodology.md` for the full picture.

---

## Why these specific factors

Read `docs/research.md` for the full scientific basis. Short version:

- **Whitefish are sight-feeders** with diurnal/crepuscular activity → cloud cover and water clarity (proxied by recent rain + wind) matter.
- **Spring whitefish chase polychaete worms** that emerge from gravel/sand bottom when sun warms it → water temperature and sunshine drive everything.
- **Pressure level itself doesn't matter** — only its rate of change does. (See "barometric pressure myth" in `docs/decisions.md`.)
- **Wind direction is location-specific.** At Saaronniemi the cape opens W/SW, so SW = onshore (warm + stirs bottom = good), NE = offshore (cold + shore water leaves = bad).
- **Solunar theory is excluded** because Baltic tidal range is under 20 cm.

---

## Data sources

| Source | Use | Endpoint |
|---|---|---|
| Open-Meteo Weather | Forecast + recent observations | `api.open-meteo.com/v1/forecast` |
| Open-Meteo Marine | Open-water sea surface temp | `marine-api.open-meteo.com/v1/marine` |
| FMI Open Data | Coastal water temp (Föglö Degerby) | `opendata.fmi.fi/wfs` |

Full URLs and parameter notes in `docs/data-sources.md`.

---

## License

TBD — pick when ready to publish.

---

## Status notes

Bootstrapped in a Cowork session as a single-file artifact, then split into
modules and turned into a self-contained docker-compose stack with an
automated refresh loop.
