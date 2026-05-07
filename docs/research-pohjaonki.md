# Pohjaonki — särki and lahna research

Source-of-truth notes for the two warm-water bottom-feeding cyprinids the
**pohjaonki** forecast covers. Distilled from peer-reviewed cyprinid biology
+ Finnish/Baltic angling literature. Treat this as the calibration reference;
when scoring weights or thresholds change, update this file in the same commit.

For siika see `docs/research.md`. For hauki, ahven, kuha see
`docs/research-rantakalastus.md`.

---

## The gap pohjaonki fills

There is a real "transitional dead zone" between siika season ending and
warm-water predators (perch/zander) ramping up. Lahna in particular is the
species that famously "takes over after siika" in Saaristomeri shore fishing.
The unlock for both särki and lahna is **water reaching ~15 °C**, which at
60.4°N typically lands between **15 May and 5 June**, depending on the year.

So a "zero of anything for a week at the start of May" pattern is exactly
the predicted gap; the lahna window opens within 1–3 weeks. Mechanism is
different (warmer water, mud-bottom bays, twilight + night, omnivorous
benthic feeding) but the calendar slot is the same.

---

## 1. Särki (Roach, *Rutilus rutilus*)

### Season window at 60.4°N

- **Pre-spawn arrival to shore:** late April, water 6–8 °C. Schools stage in
  shallow weed/reed bays. Reachable from shore but feeding is sluggish and
  unreliable.
- **Spawning:** **water 10–14 °C, typically 1–25 May at 60.4°N.** Massive
  shoals push into 0.5–1.5 m vegetation, often with audible splashing —
  same time as bird-cherry (tuomi) blooms. Fish are physically present but
  feeding is paused for the spawn itself (~3–7 days per shoal; whole-population
  spawning spread over ~2 weeks).
- **Post-spawn feeding peak: mid-May to late June**, water 12–18 °C.
  Aggressive recovery feeding, mostly diurnal. **Prime catching window** for
  shore anglers.
- **Summer plateau:** July–August, water 18–22 °C. Steady but heat-shifted:
  best at dawn / late evening, slow at midday. Schools spread across the
  whole littoral.
- **Autumn shift:** **September–October**, water 14 → 8 °C. Hautala (2008)
  documented roach in boreal lakes shifting from diurnal to twilight-peaking
  feeding as littoral water dropped from 20 to 10 °C, and to a low steady
  night activity at 5 °C.
- **Hard shore-season end:** when water falls below ~5 °C (typically late
  November). Roach do feed under ice but that's out of scope.

Score-active band: **April 15 – November 30**. Soft penalty in deep summer
is mild (much milder than for hauki) — roach are tolerant.

### Water temperature

- **Optimum feeding: 14–22 °C.** Wide. Laboratory-preferred temperature in a
  thermal gradient is ~26–27 °C — well above what shore Saaristomeri water
  reaches, so the upper end of the optimum is essentially "as warm as it
  gets here".
- **Active band: 8–24 °C.** Below 8 °C activity drops; above 24 °C feeding
  suppressed but recoverable in the cool of evening.
- **Hard bounds: <4 °C** (effectively dormant in shallows) and **>26 °C**
  (rare in Saaristomeri, lethal-stress territory).
- **Trend sensitivity:** moderate — lower than ahven and far lower than
  siika. Roach are eurythermic. A cold front dropping water 2 °C overnight
  slows them for 12–24 h, then recovers. Weight trend low.
- **Spawning temp:** 10–14 °C, peak ~12 °C.

### Wind

- **Mild onshore preference**, not strong. Wind helps because it concentrates
  plankton/zooplankton + drifts terrestrial insects to leeward shores, but
  roach are less wind-driven than siika or hauki.
- **Optimum 1–6 m/s**; tolerates calm well; >10 m/s breaks shoals up in a
  way that reduces catch.
- **Direction weight: low.** Most weather-direction-flexible cyprinid in the
  model.

### Light, time of day, cloud cover

- **Spring/early summer (water <18 °C):** strongly diurnal. Peak hours
  **08:00–11:00** and **16:00–20:00** local; clear midday lull only on
  bright sunny summer days.
- **High summer (water >19 °C):** dawn (sunrise + 0–2 h) and late evening
  (sunset −2 to +1 h) become best; midday bite collapses on clear days.
- **Autumn (water 10–14 °C):** twilight-peaking — sunrise ±1 h and sunset
  ±1.5 h dominant; daytime drops sharply.
- **Cloud preference: partly cloudy (30–70 %) is best.** Roach are sight-
  feeders but not highly light-shy; full overcast suppresses feeding on
  shallow vegetation; bluebird sun pushes them deep at midday in summer.

### Pressure

Standard rate-of-change story. Reward 3–8 hPa/24h moves; penalize stagnant
high-pressure (|Δp| < 2) summer days. **No falling-pressure boost** — for
benthivorous cyprinids the directionality is weaker than for ambush
predators. Weight similar to siika.

### Precipitation / turbidity

- **Mildly tolerant of turbidity** — roach use both vision and chemoreception.
  Light rain neutral to mildly positive (drifts terrestrials, dims light,
  encourages feeding in shallows).
- Heavy rain (>15 mm/24 h) mildly negative — runoff cools shore pockets and
  adds excessive sediment that degrades sight-feeding.
- Weight precipitation moderately, between ahven (where it hurts more) and
  lahna (where it helps).

### Saaristomeri shore types

Roach are everywhere accessible. Reliable spots:

- **Inner Ruissalo bays** (e.g. east of Saaronniemi cape, Ruissalon kanava
  area) — sheltered, weedy, prime spring spawning.
- **Aurajoki mouth and lower river** — large shoals year-round; especially
  the slow stretches below Halistenkoski and the Pikisaari/harbour shoreline.
- **Pansio bay** — soft-bottom, sheltered, eutrophic; large shoals.
- **Hirvensalo east shore** along the river-mouth shipping channel.
- **Harbour piers and stone walls** anywhere in Turku — utility-class roach
  water.
- Saaronniemi cape itself: OK but *not* prime — too exposed and clean for
  roach. They prefer the inner shore.

### Tackle / method

- **Dominant Finnish shore method: float fishing (mato-onki / pilkki-onki
  kelluvalla)** with maggots (kärpäsen toukat), small earthworms, sweetcorn
  (mais), or bread/dough.
- **Bottom rig with worm or corn** also produces, especially for bigger fish.
- **Groundbaiting (mäskäys)** is widespread among Finnish särki/lahna anglers
  — bread crumbs, vanilla, maggot pieces, corn — chum the spot the evening
  before.
- Light tackle: 0.14–0.18 mm line, hook size 12–16, small float (0.5–2 g).
- Roach also caught as bycatch on light jigs aimed at perch.

### What's not worth modeling

- Solunar / moon phase
- Specific groundbait recipes
- "Roach bite better in coloured water" — too generalised; let cloud +
  precip carry it
- Hour-by-hour schooling-depth modelling

---

## 2. Lahna (Common bream, *Abramis brama*)

The shore window has a sharp opening tied to **water reaching 15 °C**, then
a strong but compressed peak. This is the species whose forecast adding
turns "what now?" into a real summer answer.

### Season window at 60.4°N

- **Pre-spawn staging: mid- to late May**, water 12–14 °C. Lahna move from
  deeper basins toward shallow bays with mud/silt or weedy bottoms, often
  spectacular shoals visible from shore. They feed lightly during this
  phase — **the leading edge of the catchable window**.
- **Spawning: water 14–20 °C, typically 25 May – 20 June at 60.4°N**, peak
  around 15–18 °C. Coincides with **tuomi (bird-cherry) bloom**. Spawning is
  noisy, splashy, in 0.3–1.5 m water in reedy/weedy bays. Spawning is
  **jaksoittainen** (in waves over ~2–3 weeks). Fish present but feeding
  paused during the spawn act itself.
- **Post-spawn feeding peak — the prime shore window: mid-June to late
  July**, water 16–20 °C. Recovery feeding is heavy, especially morning and
  evening. **This is "lahnan kuhinta"** — maximum catch rates, biggest
  shoals.
- **Mid-summer plateau:** August, water 18–22 °C. Steady but largely
  **nocturnal/twilight** — daytime activity drops on clear days, big
  specimens go nocturnal almost exclusively (well-documented across
  Finnish, Polish, German literature).
- **Autumn tail:** September, water 14–18 °C. Reduced but reliable; calmer
  shores preferred (vs summer when they hunt the windward bank). Activity
  continues into October.
- **Hard shore-season end:** water below ~10 °C (early-to-mid October at
  60.4°N). Lahna remain in deep basins through winter, low activity but
  not fully dormant.

Late-autumn warm spells can briefly reopen the window — there are
documented Finnish reports of catching 2 kg bream in mid-October when an
unseasonal warm spell pushed shore water briefly back near 15 °C.

Score-active band: **May 15 – October 15**, with a hard pre-15-May gate.

### Water temperature

- **Optimum feeding: 16–22 °C.** Warmer than perch, similar to zander but
  skewed slightly cooler.
- **Active band: 12–24 °C.**
- **Hard bounds: <10 °C** (effectively absent from shore — schools deep)
  and **>25 °C** (heat-suppressed daytime; nocturnal only).
- FishBase tolerance: 10–24 °C matches.
- **Spawning temp: 14–20 °C, threshold ~15 °C** — the load-bearing gate.
- **Trend sensitivity:** moderate. Warming triggers (rising 2 °C / 3 days
  into 15 °C threshold) are very strong positive — this is what unlocks
  the season. Cooling 2+ °C closes the inshore window quickly because
  lahna retreat to depth.

### Wind — seasonally bimodal

- **Onshore strongly preferred in summer.** Finnish lore: "kesällä lahna
  etsii tuulenpuoleisia rantoja". Wind churns the bottom, lifts food into
  the water column, increases turbidity (which lahna prefer), and reduces
  lahna's notorious wariness of bank disturbance.
- **Onshore preference reverses in autumn:** "syksyllä se tulee tyynille
  rannoille". When water cools, calm bays warm faster in low sun and lahna
  concentrate there.
- **Optimum speed: 3–9 m/s in summer, 0–4 m/s in autumn.**
- **Direction weight: moderate-high in summer, low in autumn.**

### Light, time of day, cloud cover

- **Lahna is a twilight/nocturnal benthivore.** Big specimens are
  particularly nocturnal.
- **Time-of-day peaks: dusk (sunset −1 h to +2 h) and dawn (sunrise −1 h to
  +1 h).** Solid steady bite through the **first half of the night until
  ~02:00**, then quieter pre-dawn. Daytime feeding occurs in spring (cooler
  water), under heavy overcast, and in turbid water — but is never the
  prime window.
- **Cloud preference: overcast is good (60–100 %)**, similar to kuha but
  not as extreme. Bright sun + clear shallow water + flat calm = worst.
  Unlike kuha, lahna does feed at midday under heavy overcast in spring.

Second-most "low-light dependent" species after kuha.

### Pressure

Standard rate-of-change story. The lore that "lahna bites or doesn't bite,
no half-measures" is real but mostly explained by: (a) shoal arrival is
binary — either the shoal is in the bay or it isn't, and (b) sharp pressure
transitions mark the front passage that brings new shoals.

**Mild bonus on falling pressure** within the optimum band (similar to but
weaker than hauki). Penalize stagnant high pressure in summer (correlates
with bright bluebird days that lahna hate).

### Precipitation / turbidity — the headline factor

- **Lahna is the most turbidity-positive of all six species in the model.**
  Benthic feeder using lateral line + chemoreception > vision. Active
  feeding in turbid, mud-stirred water (Adamek 2019).
- **Light to moderate rain (1–10 mm/24 h):** strongly positive. Stirs
  shallows, drops light, washes terrestrial food in.
- **Heavy rain (>20 mm/24 h):** mildly positive at the source, can become
  negative if it cools shore pockets fast in early summer.
- **Recent 48 h rain history:** positive across the board, except for
  cold-front events (handled by trend).
- Weight precipitation **highest of all six species** — meaningfully more
  than even siika (where it hurts) or kuha (where it helps moderately).

### Saaristomeri shore types — and where Saaronniemi falls short

- **Bad for lahna: Saaronniemi cape itself.** Sandy/gravel, exposed,
  relatively clear, no soft bottom. Mediocre at best.
- **Good — soft-bottom sheltered bays with reeds/weed and silt/mud:**
  - **Pansio bay** (Turku) — eutrophic, soft-bottom, classic lahna water.
  - **Aurajoki river mouth and lower river** — turbid, food-rich, brackish
    interface; particularly the slow stretches and harbour basins.
  - **Inner Ruissalo bays** east of the cape (Ruissalon kanava,
    Saaronniemen sisälahti).
  - **Naantali harbour basin** and similar sheltered urban bays.
  - **Hirvensalo south-side bays** (Friskala/Kakskerta inner pockets).
- **Practical rule:** if you would catch siika there, you will not catch
  lahna. The two species' preferred shore types are nearly disjoint at
  Saaronniemi.

### Tackle / method

- **Dominant: bottom rig (pohjaonki) with bait** — large earthworms
  (kastemato) are top-choice in spring, then sweetcorn (mais), maggot
  bunches, bread/dough through summer.
- **Float fishing** with corn, maggots or bread, bottom-set float — common
  for medium specimens.
- **Mäskäys (groundbaiting) is standard practice.** Chum the spot the
  evening before with breadcrumbs + vanilla / aniseed + corn / maggot
  pieces. Shifts catch rates dramatically.
- Hooks: size 6–12 (larger than särki). Line 0.20–0.25 mm. Quiver-tip rod
  or bottom rod with bell/clip alarm.
- Modern feeder/method-feeder rigs from English coarse-fishing scene are
  growing in Finland but not the dominant method.
- Lahna also taken as bycatch on light worm rigs aimed at perch/zander.

### What's not worth modeling

- Solunar / moon phase. (Folk: "uudella kuulla lahna syö parhaiten" — what's
  actually happening is darker nights = longer effective feeding window,
  captured by daylight + cloud already.)
- Specific groundbait recipes / flavour preferences.
- Bird-cherry bloom as a proxy — beautiful tradition but the underlying
  signal is just "water hit 15 °C", which we already have.
- Hour-by-hour shoal-arrival modelling — binary noise.
- Absolute pressure level.

---

## 3. Comparison

| Factor | Siika | Hauki | Ahven | Kuha | Särki | Lahna |
|---|---|---|---|---|---|---|
| Season peak | Apr 15 – May 15 | Apr 20–May 20, Sep 15–Dec 1 | Jun–Aug, Sep–Nov | mid-Jun – Aug, Sep | mid-May – late Jun, Sep | mid-Jun – late Jul, late Aug staging |
| Water-temp opt. | 6–10 | 12–18 | 14–19 | 18–22 | 14–22 | 16–22 |
| Water-temp hard bounds | <4, >12 | <4, >23 | <6, >24 | <10, >24 | <4, >26 | **<10**, >25 |
| Wind weight | High | Highest | Moderate | Moderate-high | Low | Moderate (summer), low (autumn) |
| Time-of-day peaks | 10–12, 17–19 | dawn, dusk | 09–12, 15–19 | dusk, dawn, night | 08–11, 17–20 (spring/summer); twilight (autumn) | dusk + first half of night, dawn |
| Cloud preference | partly | overcast | partly, seasonal | overcast / low-light | partly cloudy | overcast / low-light |
| Pressure boost on falling | Standard | Boosted | Standard | Standard | Standard | Mild boost |
| Precip weight | High (sight feeder) | Low | Moderate | Low-moderate (positive) | Moderate (mild positive) | **Highest, strongly positive** |
| Method | bottom rig + worm | lures | light jig, worm | soft-plastic jig, jerkbait | float-onki, mato/mais/leipä, mäskäys | pohjaonki, kastemato/mais, mäskäys |

### Recommended weights (sum to 100)

| Factor | Siika | Hauki | Ahven | Kuha | Särki | Lahna |
|---|---:|---:|---:|---:|---:|---:|
| Water temp | 30 | 22 | 25 | 22 | 20 | 24 |
| Water temp trend | 8 | 5 | 8 | 5 | 5 | 8 |
| Wind speed | 12 | 15 | 10 | 10 | 6 | 8 |
| Wind direction | 6 | 10 | 5 | 5 | 3 | 5 |
| Cloud / light | 12 | 15 | 12 | 18 | 10 | 14 |
| Pressure 24 h | 8 | 13 | 8 | 7 | 7 | 8 |
| Pressure 48 h | 4 | 5 | 4 | 3 | 4 | 4 |
| Air temp | 4 | 2 | 4 | 2 | 3 | 2 |
| Air temp trend | 6 | 3 | 4 | 3 | 5 | 5 |
| Precip 24 h | 5 | 3 | 5 | 4 | 6 | 8 |
| Precip 48 h | 5 | 2 | 5 | 4 | 5 | 6 |
| Time-of-day | 1 | 5 | 10 | 17 | 6 | 8 |
| **Total** | **100** | **100** | **100** | **100** | **100** | **100** |

Rationale highlights:
- **Särki:** flatter weights, lowest wind-direction weight in the model,
  modest precip (light rain mildly positive), modest time-of-day (because
  the daily window is broad through the prime season), low water-temp-trend
  weight because roach are eurythermic.
- **Lahna:** highest precip weight in the entire model (turbidity-positive),
  heaviest water-temp weight after siika (because the season is sharply
  temperature-gated at 15 °C), meaningful time-of-day weight (twilight
  specialist) but not as high as kuha (lahna feeds for a longer evening +
  first-half-of-night window, and shifts back to daytime in spring overcast).

### Peak hours

| Species | Peak hour starts |
|---|---|
| Siika | 10, 11, 17, 18 |
| Hauki | sunrise ± 90 min, sunset ± 90 min |
| Ahven | 9, 10, 11, 15, 16, 17, 18 |
| Kuha | sunset ± 90 min, sunrise ± 90 min, full nautical twilight + night |
| **Särki** | 9, 10, 17, 18, 19 (broad in prime season, twilight-shifted in autumn) |
| **Lahna** | sunset ± 90 min, sunrise ± 90 min, **first half of night** (with midday suppression on clear days) |

---

## Sources

- Hautala, A. (2008). *Autumnal shift from diurnal to nocturnal peaking
  feeding activity of Rutilus rutilus in boreal lake littoral zones.*
  Journal of Fish Biology — load-bearing cite for the autumn twilight
  shift in roach.
- Bauer, C. & Schlott, G., and Slavík, O. et al. (2024). *The effect of
  temperature on the dynamics of common bream Abramis brama migrations
  between the reservoir and its tributary.* Ecology of Freshwater Fish.
- Backiel, T. & Zawisza, J., and Kucharczyk, D. et al. *Influence of
  temperature during four following spawning seasons on the spawning
  effectiveness of common bream, Abramis brama (L.).* Spawning thresholds
  ~15 °C onset, ~20 °C peak.
- Bohl, E. (1980). *Diel pattern of pelagic distribution and feeding in
  planktivorous fish.* Oecologia.
- Linløkken, A. et al. (2010). *Effect of temperature and roach group size
  on swimming speed and prey capture rate.* Journal of Fish Biology.
- Adamek, Z. et al. (2019). *Relationship between bream (Abramis brama)
  activity and water turbidity in a shallow lake under different season
  conditions.* Journal of Limnology — turbidity-positive feeding.
- FishBase: *Abramis brama* and *Rutilus rutilus* — temperature tolerance.
- Luonnonvarakeskus / Luke (luke.fi) species profiles — *Lahna* and *Särki*.
- Vapaa-ajankalastajat (vapaa-ajankalastaja.fi) species pages.
- *Vapaa-ajan Kalastaja* magazine — *Lahnan pohjaonginta avaa onkikauden*,
  *Mäskäys*-articles.
- *Kalastuslehti* — *Loppusyksyn lämpöaalto aukaisi lahnaikkunan*.
- *Suomen Luonto* — *Lahnojen kutuajat* (bird-cherry-bloom timing,
  ≥15 °C threshold, jaksoittainen kutu).
- Kalastajan Kanava — *Lahna* species page, *Viisi vinkkiä rantakalastukseen
  keväällä*.
- kalassa.net / kalapedia — *Lahnan onginta*, *Aurajoki* shore-fishing.
- Wikipedia (fi/en) — *Särki* / *Common roach*, *Lahna* / *Common bream*.
- WWF Suomi — *Särki ja lahna* (kalaopas) — coastal occurrence, population.
