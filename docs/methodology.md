# Methodology — scoring algorithm

This document is the **single source of truth** for how the fishing score is computed. If you change the math, update this document in the same commit.

## High-level formula

```
finalScore = clamp(round(baseScore × Π penaltyMultipliers), 0, 100)
```

where `baseScore` is a weighted average of 11 factor scores (each 0–100) and `penaltyMultipliers` are zero or more critical-condition multipliers (each ≤ 1).

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
