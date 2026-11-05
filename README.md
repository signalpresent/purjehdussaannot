# Purjehdussäännöt (prototyyppi)

Vaihe 1: Määritelmät-moduuli (haku, kolmikielinen termilista). Toimii offline-tilassa asennettuna (PWA).

## Kehitys
    npm install
    npm run dev        # kehityspalvelin
    npm run build      # tuotantoversio hakemistoon dist/

## Sisältö
Virallista sääntötekstiä ei ole repossa eikä julkaistussa sovelluksessa (tekijänoikeus: World Sailing, SPV, SSF). `python3 scripts/build_text.py` tekee omista PDF-tiedostoista (repon yläkansiossa, vaatii pdftotext) tiedoston `../saannot-teksti.json` repon ulkopuolelle. Tiedosto tuodaan laitteelle sovelluksen alaosan painikkeella.

Sääntötekstin tekeminen itse:
1. Hanki PDF:t ja nimeä ne näin (samaan kansioon): `2025-2028-RRS-with-Changes-and-Corrections.pdf` (World Sailing, www.sailing.org/racingrules; muutokset 20.4.2026 asti), `Purjehduksen-kilpailusaannot-2025-2028-A4_pien.pdf` ja `KAPPSEGLINGSREGLERNA-2025-2028-p.pdf` (SPV:n käännökset 2024, www.spv.fi).
2. Asenna Python 3 ja pdftotext (Poppler; macOS: `brew install poppler`).
3. Kloonaa tai lataa tämä repo ja aja `python3 scripts/build_text.py <PDF-kansio> [tulos.json]`.
4. Tuo tiedosto sovelluksessa. Muilla painoksilla skripti pysähtyy, jos kohtien rakenne eroaa kielten välillä, mutta pelkkiä sanamuutoksia se ei huomaa, ja painostieto (`edition`) on kiinteä.
5. Tiedosto on vain omaan käyttöön; älä jaa sitä, koska siinä on tekijänoikeuden alaista tekstiä. Laajuus: määritelmät ja osa 2 ryhmään D asti. Skripti pysähtyy, jos kohtien rakenne eroaa kielten välillä tai jos jollekin sääntösivulle ei löydy tekstiä.

`scripts/build_defs.py` päivittää `src/defs.json`:iin sääntö- ja tapauskytkennät tiedostosta content-map.json. Selitykset (`explain.fi/sv/en`) ovat omin sanoin, ne muokataan suoraan `defs.json`:iin ja skripti säilyttää ne (kenttä `source` kertoo lähteen).

## Säännöt ja harjoittelu
`src/rules.json` sisältää säännöt (nyt: 10–17) selityksineen, skenaarioineen ja kysymyksineen; kaaviot ovat JSON-kuvauksia (`scene`), jotka `src/diagrams.ts` piirtää (veneet, jälkiviiva, merkki, `zone`: vyöhyke, `obst`: este, `k`: veneiden mittakaava, esim. 0,5 merkkikaavioissa). Tekstit ovat `{fi, sv, en}`; puuttuva `sv` näytetään englanniksi.

## Tarkistukset
    node scripts/check-content.ts     # rules.json:n eheys (yksi oikea vastaus, fi+en, Case-viittaukset)
    node scripts/practice.test.ts     # kysymysten valinta
    node scripts/diagrams.test.ts     # peittologiikka

## Julkaisu (GitHub Pages)
Työnnä `main`-haaraan; `.github/workflows/deploy.yml` rakentaa ja julkaisee. Repon asetuksissa: Settings → Pages → Source: GitHub Actions.
