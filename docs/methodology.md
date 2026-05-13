# Methodology — scoring algorithm

This document is the **single source of truth** for how the fishing score is computed. If you change the math, update this document in the same commit.

The model now covers **four species**: siika (whitefish), hauki (pike), ahven (perch), and kuha (zander). Each species shares the same input vector (Open-Meteo + FMI Föglö) and per-factor scorer shapes, but has its own weight vector, water-temperature triangular bounds, season-window gate, peak-hour profile, and critical penalties. The siika section below is the canonical, fully-documented model. The rantakalastus species (hauki/ahven/kuha) are summarised in the **Multi-species** section near the end; full per-species rationale is in `docs/research-rantakalastus.md`.

## High-level formula

```
finalScore = clamp(round(baseScore × seasonGate × Π penaltyMultipliers), 0, 100)
```

For siika, `seasonGate = 1` (no calendar gate — the water-temp penalties already cover the spring window). For hauki/ahven/kuha, the season gate is a date-based 0–1 multiplier handling closed seasons and out-of-season periods. `baseScore` is the weighted average of 11 (siika) or 12 (rantakalastus, with an added `tod` time-of-day factor) factor scores. `penaltyMultipliers` are zero or more critical-condition multipliers (each ≤ 1).

## Why weighted average × multipliers (and not just one or the other)

A pure weighted average can't capture **veto conditions** — situations where a single factor (e.g. water below 4 °C, or +20 °C summer water) effectively shuts down the fishery regardless of everything else. A pure rule-based system can't capture **gradual interactions** between many small factors.

The hybrid approach: do a weighted average of the gradient factors, then apply hard penalty multipliers for the few biological vetoes. This matches how experienced anglers reason ("the wind, sun, pressure all looked decent — but with the water this cold, forget it").

## The 11 factors and their weights

| Key | Factor | Weight | Critical? |
|---|---|---:|:---:|
| `wt` | Water temperature | 20 | ✓ |
| `wtrend` | Water temperature trend (7-day Δ) | 10 | ✓ |
| `p24` | Pressure change 24h (\|ΔhPa\|) | 12 | |
| `p48` | Pressure change 48h (\|ΔhPa\|) | 6 | |
| `ws` | Wind speed (max km/h) | 10 | |
| `wd` | Wind direction (Saaronniemi-relative) | 10 | |
| `r24` | Precipitation 24h | 6 | |
| `r48` | Precipitation prior 48h | 6 | |
| `cc` | Cloud cover (mean) | 6 | |
| `at` | Air temperature (max) | 4 | |
| `att` | Air temperature trend (48h Δ) | 10 | |
| | **Total** | **100** | |

Total is 100 by convention so `baseScore = Σ(score × weight) / 100`.

## Factor scoring functions

All factor scores are 0–100. The shape is **triangular** unless noted: 0 outside hard bounds, 100 inside the optimum band, linear ramp between.

### `triangular(v, hardLo, optLo, optHi, hardHi)`

```
v ≤ hardLo  →  0
v ≥ hardHi  →  0
optLo ≤ v ≤ optHi  →  100
hardLo < v < optLo  →  (v − hardLo) / (optLo − hardLo) × 100
optHi < v < hardHi  →  (hardHi − v) / (hardHi − optHi) × 100
```

### `scoreWaterTemp(t)` — weight 20

`triangular(t, 2, 6, 10, 14)`.

- Below 2 °C: 0 (siika doesn't feed; the entire shore food chain is dormant)
- 6–10 °C: 100 (peak whitefish feeding window)
- Above 14 °C: 0 (season collapses; roach takes over the inshore)

### `scoreWaterTrend(dt)` — weight 10

Step function (not triangular):

| Δ over 7 days | Score |
|---|---:|
| +1 to +4 °C (warming) | 100 |
| 0 to +1 °C (drift up) | 80 |
| > +4 °C (very fast warming) | 70 |
| 0 to −1 °C (slow cooling) | 65 |
| −1 to −2 °C | 35 |
| −2 to −3 °C | 15 |
| < −3 °C (crash) | 5 |

A sudden cooling in spring tells fish to leave the shallow shore for the deeper, more thermally stable column.

### `scorePressureChange(dp)` — weights 12 (24h) and 6 (48h)

`triangular(|dp|, 0, 3, 8, 15)`.

The user originally framed this as "pressure causes fish to bite". The literature is more nuanced: the 1983 Stickney–Liu study found a small correlation in largemouth bass. The mechanism is not direct pressure on swim bladders (a fish moving 1 m vertically experiences ~100× the pressure change a passing front produces). The **indirect-effects model** is preferred: pressure change is a *proxy* for weather pattern transitions, which bring real biological changes (cloud cover, wind, prey activity).

Reward 3–8 hPa/24h; penalize stagnant pressure (|Δp|<3) and extreme drops (|Δp|>15) which can shut feeding for a few hours.

### `scoreWindSpeed(kmh)` — weight 10

```
ms = kmh / 3.6
if ms < 0.5  →  40   (dead calm; no bottom stirring, but sight feeding fine)
else  →  triangular(ms, 0, 2, 6, 14)
```

- Under 2 m/s: ramping (light air doesn't move bottom)
- 2–6 m/s: 100 (sweet spot — light wave action stirs bottom, releases food)
- Above 14 m/s: 0 (water turbid; sight-feeding whitefish blind)

### `scoreWindDir(deg)` — weight 10 (Saaronniemi-specific)

The cape opens **W/SW**, with the open Saaristomeri to the south and west. So:

- **Best: SW (~225°)** — onshore, warm air mass, stirs bottom from the right side
- **Worst: NE (~45°)** — offshore, cold air mass, the warm shore water flows out to sea

```
dist = min(|deg − 225|, 360 − |deg − 225|)   // angular distance, 0–180
score = round(100 × (1 − dist / 180))
```

- 225° → 100
- 135° (SE) → 50
- 315° (NW) → 50
- 45° (NE) → 0

### `scorePrecipToday(mm)` — weight 6

```
mm < 0.5   →  100
mm < 2     →  80
mm < 5     →  50
mm < 10    →  25
mm ≥ 10    →  10
```

Heavy rain turbifies the water, blinds the sight-feeders, and can drop salinity if there's lots of runoff (less of an issue in Saaristomeri's already-low salinity).

### `scorePrecip48h(mm)` — weight 6

Cumulative precipitation in the previous 48 hours, judging whether the water has had time to clear:

```
mm < 2     →  100
mm < 8     →  70
mm < 20    →  40
mm ≥ 20    →  15
```

### `scoreCloud(pct)` — weight 6

Note this is **not** triangular — cloud cover has a more complex relationship:

```
pct ≤ 10   →  85   (clear; great in spring, harsh in summer)
pct ≤ 60   →  100  (broken cloud sweet spot)
pct ≤ 80   →  70
pct ≤ 95   →  45
pct > 95   →  25   (overcast; bottom doesn't warm, polychaetes stay in)
```

### `scoreAirTemp(tmax)` — weight 4

`triangular(tmax, -5, 6, 14, 22)`. Lower weight than water temp because air is a poor proxy for shore water on short timescales.

### `scoreAirTrend(dt)` — weight 10

```
dt 0 to +5    →  100 (warming)
dt > +5       →  70 (warming fast — confused fish)
dt 0 to −2    →  70 (slight cool)
dt −2 to −5   →  40
dt < −5       →  20 (cold shock)
```

A higher weight than `scoreAirTemp` because the trend tells you what's coming next at the shore.

## Critical penalty multipliers

Applied multiplicatively after the weighted base score. Each is independent; multiple can stack.

| Condition | Multiplier | Rationale |
|---|---:|---|
| Water temp < 4 °C | × 0.4 | Below this threshold, polychaete activity halts; siika moves to deep stable water. |
| Water temp 4–5 °C | × 0.6 | Cold-edge marginal — shore food chain barely active. |
| Water temp > 12 °C | × 0.5 | Spring whitefish window closes; roach/perch dominate the shallow shore. |
| Water trend ≤ −2.5 °C / 7d | × 0.5 | Sudden cooling — fish vacate the shallows for thermal stability. |
| Water trend −1.5 to −2.5 °C / 7d | × 0.75 | Cooling not catastrophic but biases against feeding. |
| Wind dir score < 30 AND wind > 8 m/s AND water < 7 °C | × 0.7 | Compound effect: cold offshore wind drives warm surface water out and brings cold deep water up. |

If multiple water-temp conditions match, only one fires (e.g. < 4 °C does *not* also trigger 4–5 °C). Trend conditions and direction conditions stack with temperature conditions.

## Future-day water temperature projection

Open-Meteo Marine gives a daily SST forecast. We don't currently use it directly per future day; instead we project from today's chosen water-temp source using a damped air-temp delta:

```
projectedWater(d) = baseWater + (airAvg(d) − airAvg(today)) × 0.2 × min(daysFromToday, 5) / 5
```

Capped to [1, 18] °C.

This is **crude** and known to be a weakness. A better implementation would use the Open-Meteo Marine forecast directly per future day.

## Validation

The model has been validated against one ground-truth event so far: 2026-04-24 user reports nobody catching fish at Saaronniemi, water shore-measured at 4 °C (down from 6–8 °C earlier weeks), wind from NW at 25 km/h. Without the water-temp + offshore-wind compound, the model gave 85 (very wrong). With them, the model gives 34 ("Huono"), matching reality.

More catch-log data points would be needed for real validation.

---

## Hatch budget multiplier (siika only)

The siika scorer applies an extra multiplier based on cumulative warm-water-day
count this calendar year. Captures the spring polychaete (harvasukamato) hatch
as a one-shot ~3-week event, after which the shore food chain decouples
regardless of current temperature.

`scripts/refresh.mjs` computes the count from Open-Meteo Marine SST
(`past_days=92`): days since Jan 1 where SST ≥ 6 °C. Open-Meteo Marine runs
~2 °C warm vs. shore, so 6 °C marine ≈ 4 °C shore — the threshold for
sediment-warming-driven worm emergence. Result baked into `data.js` as
`HATCH_BUDGET = { firstWarmDay, perDay }`.

| Cumulative warm days | Multiplier | Meaning |
|---|---:|---|
| 0–5 | 0.5 | Pre-hatch — worms not yet up |
| 6–10 | 0.8 | Hatch ramping up |
| 11–18 | 1.0 | **Peak hatch — prime window** |
| 19–25 | 0.7 | Hatch winding down |
| 26–35 | 0.4 | Food chain decoupling |
| 36+ | 0.15 | Effectively over for this year |

If `HATCH_BUDGET = null` (cold spring), multiplier defaults to 1.0. The
displayed penalty string ("Sesonki ohi" etc.) surfaces the cumulative day
count for sanity checking.

Calibrated against a single ground-truth observation: user caught siika
3 weeks before the model was scoring 70+ on identical-looking conditions;
the 26–35 day band (×0.4) brings that "perfect" score into the 30s. Tune
as catch-log data accumulates.

---

## Multi-species (hauki / ahven / kuha / särki / lahna)

The rantakalastus species (hauki/ahven/kuha) and pohjaonki species
(särki/lahna) share the same input vector and per-factor shapes as siika
but with their own weights, water-temp triangular bounds, season gates,
and a couple of bespoke scorer shapes. For per-species biological
rationale, see `docs/research-rantakalastus.md` and
`docs/research-pohjaonki.md`.

### Per-species weights (sum to 100)

| Factor | Hauki | Ahven | Kuha | Särki | Lahna |
|---|---:|---:|---:|---:|---:|
| Water temp | 22 | 25 | 22 | 20 | 24 |
| Water-temp trend | 5 | 8 | 5 | 5 | 8 |
| Pressure 24h | 13* | 8 | 7 | 7 | 8* |
| Pressure 48h | 5 | 4 | 3 | 4 | 4 |
| Wind speed | 15 | 10 | 10 | 6 | 8 |
| Wind direction (generic onshore) | 10 | 5 | 5 | 3 | 5 |
| Precip 24h | 3 | 5 | 4† | 6 | 8† |
| Precip 48h | 2 | 5 | 4 | 5 | 6 |
| Cloud cover | 15‡ | 12 | 18§ | 10 | 14§ |
| Air temp | 2 | 4 | 2 | 3 | 2 |
| Air-temp trend | 3 | 4 | 3 | 5 | 5 |
| Time-of-day (`tod`) | 5 | 10 | 17 | 6 | 8 |
| **Total** | **100** | **100** | **100** | **100** | **100** |

\* Hauki and lahna get a +10 falling-pressure bonus on the 24h score within the 3–8 hPa optimum.
\† Kuha and lahna have inverted precipitation polarity: light–moderate rain is positive (turbidity).
\‡ Hauki cloud scorer rewards overcast (≥70 %) at 100, clear (<20 %) at 30.
\§ Kuha and lahna are the strongest low-light preferences (clear day = 20–30, overcast = 100).

### Water-temperature triangulars

| Species | hardLo | optLo | optHi | hardHi |
|---|---:|---:|---:|---:|
| Siika | 2 | 6 | 10 | 14 |
| Hauki | 4 | 12 | 18 | 23 |
| Ahven | 6 | 14 | 19 | 24 |
| Kuha | 10 | 18 | 22 | 25 |
| Särki | 4 | 14 | 22 | 26 |
| Lahna | 10 | 16 | 22 | 25 |

### Season gates (0–1 multiplier, applied before penalties)

- **Hauki**: months 1–3 → 0.2; if `projectedWater > 19 °C` → 0.5; otherwise 1.
- **Ahven**: months 1–2 → 0.2; months 3 + 12 → 0.5; otherwise 1.
- **Kuha**: month 4 → 0.3 (schools in deep basins); month 5 → 0.5 (pre-spawn staging); month 6 day <15 → 0.55 (peak spawn, feeding paused), day 15–24 → 0.8 (post-spawn ramp); months 7–9 → 1; month 10 → 0.6; months 11, 12, 1–3 → 0.1. No regulatory closed season — Finnish saltwater enforces only a 42 cm minimum size; undersized fish must be released.
- **Särki**: months 1–2 → 0.15; months 3 + 12 → 0.4; month 4 → 0.7; month 11 → 0.5; otherwise 1.
- **Lahna**: months 1–4 → 0.1; month 5 → ramp from 0.2 (May 1) to 1.0 (May 20), gated by `projectedWater ≥ 14 °C`; months 6–8 → 1; month 9 → 0.85; month 10 → 0.4; months 11–12 → 0.1.

### Critical penalties (per species, multiplicative)

- **Hauki**: water `<4 °C` ×0.4; water `>23 °C` ×0.4; trend `≤ −2.5 °C/7d` ×0.7.
- **Ahven**: water `<6 °C` ×0.5; water `>23 °C` ×0.5; trend `≤ −2.5 °C/7d` ×0.7.
- **Kuha**: water `<10 °C` ×0.3; water `>24 °C` ×0.5; trend `≤ −2.5 °C/7d` ×0.6.
- **Särki**: water `<5 °C` ×0.4; water `>25 °C` ×0.5; trend `≤ −2.5 °C/7d` ×0.8.
- **Lahna**: water `<10 °C` ×0.1 (the 15 °C lahna gate is sharp); water `<12 °C` ×0.3; water `>25 °C` ×0.5; trend `≤ −2.5 °C/7d` ×0.7.

### Hourly time-of-day factor

The rantakalastus and pohjaonki pages surface a per-species "best 2-hour window"
for each day. The hourly score is computed as:

```
hourlyScore = dailyScore × (0.4 + 0.6 × scoreTimeOfDay(species, hour) / 100)
```

`scoreTimeOfDay` returns:
- For species with **explicit `peakHours`** (siika, ahven, särki): 100 if hour
  is in the list, 65 if neighbour, 30 otherwise. Sun-relative bonuses do
  *not* apply — at 60.4°N latitude sunrise can be 04:00 in summer, which
  would be wrong for diurnal species.
- For **sun-relative species** (hauki, kuha, lahna): 100 within ±1.5 h of
  sunrise or sunset; 70 within ±2.5 h. Plus night-window bonuses for kuha
  and lahna (full nautical twilight + first half of night = 85), and a
  midday suppression (solar noon ±2 h capped at 40).

| Species | Peak hours |
|---|---|
| Siika | 10, 11, 17, 18 |
| Hauki | sunrise ± 90 min, sunset ± 90 min |
| Ahven | 9, 10, 11, 15, 16, 17, 18 |
| Kuha | sunset ± 90 min, sunrise ± 90 min, **full nautical twilight + night** |
| Särki | 9, 10, 11, 17, 18, 19 |
| Lahna | sunset ± 90 min, sunrise ± 90 min, **first half of night** |

Sunrise/sunset computed from a sinusoidal declination approximation at
60.4°N. The best 2-hour window slides across all 24 hours and picks the
highest-mean span.

### Generic onshore wind direction (rantakalastus + pohjaonki)

Unlike siika (Saaronniemi-specific 225° peak), the multi-species pages
use a wider onshore band: best 180–270° (S/SW/W), worst at 0–45°
(N/NE). Same `Math.round(100 × (1 − dist / 180))` shape, just a wider
optimum.
