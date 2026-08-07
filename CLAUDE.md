# Den lille hjælper

Personligt AI-værktøj til arbejde ved Norddjurs Kommune. Bygget af en
nybegynder (ingen tidligere erfaring med "rigtige" apps) sammen med Claude
i claude.ai — dette repo er sat op, så arbejdet kan fortsætte i Claude Code.

## Projektstruktur

- **Det meste er én fil**: `index.html`. Ingen build-trin, ingen
  package.json, ingen dependencies at installere for selve appen.
  HTML/CSS/vanilla JS i ét dokument.
- `netlify/edge-functions/sync.js` — lille serverless funktion, der driver
  enheds-sync'en (se nedenfor). Bundles automatisk af Netlify ved deploy,
  kræver ikke npm install lokalt.
- `netlify.toml` — deploy-config til Netlify (ingen build, publish er roden).
- Ingen andre kildefiler. Redigér `index.html` direkte.

## Hvad appen indeholder

- **Rapport-fane**: Norddjurs Kommunes opgave- og tidsrapport, kørende i en
  `<iframe srcdoc="...">` inde i `index.html`. Selve rapport-HTML'en ligger
  som en escaped JS-streng midt i filen (søg efter `REPORT_HTML`).
- **Opgaveoverblik-fane**: viser opgaver logget over tid (`history`-nøgle),
  samt "Kommende opgaver" (`upcoming`-nøgle) — begge gemt i `localStorage`
  og synkroniseret på samme måde som rapporten.
- **Enheds-sync**: bruger Netlify Blobs (indbygget nøgle/værdi-lager på selve
  Netlify-sitet) via edge-funktionen `netlify/edge-functions/sync.js`, kaldt
  fra `index.html` på adressen `/api/sync/<kode>/<nøgle>`. En
  "forbindelseskode" er bare et "rum" i lageret — genereres lokalt i
  browseren (ingen server-kald, ingen e-mail/konto nødvendig). Rapport
  (`report`), historik (`history`), kommende opgaver (`upcoming`) og
  depot-optælling (`optaelling`) synkroniseres denne vej.
  - Virker kun når siden faktisk er deployet på Netlify (edge-funktionen
    kører ikke ved lokal `npx serve` eller ved at åbne filen direkte) —
    brug `netlify dev` hvis sync skal testes lokalt.
  - Tidligere brugte appen kvdb.io til dette; det er udskiftet, fordi
    kvdb.io's "opret kode"-endpoint stoppede med at virke pålideligt.
- **Optælling-fane** (tredje fane, erstattede den tidligere AI-chat-fane
  "Struktur & optimering"): til at tælle op i depotrummet — navn, antal og
  et valgfrit billede pr. ting. Billeder skaleres ned til maks. 640px/JPEG i
  browseren (canvas), før de gemmes i `localStorage` og synkroniseres, så de
  ikke fylder for meget. Der har tidligere også ligget en simplere
  "Depotrum – inventar"-liste (vare/antal/lav-lager-advarsel) inde i
  Opgaveoverblik-fanen — den er fjernet igen, da Optælling-fanen dækker
  behovet.
- **Del/installér**: Web Share API + download-fallback, samt en indlejret
  web app manifest (data-URI) til "Installér som app".

## Vigtige begrænsninger at huske

- Personen bag dette er **nybegynder** — forklar ændringer i almindeligt
  sprog, ikke jargon, når du opsummerer hvad du har lavet.
- Filen indeholder en indlejret `<script>`-blok med rapportens HTML som en
  JSON-encoded streng. Enhver forekomst af bogstaverne `</script` i den
  indlejrede streng SKAL escapes til `<\/script` — ellers knækker browserens
  HTML-parser midt i filen. Tjek dette efter enhver ændring, der rører ved
  den indlejrede rapport-HTML.
- Ingen build/test-kommandoer findes. "Test" = åbn `index.html` i en browser,
  eller kør `npx serve .` og tjek visuelt.
- Undgå at ændre selve rapport-formularens felter/beregninger uden at blive
  bedt om det specifikt — det er et rigtigt arbejdsredskab, der skal bruges
  til kommunens tidsregistrering.
