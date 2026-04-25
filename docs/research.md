# Siian ja rantakalan syöntiin vaikuttavat tekijät — tieteellinen katsaus ja ennustejärjestelmän perusta

*Saaronniemi, Ruissalo, Turku · koordinaatit 60.4164° N, 22.0939° E · huhtikuu 2026*

---

## 1. Johdanto ja lähestymistapa

Tässä raportissa käydään läpi mitä tutkimus ja kokemusperäinen tietous kertovat siian (*Coregonus lavaretus*) ja muiden rantakalojen syöntiin vaikuttavista tekijöistä, ja miten näitä tekijöitä voi yhdistää säähavaintodataan toimivaksi ennustemalliksi Saaronniemen kaltaisella Saaristomeren kalastuspaikalla. Koska solunar-teoria ei Itämerellä päde (vuorovesivaikutus on enintään 10–20 cm Saaristomerellä, kun muualla maailmassa metrejä), on rakennettava ennuste puhtaasti meteorologisten ja hydrografisten muuttujien pohjalle.

Raportin lopussa kuvattu pisteytysmalli on toteutettu erillisenä interaktiivisena ennustetyökaluna (HTML-artifact), joka hakee Ruissalon säätiedot Open-Meteo-rajapinnasta ja antaa 7 vuorokauden kalastusennusteen.

---

## 2. Siian biologia ja ruokintakäyttäytyminen

### 2.1 Yleistä

Eurooppalainen siika on **opportunistinen yleissyöjä**, mutta valikoi aktiivisesti saalista tarjolla olevien selkärangattomien joukosta. Keskeisiä ominaisuuksia kalastuksen ennustamisen kannalta ovat:

- **Näköaistiin perustuva saalistaja.** Siika on *sight-feeder*, eli se havaitsee ravintonsa pääosin näköaistillaan. Tämä tekee veden kirkkaudesta, valon määrästä ja päivänvalon ajoituksesta ratkaisevia tekijöitä.
- **Vuorokausirytmi on vuorokausipäivään painottunut tai hämäräaktiivinen** (diurnaalinen tai krepuskulaarinen). Sy önti keskittyy päivänvaloaikaan ja erityisesti kirkkaisiin hetkiin. Kevään siikaonginnassa on tunnistettu kaksi selkeää syöntipiikkiä: **aamupäivällä n. 10–12** ja **alkuillasta n. 18–19** (myöhemmin keväällä iltapainotus vahvistuu).
- **Pohjalla ja rannan tuntumassa ruokaileva kevätkaudella.** Keväällä siika saalistaa mataloista, 1–4 metrin syvyisistä rantavesistä pohjasta nousevia selkärangattomia.
- **Ravintokohde huhtikuun Saaronniemellä: harvasukamadot (sukasmadot, polykeetit).** Kun jäät ovat lähteneet ja aurinko lämmittää pohjasedimenttiä, harvasukamadot alkavat möyriä pohjasta. Näiden nouseminen määrittää siian syöntikäyttäytymisen. Myös muut pohjaselkärangattomat kuten amfipodit (*Gammarus* spp., *Idotea balthica*) ovat tärkeitä.

### 2.2 Lämpötilatoleranssi

Tutkimusten mukaan siika kasvaa optimaalisesti 15–20 °C lämpötilassa, mutta sy öminen ja kasvu jatkuvat tehokkaasti myös hyvin kylmässä (10 °C tai alle) — laboratoriossa on osoitettu siian syövän ja kasvavan normaalisti jopa pitkiä aikoja 10 °C vedessä. Saaristomeren rantaveden kevätlämpötila (huhtikuussa tyypillisesti 3–8 °C) ei siis estä syöntiä sinänsä. **Syöntiaktiivisuus kuitenkin kasvaa, kun vesi alkaa lämmetä** — se käynnistää saaliseläinten (harvasukamadot, amfipodit) aktiivisuuden, joka taas käynnistää siian syönnin.

### 2.3 Vuosirytmi

Siian onkikausi Saaristomerellä kestää tyypillisesti **jäänlähdöstä noin kahden viikon jälkeen toukokuun puoleenväliin** asti. "Kausi on ohi kun olet saanut kaksi särkeä" — kun vesi lämpenee riittävästi särjen ja ahvenen tulla matalikoille, siika vetäytyy syvempään.

---

## 3. Ilmanpaine ja sen muutokset

### 3.1 Myytti ja tutkimusnäyttö

Kalastusperinteessä ilmanpaineelle annetaan usein liioiteltua merkitystä. Tutkimus osoittaa tilanteen olevan hienovaraisempi:

- **Absoluuttinen paine ei juurikaan suoraan vaikuta.** Sen sijaan **paineen muutosnopeus** on biologisesti merkityksellinen. Koko sääjärjestelmän aiheuttama paine-ero (tyypillisesti 20–40 hPa) on paljon pienempi kuin se painevaihtelu, jonka kala itse tuottaa liikkumalla syvyydessä (metrin pystyliike muuttaa painetta ~100 hPa / 10 cmH₂O vastaavasti).
- **Alkuperäinen 1983 Stickney & Liu -tutkimus** (largemouth bass) löysi heikon korrelaation laskevan paineen ja syöntiaktiivisuuden välille. Tämä ei kuitenkaan yleisty kaikkiin lajeihin eikä vesistöihin.
- **Modernissa kalabiologiassa vallitsee "epäsuorien vaikutusten malli"**: ilmanpaine on *proxy* eli välikäsi säämuutoksille — pilvisyydelle, tuulelle, lämpötilalle, sateelle. Nämä ovat ne todelliset biologisesti aktiiviset tekijät.

### 3.2 Käytännön sääntö siianongintaan

Suomalainen kokemus kiteyttää asian hyödyllisesti:

> "Ilmanpaineen muutos on aina hyväksi kalastukselle, suunnasta riippumatta. Kauan vakaana pysynyt korkea- tai matalapaine ei nosta kalan aktiivisuutta."

- **Paras tilanne:** paine laskee tai nousee 3–8 hPa 24 tunnin aikana → sääjärjestelmä on muuttumassa → kala aktivoituu.
- **Huono tilanne:** paine ollut vakaa ±1 hPa useita päiviä → kala "asettunut" eikä syö.
- **Erikoistilanne:** todella nopea, voimakas paineen lasku (>10 hPa 12 h) ennen rajuilmaa voi ohimenevästi lopettaa syönnin.

Ennusteen kannalta painetrendi on siis tärkeämpi kuin absoluuttinen paine.

---

## 4. Tuuli

### 4.1 Fysikaalinen vaikutus rannalla

Tuuli on monivaikutteinen tekijä. Sen vaikutus riippuu **suunnasta, voimakkuudesta ja siitä, miten se kohdistuu omaan kalastuspaikkaan.**

- **Pintatuuli rantaan päin (*onshore*)** sekoittaa vettä ja pohjaa, irrottaa selkärangattomia (madot, amfipodit, kotilot) ja luo ravintoarrin matalille rantavesille. Tämä on teoreettisesti suotuisaa pohjaa syöville kaloille.
- **Maalta merelle päin (*offshore*)** puhaltava tuuli ei sekoita rantavettä; mitään ylimääräistä ravintoa ei irtoa, ja pelokkaammat kalat hakeutuvat syvempään.

### 4.2 Siian erityistapaus

Siialla on kuitenkin *kaksi* hidastavaa ehtoa:

1. **Sameus.** Siika on näköaistisaalistaja. Jos tuuli on niin kova että vesi sameutuu, siian kyky havaita ravintoa heikkenee. Tutkimuksissa turbiditetti heikentää sight-feeding-kalojen saaliinsaantia merkittävästi jo kohtuullisilla sameustasoilla.
2. **Syötin liike.** Keväällä kylmässä vedessä siian on havaittu karttavan liikkuvaa syöttiä. Pohjaongella painon "tanssi" tuulen aallokossa voi olla karkottava — ei houkutteleva. Vasta **vedenlämmön noustessa (~toukokuun alku)** siika alkaa ottaa liikkuvaa syöttiä.

### 4.3 Kokemusperäiset suuntasäännöt

Kalastusfoorumien yleissääntöjä:

| Tuuli | Vaikutus |
|---|---|
| Lämmin lounais/länsituuli (SW/W) | Klassinen "hyvän kalapäivän" tuuli |
| Kova itäinen (E/NE) | Kylmä, voimakas ja rannalta pois → huono |
| Pohjoinen (N) | Kylmä, usein laskeva lämpötila → huono |
| Etelä (S) | Lämpimin, usein hyvä mutta voi tuoda sumua |

Saaronniemen paikallinen geometria kannattaa miettiä: niemen kärki avautuu noin **länsi–luoteeseen**, joten länsi–luoteistuuli tuulee suoraan rannasta veteen päin (offshore), kun taas **idästä ja etelästä tuleva tuuli puhaltaa rantaan (onshore)**. Paradoksaalisesti siis "perinteisesti hyvä" lounaistuuli voi Saaronniemellä olla offshore-tuuli — paikallinen suuntavaikutus on tärkeä.

### 4.4 Tuulen voimakkuus

- **Tyyntä tai heikkoa (0–4 m/s):** sight-feedingille ihanteellista, vesi kirkasta.
- **Kohtalaista (4–8 m/s):** usein paras kompromissi — hieman pintavärettä mutta ei sameutta.
- **Reipasta (8–12 m/s):** rajatilanne, sameus alkaa haitata.
- **Kovaa (>12 m/s):** usein liian kova, sameus liian korkea, syötin liike karkottaa.

---

## 5. Sade, veden sameus ja makean veden vaikutus

### 5.1 Sade ja sameus

- **Lyhytaikainen pieni sade (<3 mm/vrk):** ei merkittävää vaikutusta.
- **Pitkäkestoinen tai voimakas sade** → valuma jokiin ja ojiin → sameutta ja orgaanista ainesta rannikolle → **heikentää sight-feederin (siian) saaliinsaantia** mutta voi houkutella hajuaistilla saalistavia kaloja (esim. lahna).
- **Rankkasade ennen tai kalastuksen aikana** usein sulkee sy öntiä muutamaksi tunniksi / vuorokaudeksi.

### 5.2 Makean veden vaikutus

Saaristomeren suolaisuus on erittäin alhainen (5–7 ‰, käytännössä murtovesi). Poikkeava makea valuma ei siis yhtä dramaattisesti muuta suolaisuutta kuin oikeilla merillä. Sen sijaan **lämpötilamuutokset** ovat tärkeitä: kevätvaluma on usein kylmempää kuin pintavesi → voi paikallisesti jäähdyttää rantavettä.

### 5.3 Sateen jälkeinen aika

Yleissääntö on että **pari tuntia sateen päättymisestä on usein hyvä** — suuri osa kaloista on sateen aikana passiivisia, ja kun myrsky menee ohi, alkaa kompensoiva syöntijakso.

---

## 6. Lämpötila

### 6.1 Veden lämpötila

Vedenlämpö on kevätsiian kannalta **ensisijainen ajuri**. Huhtikuussa tyypillinen kehityskäyrä Saaristomeren rannoilla:

| Vedenlämpö | Tilanne |
|---|---|
| < 2 °C | Jää juuri lähtenyt, siika vasta saapumassa rannoille |
| 2–4 °C | Käynnistymisvaihe — sy öntiä mutta epävarmaa |
| **4–8 °C** | **Huippukausi — siika syö parvina pohjasta** |
| 8–12 °C | Siika vetäytyy, särki ja ahven tulevat rannoille |
| > 12 °C | Siikaonkikausi käytännössä ohi |

### 6.2 Ilman lämpötila

Ilman lämpötila vaikuttaa epäsuorasti:

- **Lämpiävä ilma** → lämpenevä rantavesi → aktiivisemmat pohjaeläimet → enemmän ravintoa.
- **Kylmä yö (< 0 °C huhtikuussa)** → pintavesi jäähtyy → seuraavan päivän syöntivaihe siirtyy myöhemmäksi (odotettava auringon lämmittämää iltapäivää).
- **Lämpötilan muutos 24 h sisällä** on tärkeä: **lämpenemistrendi on positiivinen**, jyrkkä jäähtyminen negatiivinen.

---

## 7. Valaistus, pilvisyys ja vuorokaudenaika

Tämä on siialle ratkaisevan tärkeä kategoria, koska laji on näköaistiin perustuva saalistaja.

### 7.1 Auringon säteily

- **Aurinkoiset kirkkaat päivät ovat klassisesti parhaita.** Aurinko lämmittää pohjasedimenttiä, mikä saa harvasukamadot möyrimään ja nousemaan → siika parviutuu syömään niitä.
- **Pilvipäivä (täyspilvinen)** → vähemmän pohjan lämmitystä, matoja nousee vähemmän, sy önti on vaisumpaa.
- **Ohut pilvipeite** voi olla jopa parempi kuin täyskirkkaus heinä-elokuussa (liian kirkas valo ajaa kalaa syvemmälle), mutta huhtikuussa säteily on vielä sen verran heikkoa että täyskirkkaus on enimmäkseen positiivista.

### 7.2 Vuorokaudenaika

Kevään siianongintaan on tunnistettu kaksi huippua:

- **10:00–12:00** — aamupäivän syöntipiikki, kun aurinko alkaa lämmittää pohjaa.
- **17:00–19:00** — iltapäivän/alkuillan piikki, erityisesti myöhemmin keväällä.

Auringon alkuaamu ja myöhäisilta eivät ole parhaita siialle (toisin kuin monilla muilla kaloilla), koska valoa tarvitaan ravinnon havaitsemiseen.

### 7.3 Kuun vaihe

Itämerellä vuorovesi on niin pieni (enintään ~20 cm Saaristomerellä), että solunar-teoria ei toimi samaan tapaan kuin valtamerillä. Kuun vaiheen vaikutus rajoittuu yövalon määrään, joka voi vaikuttaa kaloihin jotka syövät yöllä — siika ei kuulu niihin. **Kuun vaihe voidaan käytännössä jättää pois siian ennustemallista.**

---

## 8. Itämeren ja Saaristomeren erityispiirteet

### 8.1 Vedenkorkeus

- **Vuorovesi on käytännössä olematon** Saaristomerellä — enintään muutaman senttimetrin.
- **Tuuli ja ilmanpaine ovat vedenkorkeuden pääajureita.** Saaristomerellä tuulen vaikutus on kuitenkin pienempi kuin Suomenlahdella tai Perämerellä — tyypillisesti enintään ±20 cm.
- **Kokemussääntö:** korkea vesi on suotuisa kalastukselle, matala huono. Matala + kylmä + sameutunut vesi on siian näkökulmasta pahin yhdistelmä.

### 8.2 Kerrostuneisuus

Kevään Saaristomerellä vesipatsas on yleensä **sekoittunut** (ei termokliiniä), mikä on hyvä rannan kannalta — happea riittää ja ravintoa on tarjolla pinnasta pohjaan. Termokliini muodostuu vasta myöhemmin keväällä/alkukesällä.

### 8.3 Jäätön aika ja "jäidenlähtöefekti"

- **Jäidenlähtö Saaristomerellä** tapahtuu tyypillisesti maalis–huhtikuun vaihteessa.
- **Kaksi viikkoa jäidenlähdöstä** on siianongintaan yleensä liian aikaista — rannat vasta alkavat aktivoitua.
- **3–6 viikkoa jäidenlähdöstä** on tyypillisesti parasta aikaa.

### 8.4 Saaronniemen paikalliset olosuhteet

- Niemen **kärki on Kolkannokka** (Saaronniemen laituri), joka avautuu länteen–luoteeseen.
- **Pohja on sorainen–hiekkainen**, mikä on ihanteellinen harvasukamatojen esiintymiselle ja siten siialle.
- Paikassa on **heikko virtaus** ("hiukan virtaavat sorapohjaiset kohdat ovat parhaita siikapaikkoja"). Virtaus tuo happea ja liikuttaa ravintoa.
- Saaronniemeltä nostetaan tyypillisesti noin **kilon painoisia siikoja**.

---

## 9. Miksi tämä viikonloppu oli tyhjä — hypoteesit

Kuvailit tilannetta: "tuulta on ollut enemmän, pientä sadetta — odotin auttavan, mutta ei kalaa. Ei edes ahventa tai särkeä, vaikka aiempina viikkoina siikaa on tullut paljon." Tämä kuulostaa klassiselta kolmen tekijän yhdistelmältä:

**Hypoteesi 1 — Sameus.** Tuuli + sade yhdessä ovat voineet sameuttaa rantavettä sen verran, että siika (sight-feeder) ei ole enää löytänyt saalistaan rannalta. Siika on mahdollisesti vain väistänyt hieman syvempään veteen. Tämä on **todennäköisin pääsyy**, koska se selittää myös miksi särki ja ahven (jotka ovat vähemmän riippuvaisia näöstä) loistavat poissaolollaan — todennäköisesti vesi on kylmentynyt yhtäaikaisesti.

**Hypoteesi 2 — Kylmenemistrendi.** Tuuli ja sade ovat sää typillisesti liittyneet matalapaineeseen, joka huhtikuussa tuo usein kylmää ilmaa ja kylmää sadetta. Jos vedenlämpö on pudonnut esim. 6 °C → 4 °C muutamassa päivässä, **siianparvet ovat voineet siirtyä syvempään lämpimämpään veteen**. Tämä hypoteesi vahvistuisi, jos aamulämpötilat olivat selvästi nollan alapuolella.

**Hypoteesi 3 — Tuulen suunta.** Jos tuuli puhalsi pohjois- tai koillissuunnasta, se on Saaronniemen maantieteessä kylmä rannastapoistyöntävä (offshore-alueelle) tuuli. Se ei sekoita rantapohjaa positiivisesti, mutta kylmentää rantavettä ja siirtää ravintoa pois rannasta.

**Hypoteesi 4 — Ilmanpaineen kontrasti.** Aiempina viikkoina oli ehkä aktiivinen vaihteleva sää (hyvä painetrendi). Jos tämä viikonloppu osui **painestabiiliin vaiheeseen** (pitkä matala- tai korkeapaine ilman muutosta), se selittäisi vaisun syönnin vaikka tuuli olisi ollut hyväkin.

**Hypoteesi 5 — Vuodenaikaa väärä vaihe.** Huhtikuun 24. on Saaristomerellä tyypillisesti **siikakauden loppupuolella**. On mahdollista, että isoimmat siikaparvet ovat jo käyneet rannoilla ja vetäytyneet — erityisesti jos kevät oli aikainen ja vesi on jo ehtinyt lämmetä yli 8 °C.

**Käytännön suositus:** tarkista vedenlämpötila (esim. aaltopoiju.fi tai lähimmän mittauspisteen arvo) ja paineen muutoshistoria 5 vuorokauden ajalta. Jos vesi on > 10 °C, kauden huippu on ohi. Jos vesi on 5–8 °C ja paine on juuri alkanut liikkua, seuraavat muutamat aurinkoiset päivät ovat todennäköisesti paljon parempia.

---

## 10. Pisteytysmalli — rakenteellinen esitys

Ennusteen pisteytys perustuu seuraaviin painotuksiin. Kokonaispistemäärä 0–100.

| Tekijä | Paino | Hyvän arvo | Huonon arvo |
|---|---|---|---|
| Ilmanpaineen muutos 24 h | 15 | 3–8 hPa muutos kumpaan tahansa | ±1 hPa (stabiili) tai > 12 hPa (liian voimakas) |
| Ilmanpaineen muutos 48 h | 10 | 5–15 hPa muutos | <2 hPa |
| Tuulen voimakkuus | 15 | 2–7 m/s | tyyntä tai > 12 m/s |
| Tuulen suunta | 10 | S, SW, W (Saaronniemellä riippuu — lounas usein parhaiten) | N, NE (kylmä) |
| Sademäärä 24 h | 10 | 0–2 mm | > 10 mm |
| Sade edeltävien 48 h | 10 | 0–5 mm | > 20 mm (sameus jäänyt) |
| Pilvisyys | 10 | 20–60 % (harsopilvistä aurinkoista) | 90–100 % täyspilvinen tai 0 % keskellä kesää |
| Ilman lämpötila | 10 | 6–15 °C | < 0 °C tai > 20 °C |
| Lämpötilatrendi 48 h | 10 | nouseva | laskeva |
| Kellonaika (jos annettu) | — (bonus) | 10–12 tai 17–19 | 02–05 |

Malli on implementoitu artifact-sivulla.

---

## 11. Tietolähteet ja rajapinnat

Artifact-ennustetyökalu käyttää **Open-Meteo Weather Forecast API:a** (https://api.open-meteo.com/v1/forecast). Se on maksuton, ei vaadi API-avainta ei-kaupalliseen käyttöön ja tukee CORS:ia selaimesta. Mallina käytetään **ECMWF IFS** + alueellisia (DMI/DWD). Tarkkuus Saaristomerellä on ~2–10 km:n tasolla.

Vaihtoehtoisia lähteitä:

- **Ilmatieteen laitoksen Open Data (FMI)** — tarjoaa havaintoja (ei pelkkää ennustetta) mm. Utön, Rajakarin ja Turun satamamittausasemilta. Vaatii WFS-rajapintakyselyjä.
- **aaltopoiju.fi** — Saaristomeren reaaliaikainen vedenkorkeus ja aallokko.
- **Vesi.fi** — merten lämpötilahistoriat.

Kalastuspäiväkirjan pito (päivämäärä, sää, saalis) parantaisi mallia merkittävästi ajan myötä: samoja pisteytyspainoja voisi kalibroida omaan kokemukseen.

---

## 12. Yhteenveto

1. **Siika on näköaistiin perustuva päivä- tai hämäräaktiivinen saalistaja**, joka syö kevätonkimisessa pohjalta harvasukamatoja ja amfipodeja.
2. **Ilmanpaine itsessään ei ratkaise — painetrendi ratkaisee.** Muutosnopeus 3–8 hPa/24h on optimaalinen.
3. **Tuuli on kaksiteräinen miekka:** kohtalainen tuuli parantaa (ravintoa liikkuu), liian kova sameuttaa veden ja estää siian näkemisen.
4. **Sade + sameus on siian vihollinen.** Pienet sateet OK, rankat sateet ja sameat vedet sulkevat sy önnin.
5. **Aurinkoiset hetket ovat parhaita**, erityisesti aamu 10–12 ja ilta 17–19.
6. **Vedenlämpö 4–8 °C on kevätsiian huippualue.**
7. **Saaronniemen kauden ikkuna on kapea**: ~3–6 viikkoa jäidenlähdöstä, päättyy toukokuun puoleenväliin. Huhtikuun viimeinen viikko on usein vielä hyvää, mutta kauden loppuvaihe.
8. **Tämän viikonlopun tyhjä tulos** selittyy todennäköisesti tuulen + sateen aiheuttamalla sameudella, mahdollisella rantaveden jäähtymisellä, ja paineen stabiiloitumisella.

Interaktiivinen ennustetyökalu toimittaa nämä painotukset Ruissalon säätietoihin ja antaa seuraavan 7 vuorokauden päiväkohtaisen pisteytyksen.

---

*Lähteet:*

- *Siian onginta keväällä — Kalastus.fi, Kalastajankanava, Vettis*
- *Siikaa onkimassa Turun Ruissalossa — Retkipaikka*
- *Influence of the length of the daily feeding period on feed intake and growth of whitefish, Coregonus lavaretus — ScienceDirect*
- *Ontogenetic changes in habitat use by whitefish, Coregonus lavaretus — Springer*
- *Food selection of Coregonus lavaretus in a brackish water ecosystem — PubMed*
- *The effect of barometric pressure on feeding activity of yellow perch — VanderWeyst, Bemidji State University*
- *Does Barometric Pressure Affect Fishing? What the Research Actually Says — NEWS WIRE*
- *Effects of turbidity, temperature and predation cue on feeding — PMC*
- *Vedenkorkeusvaihtelut — Ilmatieteen laitos*
- *Open-Meteo Weather Forecast API documentation*
