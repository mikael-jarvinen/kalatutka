# Rantakalastus — pike, perch, zander research

Source-of-truth notes for the three predator species the **rantakalastus**
forecast covers. Distilled from peer-reviewed fish biology + Finnish/Baltic
angling literature. Treat this as the calibration reference: when scoring
weights or thresholds change, update this file in the same commit.

For siika see `docs/research.md`.

---

## 1. Hauki (Pike, *Esox lucius*)

### Season window

Two strong peaks, one summer dead zone.

- **Spring peak (post-spawn aggression): mid-April to mid-May.** Pike spawn
  in shallow (0.5–2 m) reedbeds and flooded grass as soon as ice releases
  the bays, water at 4–8 °C. Spawning at 6–9 °C, ~1–2 weeks. **For 2–3 weeks
  after spawning, females recover and feed aggressively in the same shallow
  bays they spawned in** — single best shore-fishing window of the year. At
  60.4°N: ~20 April – 20 May, ±2 weeks for ice-out variability.
- **Summer slump: late June to mid-August.** Surface water > 19–20 °C → pike
  retreat to thermoclines or deep structure not reachable from shore.
  Catch rates from shore collapse.
- **Autumn peak: mid-September to freeze-up (~late November).** Cooling
  water (8–14 °C) plus pre-winter feeding push big pike back into reachable
  depths. **Trophy window** — average size highest in October–November.

Score-active April 15 – December 1. Soft summer penalty triggered by water
temp, not date.

### Water temperature

- **Optimum feeding: 12–18 °C.**
- **Active but suboptimal:** 6–12 °C (spring/autumn) and 18–22 °C (summer
  dawn/dusk only).
- **Hard bounds:** below 4 °C → lethargic. Above 23 °C → effectively no
  shore fishing.
- **Trend less important than for siika.** Pike are more thermally tolerant
  and adjust over hours. Weight trend at ~half siika's value.

### Wind

- **Onshore preferred** — wind-blown shores concentrate plankton →
  baitfish → pike. Surface chop reduces pike's wariness in clear Baltic
  water.
- **Optimum: 4–8 m/s.** Below 3 m/s the bait-concentration effect doesn't
  develop. Above 12 m/s shore fishing becomes unpleasant.
- **NE / offshore is worst** — same as siika.
- Wind weight is the **highest of the four species** because the
  bait-concentration effect is large and well-documented.

### Light, time of day, cloud cover

Pike are **opportunistic ambush predators with low light dependency** —
they hunt fine in turbid water, low light, even at night. Distinct from
siika.

- **Best time of day:** dawn (sunrise ±1.5 h) and dusk (1 h before sunset
  to 1 h after). Midday peaks in spring and autumn when water is cool.
- **Cloud cover preference: overcast (60–100%) is best**, especially in
  clear water. Bright sun + flat calm + clear water = poor pike conditions
  (too visible, bait spreads out).
- **Seasonal modulation:** in cold spring water (<10 °C) sunny midday is
  fine because the warmest water is then; summer is the opposite.

### Pressure

- **Falling pressure ahead of a front (3–8 hPa drop / 24 h):** strong
  positive. The "before the storm" effect has actual support in pike
  behavior, mediated indirectly via light/wind/bait response.
- **Stable high pressure (|Δp| < 2 hPa / 48 h, esp. summer):** strongly
  poor.
- **Extreme drops (>15 hPa / 24 h):** mixed — fishing during the drop is
  great, the post-storm low-pressure stable period is mediocre.

Reward 5–8 hPa/24h drops more than for siika; penalize stagnant pressure
harder.

### Precipitation / turbidity

Pike tolerate turbidity well via lateral-line sensing and aggressive
strikes. Light rain or mild post-rain turbidity is **neutral to slightly
positive** — dims light, emboldens pike. Heavy rain runoff is mildly
negative. Weight precipitation low.

### Saaristomeri shore types

Pike concentrate in:
- **Sheltered reedy bays (kaislikko)** — best, especially spring.
  Saaronniemi-area: inner Ruissalo bays (east of the cape).
- **Submerged vegetation lines / weed edges** — summer.
- **Rocky points with drop-offs** — autumn (Kolkannokka itself).
- **Stream/ditch mouths** — concentrate bait. Limited around Saaronniemi.

Different water from siika's open sandy/gravel shores. Saaronniemi has
both: siika water on the SW point, pike water in the inner bays.

### Tackle / method

Finnish shore pike anglers use **lures**: jerkbaits, soft plastics on jigs,
spinnerbaits, in-line spinners. Some use dead-bait rigs (smelt, herring)
under floats or on bottom rigs in cold water. Live bait is legal but
uncommon. **Model assumes lure fishing** — visibility and chase
willingness matter; long-soak factors don't.

### What's not worth modeling

- Solunar / moon phase
- Lure colour theory
- Absolute pressure
- "3-day cycles" folklore — no peer-reviewed support

---

## 2. Ahven (Perch, *Perca fluviatilis*)

### Season window

- **Pre-spawn / spawn: late April to mid-May.** Perch spawn at 7–12 °C,
  slightly later than pike. Egg ribbons on submerged vegetation in 1–3 m.
  **Pre-spawn aggregations in late April are the spring peak** — large
  females stack near spawning sites.
- **Post-spawn recovery (~2 weeks, mid-May to early June):** moderate.
- **Summer peak: late June – August.** Water > 14–15 °C → schooling and
  feeding all day. **Best general-action window** — high catch numbers,
  mostly small-to-medium fish.
- **Autumn trophy peak: September – mid-November.** Cooling water (14 → 8
  °C) drives big perch ("kilon ahven", 1 kg+) into shore-reachable schools
  chasing baitfish.
- **Winter** — ice fishing, out of scope.

Shore window: **mid-April – late November**.

### Water temperature

- **Optimum: 14–19 °C.** Wider and warmer than pike.
- **Active:** 8–22 °C.
- **Hard bounds:** <6 °C feeding slows. Up to ~24 °C tolerated with reduced
  activity.
- **Trend matters more than for pike** — perch are sensitive to
  rising-temperature triggers in spring (2–3 °C rise / week → strong
  positive).

### Wind

Subtler than pike, partly reverses with conditions.

- **Light onshore (2–6 m/s) is good** — concentrates plankton, stimulates
  feeding.
- **Strong wind (>8 m/s) is generally negative** — perch are less
  aggressive than pike, schools break in heavy chop (especially smaller
  fish).
- **Calm conditions tolerable** — perch will feed on flat calm sunny
  summer days as confident sight-feeders in schools.
- **Direction matters less** than for siika and pike; onshore still
  slightly preferred.

Lower weight than pike; narrower optimum.

### Light, time of day, cloud cover

Schooling diurnal sight-feeders — closer to siika than pike.

- **Best time of day: 09:00–12:00 mid-morning** and **15:00–19:00 late
  afternoon**, with a clear midday lull in summer. Dawn/dusk less critical
  than for pike. **Active feeding requires daylight.**
- **Cloud cover: partly cloudy (30–70%) often best.** Full sun in summer
  drives perch deeper; full overcast suppresses feeding. Spring/autumn
  favour more sun (warmth-driven). Opposite to pike.
- **Seasonal modulation strong:**
  - Spring perch want sunny midday (warmth).
  - Summer perch want cooler dawn / late afternoon under partial cloud.
  - Autumn perch want midday sun on calm days, late afternoon on windier.

### Pressure

Rate-of-change matters but at a smaller magnitude than for pike. Score
|Δp| similarly to siika; do not boost falling-pressure reward.

### Precipitation / turbidity

Sight-feeder — turbidity hurts perch more than pike, less than siika.
Light rain neutral; heavy rain producing visible turbidity is a noticeable
negative. 2+ days continuous overcast rain is a moderate negative. Weight
precipitation moderately.

### Saaristomeri shore types

- **Rocky/stony shores with broken bottom** — primary habitat.
  Kolkannokka itself is good summer/autumn perch water.
- **Drop-offs and points** — schools follow the contour.
- **Mixed weed/rock edges** — best of both.
- **Harbour structures, piers** — reliable urban perch.

Saaronniemi's siika water and perch water overlap heavily — same
SW-facing rocky shore, different seasons.

### Tackle / method

**Soft plastics on light jigs (1–10 g)** dominant, plus small spinners,
small wobblers, and **float-fished worms or maggots** for casual / family
fishing. Bottom rigs with worms also produce, especially spring. The
forecast should serve both lure anglers (visibility, chop) and bait
anglers (less wind sensitivity, more time-of-day driven).

### What's not worth modeling

- Solunar / moon phase
- Hour-by-hour school-depth modeling (too noisy for daily forecast)
- Bait colour preference
- Folklore about perch and thunder

---

## 3. Kuha (Zander, *Sander lucioperca*)

### Season window

Saaristomeri kuha is genuinely a different beast from inland-lake
(Vesijärvi, Päijänne) kuha. **Brackish-water coastal stock**, more nomadic
(follow baitfish — sprat, smelt, juvenile herring), uses inner archipelago
in summer, retreats to deeper basins in winter. Coastal populations
expanded with warming summers in the 1990s–2010s.

Spawning at 60.4°N: late May – mid-June, in shallow (1–3 m) sheltered bays
with hard-rubble or root-mat bottoms, water at **12–15 °C**. Males guard
nests 1–2 weeks; both sexes feed minimally during the spawn itself.

**Closed season for kuha in Finnish saltwater: April 1 – May 31.**
Minimum size in coastal waters: **42 cm** (since 2019).

Practical shore season:
- **Pre-spawn staging (mid-May):** moving inshore but largely off-limits
  by regulation.
- **Post-spawn recovery (mid-June):** water 14–17 °C, feeding ramps up,
  first real shore window.
- **Peak: late June – August.** Water 17–22 °C — *the* kuha window.
- **Second peak: September.** Water 14–18 °C — bigger fish, predictable
  evenings.
- **Tail: October until water drops below ~8 °C.**

Inverse of siika — warm water is the friend.

### Water temperature

- **Optimum feeding: 18–22 °C.**
- **Hard bounds:** <10 °C (lethargic, deep-water only) and >24 °C
  (suppresses daytime activity, shifts feeding fully into night).
- The **warmest-water predator** of the four (siika 6–10, pike 12–18,
  perch 14–19, kuha 18–22).
- Trend sensitivity weaker than siika: cold front dropping water 3 °C /
  48 h kills bite for ~24 h, but recovery is faster than for siika.

### Light, time of day, cloud cover — the headline factor

The *tapetum lucidum* (eye reflective layer) is real — kuha outperform
their prey at low light. The folk wisdom **"kuhakeli"** (windy, cloudy,
slight chop, slightly turbid) is well-supported by Finnish research and
angler catch records.

- **Time-of-day peaks: dusk (sunset ±1.5 h) and dawn (sunrise ±1 h).**
  Midday bite collapses on bright clear days; can be steady on overcast
  days.
- **Night fishing legal in Finland and the single most productive window
  for shore kuha in midsummer.** Practical at 60.4°N: 22:00–02:00
  nautical twilight in June/July.
- **Cloud cover matters strongly.** Overcast extends bite through the
  day. Clear bluebird high-pressure days are the worst.

This is the factor most distinguishing kuha. **Weight high.**

### Wind

Onshore (S/SW/W) preference is strong — wind churns surface, pushes
baitfish toward shore, reduces light penetration.
- **Optimum 4–8 m/s**, tolerable to 12 m/s.
- Tolerates chop better than perch, on par with pike.
- Unlike pike, kuha doesn't shut down in dead calm — shifts entirely to
  night feeding.
- Offshore N/NE is bad.

### Pressure

Same rate-of-change story as the others, no kuha-specific quirk in the
literature. Falling pressure mildly positive (correlated with cloud +
wind = kuhakeli). Stable high pressure negative *because* correlated with
bright clear conditions, not because of pressure itself.

### Turbidity / precipitation

Kuha **prefer** mildly turbid water (Secchi 1–3 m ideal). They outperform
sight-feeders here. Light to moderate rain **positive** — knocks down
light, stirs runoff turbidity in shore pockets near stream mouths. Heavy
rain (>15 mm/24h) neutral-to-mildly-negative — drops salinity and
temperature in shallow pockets.

Most turbidity-positive of the four. Reverse polarity vs. siika.

### Saaristomeri shore types

**Saaronniemi is mediocre kuha water** — sandy/gravel cape, relatively
clear and exposed. Kuha prefer:

1. **Channel mouths and drop-offs with current** — Hirvensalo eastern
   shore (Aurajoki outflow into inner archipelago, brings turbidity and
   bait), Pikisaari/Korppolaismäki along the Aura river-mouth shipping
   channel.
2. **Sheltered turbid bays with soft bottoms** — Pansio bay, Naantali
   harbour area.
3. **Hirvensalo south-side drop-offs** near Friskala/Kakskerta channel.

For weather inputs all share the same Open-Meteo cell and Föglö water-temp
proxy — only the *wind direction calibration* changes per spot. The
forecast page assumes generic onshore preference (no Saaronniemi-specific
sector) for the rantakalastus species.

### Tackle / method

**Weighted soft plastics (jig)** — 7–14 g jigheads with 3–5"
shads/curl-tails, fished slow along bottom — and **deep-running
suspending jerkbaits** (Husky Jerk, X-Rap) at dusk/twilight. Live/dead
baitfish (smelt, small herring) on bottom rigs is effective but less
common among hobbyists. Trolling dominant overall but out of scope for
shore.

### What's not worth modeling

- Solunar / moon phase
- "Kuha bites best on the new moon" — folk belief; what's really
  happening is darker nights = more night-feeding window, captured by
  daylight/cloud already
- Absolute pressure level
- Air temperature in isolation (only matters as slow water-temp proxy;
  lower weight than siika)
- Water clarity from Open-Meteo (not available; cloud + recent precip
  stand in)

---

## 4. Comparison

| Factor | Siika | Hauki | Ahven | Kuha |
|---|---|---|---|---|
| Season peak | Apr 15 – May 15 | Apr 20–May 20, Sep 15–Dec 1 | Jun–Aug, Sep–Nov | mid-Jun – Aug, Sep |
| Water-temp opt. | 6–10 | 12–18 | 14–19 | 18–22 |
| Water-temp hard bounds | <4, >12 | <4, >23 | <6, >24 | <10, >24 |
| Wind weight | High | Highest | Moderate | Moderate-high |
| Time-of-day peaks | 10–12, 17–19 | dawn, dusk | 09–12, 15–19 | dusk, dawn, **night** |
| Cloud preference | partly | overcast | partly, seasonal | overcast / low-light (strong) |
| Pressure boost on falling | Standard | Boosted | Standard | Standard (mild) |
| Precip weight | High (sight feeder) | Low | Moderate | Low-moderate (positive at low mm) |
| Method | bottom rig + worm | lures (jerkbait/jig) | light jig, worm | soft-plastic jig, jerkbait |

### Recommended weights (sum to 100)

| Factor | Siika | Hauki | Ahven | Kuha |
|---|---:|---:|---:|---:|
| Water temp | 30 | 22 | 25 | 22 |
| Water temp trend | 8 | 5 | 8 | 5 |
| Wind speed | 12 | 15 | 10 | 10 |
| Wind direction | 6 | 10 | 5 | 5 |
| Cloud / light | 12 | 15 | 12 | 18 |
| Pressure change 24 h | 8 | 13 | 8 | 7 |
| Pressure change 48 h | 4 | 5 | 4 | 3 |
| Air temp | 4 | 2 | 4 | 2 |
| Air temp trend | 6 | 3 | 4 | 3 |
| Precipitation 24 h | 5 | 3 | 5 | 4 |
| Precipitation 48 h | 5 | 2 | 5 | 4 |
| Time-of-day | (1) | (3) | (2) | 17 |
| **Total** | **100** | **100** | **100** | **100** |

(1)–(3) For non-kuha species the time-of-day weight is small because their
peak hours don't dominate the day; kuha is the one species where the
hourly window is critical and gets a heavy weight.

### Peak hours

| Species | Peak hour starts |
|---|---|
| Siika | 10, 11, 17, 18 |
| Hauki | sunrise ± 90 min, sunset ± 90 min |
| Ahven | 9, 10, 11, 15, 16, 17, 18 |
| Kuha | sunset ± 90 min, sunrise ± 90 min, full nautical twilight + night |

---

## Sources

- Craig, J. F. (ed.) — *Pike: Biology and Exploitation* (Springer / Chapman & Hall Fish and Fisheries Series).
- Thorpe, J. — *Synopsis of biological data on the perch* (FAO Fisheries Synopsis 113).
- Heibo, E. & Magnhagen, C. — Perch biology in northern Europe (*Ecology of Freshwater Fish*).
- Lehtonen, H., Salminen, M. — Luke (Natural Resources Institute Finland) coastal pike + zander stock studies.
- Heikinheimo, O., Lehtonen, H., Lehtonen, P. — Finnish coastal zander population dynamics, *Boreal Environment Research* and *Fisheries Research*.
- Engstedt, O. et al. — *Anadromous pike in the Baltic Sea*.
- Casselman, J. M. — Pike thermal ecology.
- Eklöv, P. — Foraging behaviour of pike and perch.
- Vehanen, T. et al. — habitat preference studies on zander in Finnish brackish waters.
- Salminen, M. & Böhling, P., eds., *Kalavedet kuntoon* (RKTL/Luke).
- Hyvärinen & Vehanen — Luke reports on diel activity and turbidity preference in coastal zander.
- Vapaa-ajankalastajat — *Hauki*, *Ahven*, *Kuha* species guides.
- Finnish Wildlife Agency / Metsähallitus — Saaristomeri rules (closed seasons, minimum sizes, gear restrictions).
- *Erä*, *Metsästys ja Kalastus*, *Vapaa-ajan Kalastaja* magazine archives — Saaristomeri shore-fishing features.
- kalastus.fi, kalapaikka.net, kalastajankanava.fi — community discussion threads, used to cross-check angler-reported windows against literature.
