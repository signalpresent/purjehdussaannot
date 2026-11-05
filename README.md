# Purjehdussäännöt (prototyyppi)

Vaihe 1: Määritelmät-moduuli (haku, kolmikielinen termilista). Toimii offline-tilassa asennettuna (PWA).

## Kehitys
    npm install
    npm run dev        # kehityspalvelin
    npm run build      # tuotantoversio hakemistoon dist/

## Sisältö
`scripts/build_defs.py` päivittää `src/defs.json`:iin sääntö- ja tapauskytkennät tiedostosta content-map.json. Selitykset (`explain.fi/sv/en`) ovat omin sanoin, ne muokataan suoraan `defs.json`:iin ja skripti säilyttää ne (kenttä `source` kertoo lähteen).

## Säännöt ja harjoittelu
`src/rules.json` sisältää säännöt (nyt: 10–17) selityksineen, skenaarioineen ja kysymyksineen; kaaviot ovat JSON-kuvauksia (`scene`), jotka `src/diagrams.ts` piirtää (veneet, jälkiviiva, merkki, `zone`: vyöhyke, `obst`: este, `k`: veneiden mittakaava, esim. 0,5 merkkikaavioissa). Tekstit ovat `{fi, sv, en}`; puuttuva `sv` näytetään englanniksi.

## Tarkistukset
    node scripts/check-content.ts     # rules.json:n eheys (yksi oikea vastaus, fi+en, Case-viittaukset)
    node scripts/practice.test.ts     # kysymysten valinta
    node scripts/diagrams.test.ts     # peittologiikka

## Julkaisu (GitHub Pages)
Työnnä `main`-haaraan; `.github/workflows/deploy.yml` rakentaa ja julkaisee. Repon asetuksissa: Settings → Pages → Source: GitHub Actions.
