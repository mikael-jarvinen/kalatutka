/**
 * baits.js — condition-aware bait/lure recommendation engine.
 *
 * For each species, BAIT_RULES is an ordered list of recommendations. Each
 * rule has a `match` predicate over the day's conditions; the first match
 * wins. Rules are ordered from narrow to broad — bloom/closed/critical
 * conditions first, then specific season×weather combos, then a generic
 * fallback.
 *
 * Each rule returns a primary + (often) secondary lure with type, size,
 * weight, color, specific Finnish products, and a Finnish-language hint.
 *
 * Citations for the underlying Finnish angling lore are in
 * docs/sources.md §7 (per-species). All recommendations follow Saaristomeri
 * brackish-water defaults (slightly stained-green clarity) rather than
 * inland-lake clear-water defaults.
 *
 * The conditions input is the same shape that the scoring functions
 * consume: water temp, cloud %, wind m/s, hour-of-day, turbidity flag,
 * day-of-year. `recommendBait(species, conditions)` returns null for
 * unknown species, or { primary, secondary?, hint, id }.
 */

const NO_FISH = (hint) => ({ primary: null, secondary: null, hint, id: "skip" });

export const BAIT_RULES = {
  hauki: [
    { id: "bloom-skip",
      match: c => c.turbidity === "bloom",
      ...NO_FISH("Sinileväkukinta — kalat eivät syö. Vaihda paikkaa tai päivää.") },

    { id: "cold-clear-calm",
      match: c => c.waterTempC < 10 && c.turbidity === "clear" && c.windMs < 3,
      primary: { type: "Suspending jerkbait", size: "12 cm", weight: "16 g",
                 color: "luonnonväri: ahven / hopea-sini",
                 products: ["Rapala Husky Jerk 12", "Salmo Slider 12"] },
      secondary: { type: "Pehmeä paddletail", size: "12 cm", weight: "18 g",
                   color: "watermelon / kuore",
                   products: ["Savage Gear Craft Cannibal 12.5"] },
      hint: "Kylmä vesi: hidas twitch-pause, anna haljeta paussille." },

    { id: "cold-overcast",
      match: c => c.waterTempC < 10 && (c.cloudPct > 60 || c.windMs >= 3),
      primary: { type: "Glide bait", size: "14 cm", weight: "38 g",
                 color: "firetiger / hot perch",
                 products: ["Westin Mike 14", "Strike Pro Buster Jerk 15"] },
      secondary: { type: "Spinnerbait", size: "—", weight: "14 g",
                   color: "valkoinen-chartreuse, willowleaf",
                   products: ["Booyah Pikee 1/2 oz", "Northland Reed-Runner"] },
      hint: "Pilvistä ja viileää: leveä glide tai spinnerbait." },

    { id: "warm-clear-midday",
      match: c => c.waterTempC >= 15 && c.waterTempC < 20
              && c.turbidity === "clear" && c.cloudPct < 40
              && c.hourOfDay >= 10 && c.hourOfDay <= 16,
      primary: { type: "Pehmeä paddletail", size: "10 cm", weight: "14 g",
                 color: "luonnonväri ahven / watermelon",
                 products: ["Savage Gear Craft Cannibal 10", "ORKA Shad Tail 10.5"] },
      secondary: { type: "Inline-lippa", size: "—", weight: "18 g",
                   color: "hopea",
                   products: ["Mepps Aglia 4", "Blue Fox Vibrax 5"] },
      hint: "Lämmin kirkas keskipäivä: pienennä, luonnonvärit." },

    { id: "warm-chop",
      match: c => c.waterTempC >= 15 && c.waterTempC < 20
              && (c.cloudPct >= 40 || c.windMs >= 4),
      primary: { type: "Spinnerbait", size: "—", weight: "18 g",
                 color: "valkoinen-chartreuse Colorado",
                 products: ["Booyah Pikee 1/2 oz", "Strike Pro Pig & Jig"] },
      secondary: { type: "Pehmeä paddletail", size: "14 cm", weight: "21 g",
                   color: "firetiger",
                   products: ["Savage Gear 4Play 13", "Westin Hypoteez 14"] },
      hint: "Pilveä tai aaltoa: tärinää ja kirkasta väriä." },

    { id: "warm-twilight",
      match: c => c.waterTempC >= 16
              && (c.hourOfDay <= 6 || c.hourOfDay >= 20)
              && c.windMs < 5,
      primary: { type: "Pintaviehe (popper / prop)", size: "65–90 mm", weight: "10–14 g",
                 color: "musta / valkoinen vatsa",
                 products: ["Ruthless Plopper Popper 65", "Rapala Skitter Pop 9"] },
      secondary: { type: "Iso glide bait", size: "18 cm", weight: "60 g",
                   color: "ahven",
                   products: ["Westin Mike 18", "Strike Pro Buster Jerk 18"] },
      hint: "Lämmin hämärä: pintaviehe rauhalliseen veteen." },

    { id: "hot-midday",
      match: c => c.waterTempC >= 20 && c.hourOfDay >= 10 && c.hourOfDay <= 16,
      primary: { type: "Pehmeä shadi", size: "8 cm", weight: "10 g",
                 color: "luonnonväri",
                 products: ["Savage Gear Craft Cannibal 8", "Berkley Pulse Shad 8"] },
      hint: "Kuuma keskipäivä: hauki passiivinen — pienennä tai vaihda lajia." },

    { id: "autumn-cool-calm",
      match: c => c.waterTempC >= 8 && c.waterTempC < 14 && c.windMs < 4
              && c.dayOfYear >= 240,
      primary: { type: "Iso paddletail", size: "14–18 cm", weight: "21 g",
                 color: "ahven / kuore luonnonväri",
                 products: ["Savage Gear 4Play 13", "ORKA Shad 18"] },
      secondary: { type: "Suspending jerkbait", size: "14 cm", weight: "26 g",
                   color: "kuore-hopea",
                   products: ["Rapala Husky Jerk 14"] },
      hint: "Syyskylmenevä: isompi profiili, hidas tasainen veto." },

    { id: "autumn-cool-windy",
      match: c => c.waterTempC >= 8 && c.waterTempC < 14 && c.windMs >= 4
              && c.dayOfYear >= 240,
      primary: { type: "Iso paddletail", size: "18 cm", weight: "28 g",
                 color: "firetiger / hot perch",
                 products: ["ORKA Shad 18", "Westin Hypoteez 18"] },
      hint: "Syksy + tuuli: paino pohjassa, voimakas väri." },

    { id: "turbid-postfront",
      match: c => c.turbidity === "turbid",
      primary: { type: "Spinnerbait", size: "—", weight: "21 g",
                 color: "chartreuse-oranssi Colorado",
                 products: ["Booyah Pikee 1/2 oz", "Strike Pro Pig & Jig"] },
      secondary: { type: "Chatterbait", size: "—", weight: "15 g",
                   color: "firetiger",
                   products: ["Ruthless Chatterbait 15"] },
      hint: "Aallon nostama sameus: tärinää ja kontrastia." },

    { id: "late-autumn",
      match: c => c.waterTempC < 10 && c.dayOfYear > 270,
      primary: { type: "Iso paddletail", size: "18–20 cm", weight: "21 g",
                 color: "motor oil / ahven",
                 products: ["ORKA Shad 18", "Savage Gear Real Eel 20"] },
      hint: "Loppusyksy: iso profiili, lähes pysähtynyt veto." },

    { id: "default",
      match: () => true,
      primary: { type: "Pehmeä paddletail", size: "12 cm", weight: "18 g",
                 color: "ahven",
                 products: ["Savage Gear Craft Cannibal 12.5"] },
      hint: "Yleisviehe: paddletail 12 cm ahvenvärillä." }
  ],

  ahven: [
    { id: "bloom-skip", match: c => c.turbidity === "bloom",
      ...NO_FISH("Sinileväkukinta — älä kalasta.") },

    { id: "spawn-period",
      match: c => c.waterTempC >= 7 && c.waterTempC <= 10
              && c.dayOfYear >= 110 && c.dayOfYear <= 140,
      primary: { type: "Float-onki kastemadolla", size: "—", weight: "—",
                 color: "—",
                 products: ["Koukku 12, kelluja 1 g, elävä kastemato"] },
      hint: "Kutuaika: madonki kaislojen reunaan." },

    { id: "cold-clear-bright",
      match: c => c.waterTempC < 10 && c.turbidity === "clear" && c.cloudPct < 50,
      primary: { type: "Drop-shot", size: "6 cm finesse-worm", weight: "5 g drop-shot",
                 color: "luonnonväri watermelon / morning dawn",
                 products: ["Berkley Gulp Minnow 3\"", "Westin Slim Teez"] },
      secondary: { type: "Suspending vaappu", size: "8 cm", weight: "8 g",
                   color: "ahven",
                   products: ["Rapala Husky Jerk 8", "Nils Master Invincible 8"] },
      hint: "Kylmä kirkas: drop-shot ja luonnonvärit." },

    { id: "cold-overcast",
      match: c => c.waterTempC < 10 && (c.cloudPct >= 50 || c.windMs >= 4),
      primary: { type: "Blade bait", size: "5–6 cm", weight: "8 g",
                 color: "hopea-firetiger",
                 products: ["Westin Hypovibe 5", "Cotton Cordell Gay Blade"] },
      secondary: { type: "Jighead + shadi", size: "6 cm", weight: "5 g",
                   color: "chartreuse",
                   products: ["Savage Gear Bleak Paddle Tail 6.5"] },
      hint: "Kylmä pilvinen: bladin tärinä herättää passiiviset." },

    { id: "warm-clear-midday",
      match: c => c.waterTempC >= 15 && c.waterTempC < 20
              && c.turbidity === "clear" && c.cloudPct < 40,
      primary: { type: "Jighead + shadi", size: "5–6 cm", weight: "5 g",
                 color: "luonnonväri kuore / watermelon",
                 products: ["Savage Gear Bleak Paddle Tail 8", "Berkley Pulse Shad 6"] },
      secondary: { type: "Inline-lippa", size: "—", weight: "5 g",
                   color: "hopea",
                   products: ["Mepps Aglia Long 2"] },
      hint: "Lämmin kirkas: pieni jigi luonnonvärillä." },

    { id: "warm-cloudy-windy",
      match: c => c.waterTempC >= 15 && (c.cloudPct >= 40 || c.windMs >= 4),
      primary: { type: "Jighead + shadi", size: "7 cm", weight: "7 g",
                 color: "chartreuse / hot pink",
                 products: ["Savage Gear Cannibal 6.5", "Dominator URSB 7.5"] },
      secondary: { type: "Inline-lippa", size: "—", weight: "7 g",
                   color: "kulta",
                   products: ["Mepps Aglia Long 3"] },
      hint: "Lämmin pilvinen/aaltoinen: kirkas väri." },

    { id: "warm-dawn-dusk",
      match: c => c.waterTempC >= 15 && (c.hourOfDay <= 7 || c.hourOfDay >= 19),
      primary: { type: "Pieni vaappu", size: "5–7 cm", weight: "5 g",
                 color: "ahven / hopea",
                 products: ["Rapala Original F7", "Nils Master Invincible 5"] },
      secondary: { type: "Jighead + shadi", size: "7 cm", weight: "5 g",
                   color: "valkoinen-pearl",
                   products: ["Berkley Pulse Shad 7"] },
      hint: "Hämärä: vaappu kasvuston yli." },

    { id: "hot-midday",
      match: c => c.waterTempC >= 20 && c.hourOfDay >= 10 && c.hourOfDay <= 16,
      primary: { type: "Drop-shot", size: "5–7 cm worm", weight: "10 g",
                 color: "luonnonväri",
                 products: ["Berkley Gulp Minnow", "Westin Slim Teez 4\""] },
      hint: "Kuuma keskipäivä: syvälle pudotukselle, natural." },

    { id: "autumn-calm",
      match: c => c.waterTempC >= 8 && c.waterTempC < 14 && c.windMs < 4
              && c.dayOfYear >= 240,
      primary: { type: "Jighead + shadi", size: "8–10 cm", weight: "10–14 g",
                 color: "motor oil / ruskea / watermelon-red",
                 products: ["Savage Gear Cannibal 10", "Berkley Pulse Shad 8"] },
      hint: "Syksy: isompi shadi, tumma luonnonväri." },

    { id: "autumn-windy",
      match: c => c.waterTempC >= 8 && c.waterTempC < 14 && c.windMs >= 4
              && c.dayOfYear >= 240,
      primary: { type: "Blade bait", size: "6–8 cm", weight: "10–12 g",
                 color: "ahven / chrome",
                 products: ["Westin Hypovibe 7"] },
      secondary: { type: "Jighead + shadi", size: "8 cm", weight: "10 g",
                   color: "ruskea / oranssi",
                   products: ["Savage Gear Cannibal 8"] },
      hint: "Syksy + tuuli: blade tai painava jigi." },

    { id: "turbid",
      match: c => c.turbidity === "turbid",
      primary: { type: "Jighead + shadi", size: "7 cm", weight: "7 g",
                 color: "chartreuse / firetiger",
                 products: ["Savage Gear Cannibal 6.5"] },
      secondary: { type: "Blade bait", size: "5–6 cm", weight: "8 g",
                   color: "firetiger",
                   products: ["Westin Hypovibe 5"] },
      hint: "Aallon sameus: kontrastia ja tärinää." },

    { id: "late-autumn",
      match: c => c.waterTempC < 10 && c.dayOfYear > 270,
      primary: { type: "Jighead + shadi", size: "10 cm", weight: "14 g",
                 color: "tumma / motor oil",
                 products: ["Savage Gear Cannibal 10"] },
      hint: "Loppusyksy: isot ahvenet, tummat värit." },

    { id: "default",
      match: () => true,
      primary: { type: "Jighead + shadi", size: "7 cm", weight: "7 g",
                 color: "ahven",
                 products: ["Savage Gear Bleak Paddle Tail 8"] },
      hint: "Yleisviehe: 7 g jigi ahvenvärillä." }
  ],

  kuha: [
    { id: "bloom-skip", match: c => c.turbidity === "bloom",
      ...NO_FISH("Sinileväkukinta — älä kalasta.") },

    { id: "midday-clear-summer-skip",
      match: c => c.waterTempC >= 15 && c.turbidity === "clear"
              && c.cloudPct < 40 && c.hourOfDay >= 10 && c.hourOfDay <= 16,
      primary: { type: "Slim shadi", size: "13 cm", weight: "18 g",
                 color: "luonnonväri kuore",
                 products: ["Savage Gear Sandeel Slim 12.5"] },
      hint: "Kirkas keskipäivä: kuha syvällä — odota hämärää tai tähtää 4–6 m." },

    { id: "twilight-warm",
      match: c => c.waterTempC >= 14
              && (c.hourOfDay <= 6 || c.hourOfDay >= 20 || c.hourOfDay <= 2),
      primary: { type: "Suspending jerkbait", size: "12 cm", weight: "16 g",
                 color: "ahven / kuore-hopea",
                 products: ["Rapala Husky Jerk 12", "Rapala X-Rap 10"] },
      secondary: { type: "Slim shadi", size: "11–12 cm", weight: "10–14 g",
                   color: "valkoinen-pearl / kuore",
                   products: ["Westin ShadTeez Slim 12", "Savage Gear Sandeel Slim"] },
      hint: "Hämärä/yö: hitaat suspendingit pitkillä pausseilla." },

    { id: "cold-prespawn",
      match: c => c.waterTempC < 10,
      primary: { type: "Jighead + shadi", size: "12 cm", weight: "14 g",
                 color: "luonnonväri / motor oil",
                 products: ["Savage Gear Sandeel Slim 12.5", "ORKA Shad Tail 10.5"] },
      secondary: { type: "Suspending jerkbait", size: "12 cm", weight: "16 g",
                   color: "kuore",
                   products: ["Rapala Husky Jerk 12"] },
      hint: "Kylmä esikutu: hidas vetely pohjaa pitkin." },

    { id: "postspawn-warming",
      match: c => c.waterTempC >= 12 && c.waterTempC <= 14,
      primary: { type: "Jighead + shadi", size: "14–15 cm", weight: "21 g",
                 color: "ahven / kuore",
                 products: ["Savage Gear 4Play 13", "Westin ShadTeez 14"] },
      hint: "Kudun jälkeen palautuvat naaraat syövät — isompi shadi kivikkoon." },

    { id: "autumn-calm",
      match: c => c.waterTempC >= 10 && c.waterTempC < 14 && c.windMs < 4,
      primary: { type: "Jighead + shadi", size: "13–15 cm", weight: "18 g",
                 color: "motor oil / luonnonväri ahven",
                 products: ["Westin ShadTeez 12", "Savage Gear 4Play 13"] },
      secondary: { type: "Suspending jerkbait", size: "12 cm", weight: "16 g",
                   color: "ahven",
                   products: ["Rapala Husky Jerk 12"] },
      hint: "Syksy tyyni: hidas vetely pohjaa pitkin." },

    { id: "autumn-windy",
      match: c => c.waterTempC >= 10 && c.waterTempC < 14 && c.windMs >= 4,
      primary: { type: "Jighead + shadi", size: "15 cm", weight: "21–28 g",
                 color: "firetiger / pink pearl",
                 products: ["Westin ShadTeez 14", "Savage Gear 4Play 15"] },
      secondary: { type: "Blade bait", size: "9 cm", weight: "15 g",
                   color: "ahven",
                   products: ["Westin Hypovibe 9"] },
      hint: "Syksy + tuuli: paino pohjassa, kontrastiväri." },

    { id: "turbid",
      match: c => c.turbidity === "turbid",
      primary: { type: "Jighead + shadi", size: "13 cm", weight: "14 g",
                 color: "chartreuse / hot pink",
                 products: ["Westin ShadTeez 12 chartreuse"] },
      secondary: { type: "Vibrating jig", size: "—", weight: "15 g",
                   color: "firetiger",
                   products: ["Westin Hypovibe 7"] },
      hint: "Aallon sameus: kontrastia ja tärinää." },

    { id: "late-autumn",
      match: c => c.waterTempC < 10 && c.dayOfYear > 270,
      primary: { type: "Iso shadi", size: "15 cm", weight: "18–21 g",
                 color: "motor oil / tumma",
                 products: ["Westin ShadTeez 14", "Savage Gear 4Play 15"] },
      secondary: { type: "Pohjaonki silakalla", size: "silakka kokonainen",
                   weight: "30–60 g lyijy", color: "—",
                   products: ["Pohjaonki + pakastesilakka, 3/0 koukku"] },
      hint: "Loppusyksy: iso hidas shadi tai silakka pohjalle." },

    { id: "default",
      match: () => true,
      primary: { type: "Suspending jerkbait", size: "12 cm", weight: "16 g",
                 color: "ahven",
                 products: ["Rapala Husky Jerk 12"] },
      hint: "Yleisviehe kuhalle: Husky Jerk 12 cm." }
  ],

  sarki: [
    { id: "bloom-skip", match: c => c.turbidity === "bloom",
      ...NO_FISH("Sinileväkukinta — älä kalasta.") },

    { id: "cold-spawn",
      match: c => c.waterTempC >= 8 && c.waterTempC <= 14
              && c.dayOfYear >= 120 && c.dayOfYear <= 150,
      primary: { type: "Float-onki", size: "—", weight: "—",
                 color: "—",
                 products: ["Koukku 12–14, kelluja 1 g, mato tai mais"] },
      hint: "Kutuaika kasvustoissa — mato/mais kelluvalla." },

    { id: "warm-clear",
      match: c => c.waterTempC >= 14 && c.cloudPct < 50,
      primary: { type: "Float-onki", size: "—", weight: "0.5–2 g kelluja",
                 color: "—",
                 products: ["Mato / kärpäsen toukka", "Mais", "Leipätaikina"] },
      secondary: { type: "Pieni jigi", size: "5 cm", weight: "3 g",
                   color: "luonnonväri",
                   products: ["Savage Gear Bleak Paddle Tail 6.5"] },
      hint: "Lämmin: kelluva onki kalliolle, satamassa tai laiturilla." },

    { id: "warm-cloudy",
      match: c => c.waterTempC >= 14 && c.cloudPct >= 50,
      primary: { type: "Float-onki", size: "—", weight: "—",
                 color: "—",
                 products: ["Mato / mais / leipätaikina"] },
      hint: "Pilvinen lämmin: aktiivisia parvia päivän mittaan." },

    { id: "autumn-twilight",
      match: c => c.waterTempC >= 8 && c.waterTempC < 14
              && (c.hourOfDay <= 8 || c.hourOfDay >= 18),
      primary: { type: "Float-onki / kevyt jigi", size: "—",
                 weight: "5–7 g jigi tai 1 g kelluja",
                 color: "tumma luonnonväri",
                 products: ["Mato kelluvalla", "Pieni shadi 5 cm 5 g jighead"] },
      hint: "Syksyn hämärä: särki kerääntyy hämärän aikaan." },

    { id: "turbid",
      match: c => c.turbidity === "turbid",
      primary: { type: "Pieni jigi tärinällä", size: "5–6 cm", weight: "5 g",
                 color: "chartreuse / oranssi",
                 products: ["Savage Gear Cannibal 6.5 fluo"] },
      hint: "Aallon sameus: pieni jigi tärinällä." },

    { id: "default",
      match: () => true,
      primary: { type: "Float-onki madolla", size: "—",
                 weight: "0.5–2 g kelluja, koukku 12–14",
                 color: "—",
                 products: ["Mato / mais"] },
      hint: "Yleistakla: kelluvalla onkella mato tai mais." }
  ],

  lahna: [
    { id: "bloom-skip", match: c => c.turbidity === "bloom",
      ...NO_FISH("Sinileväkukinta — älä kalasta.") },

    { id: "cold-water-skip",
      match: c => c.waterTempC < 12,
      ...NO_FISH("Liian kylmä lahnalle (<12 °C) — odota lämpiämistä.") },

    { id: "spawning",
      match: c => c.waterTempC >= 14 && c.waterTempC <= 18
              && c.dayOfYear >= 140 && c.dayOfYear <= 175,
      primary: { type: "Pohjaonki kastemadolla", size: "—",
                 weight: "30–60 g paino, koukku 6–10",
                 color: "—",
                 products: ["Iso kastemato pohjapainolla, kasvustojen reunaan"] },
      hint: "Lahnankuhinta käynnissä — pohjaonki kasvustojen reunaan." },

    { id: "post-spawn-peak",
      match: c => c.waterTempC >= 16 && c.waterTempC <= 22
              && c.hourOfDay >= 19,
      primary: { type: "Pohjaonki", size: "—",
                 weight: "40–60 g pohjapaino, koukku 6–10",
                 color: "—",
                 products: ["Iso kastemato (kevät–alkukesä)", "Mais (loppukesä)",
                           "Leipätaikina"] },
      secondary: { type: "Float-onki kasvustoa", size: "—", weight: "1–3 g kelluja",
                   color: "—",
                   products: ["Mais / leipä kelluvalla"] },
      hint: "Iltahämärä: lahnan päätunti. Mäskäys edellisiltana." },

    { id: "post-spawn-day",
      match: c => c.waterTempC >= 16 && c.waterTempC <= 22 && c.cloudPct > 60,
      primary: { type: "Pohjaonki", size: "—",
                 weight: "40 g pohjapaino, koukku 6–10",
                 color: "—",
                 products: ["Kastemato / mais"] },
      hint: "Pilvinen kesäpäivä: lahna syö myös päivällä. Mäskäys auttaa." },

    { id: "summer-night",
      match: c => c.waterTempC >= 18 && (c.hourOfDay >= 21 || c.hourOfDay <= 2),
      primary: { type: "Pohjaonki", size: "—",
                 weight: "40–60 g pohjapaino, koukku 6–8",
                 color: "—",
                 products: ["Kastemato (iso)", "Mais", "Leipä", "Mäskäys etukäteen"] },
      hint: "Kesäyö 21–02: parhaat tunnit. Iso kastemato pohjalle." },

    { id: "autumn-calm",
      match: c => c.waterTempC >= 12 && c.waterTempC <= 16,
      primary: { type: "Pohjaonki", size: "—", weight: "30–50 g",
                 color: "—",
                 products: ["Mato / mais / taikina"] },
      hint: "Syyslahna: pohjaonki tyynille rannalle." },

    { id: "turbid",
      match: c => c.turbidity === "turbid" && c.waterTempC >= 12,
      primary: { type: "Pohjaonki kastemadolla", size: "—", weight: "40 g",
                 color: "—",
                 products: ["Iso kastemato"] },
      hint: "Aallon sameus on lahnalle hyvä — kastemato pohjalle." },

    { id: "default",
      match: () => true,
      primary: { type: "Pohjaonki", size: "—",
                 weight: "30–50 g paino, koukku 6–10",
                 color: "—",
                 products: ["Kastemato / mais / leipä"] },
      hint: "Yleistakla: pohjaonki kastemadolla." }
  ],

  siika: [
    { id: "bloom-skip", match: c => c.turbidity === "bloom",
      ...NO_FISH("Sinileväkukinta — siika ei syö.") },

    { id: "default",
      match: () => true,
      primary: { type: "Pohjaonki harvasukamadolla", size: "—",
                 weight: "1–2 g paino, koukku 10–14",
                 color: "—",
                 products: ["Elävä harvasukamato (lieru)", "Kastemato"] },
      hint: "Klassinen siikatakla: pohjaonki, 0.20 mm siima, lieru tai kastemato." }
  ]
};

/**
 * Pick the first matching rule for the species, given conditions. Returns
 * null for unknown species, or the rule object { id, primary, secondary?,
 * hint }.
 */
export function recommendBait(species, conditions) {
  const rules = BAIT_RULES[species];
  if (!rules) return null;
  for (const rule of rules) {
    if (rule.match(conditions)) {
      return {
        id: rule.id,
        primary: rule.primary,
        secondary: rule.secondary || null,
        hint: rule.hint
      };
    }
  }
  return null;
}

/**
 * Derive a `turbidity` flag from current conditions. Returns
 * "bloom" | "turbid" | "stained" | "clear". The `bloomFlag` is the
 * user-toggled algae override; the rest is derived from wind history,
 * recent precipitation, and 48-hour sustained-onshore-wind.
 */
export function deriveTurbidity({ bloomFlag, windHistorySum, precip24, precip48 }) {
  if (bloomFlag) return "bloom";
  // Strong sustained onshore wind (positive sum > 400) → stirs bottom →
  // turbid in the productive sense (vibration lures shine).
  if ((windHistorySum != null && windHistorySum > 400)
      || precip24 > 10 || precip48 > 20) return "turbid";
  if (precip48 > 5 || (windHistorySum != null && windHistorySum > 150)) return "stained";
  return "clear";
}
