# Den lille hjælper

Personligt AI-værktøj til arbejde ved Norddjurs Kommune. Bygget af en
nybegynder (ingen tidligere erfaring med "rigtige" apps) sammen med Claude
i claude.ai — dette repo er sat op, så arbejdet kan fortsætte i Claude Code.

## Projektstruktur

- **Alt er én fil**: `index.html`. Ingen build-trin, ingen package.json,
  ingen dependencies at installere. HTML/CSS/vanilla JS i ét dokument.
- `netlify.toml` — deploy-config til Netlify (ingen build, publish er roden).
- Ingen andre kildefiler. Redigér `index.html` direkte.

## Hvad appen indeholder

- **Rapport-fane**: Norddjurs Kommunes opgave- og tidsrapport, kørende i en
  `<iframe srcdoc="...">` inde i `index.html`. Selve rapport-HTML'en ligger
  som en escaped JS-streng midt i filen (søg efter `REPORT_HTML`).
- **Opgaveoverblik-fane**: viser opgaver logget over tid, gemt i
  `localStorage` og synkroniseret via kvdb.io.
- **Enheds-sync**: bruger kvdb.io (gratis, ingen konto) som simpel
  nøgle/værdi-lager. En "forbindelseskode" er navnet på en kvdb.io-bucket.
  Både rapportens data (`report`-nøgle) og opgavehistorik (`history`-nøgle)
  synkroniseres denne vej.
- **AI-hjælpere**: tre chat-faner (MS Office, Programmering, Struktur &
  optimering), der kalder Anthropic API'et direkte fra browseren
  (`https://api.anthropic.com/v1/messages`, model `claude-sonnet-4-6`).
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
