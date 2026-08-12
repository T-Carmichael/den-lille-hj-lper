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

- **Rapport-fane**: Norddjurs Kommunes opgaverapport, kørende i en
  `<iframe srcdoc="...">` inde i `index.html`. Selve rapport-HTML'en ligger
  som en escaped JS-streng midt i filen (søg efter `REPORT_HTML`).
  - **Ingen "Gem"-knap** — opgaver logges automatisk til Opgaveoverblik, når
    man forlader et felt (titel/beskrivelse/bemærkning/ansvarlig), klikker
    en status-knap, eller et foto rent faktisk er færdigbehandlet/fjernet
    (`autoLogToday` i det ydre script, kaldt fra `focusout`/`click`-lyttere
    sat op i `reportFrame`'s `"load"`-event). Kalder bare den samme
    (allerede fejlsikrede) `window.__dlhLogToday()`, som "Gem"-knappen
    tidligere gjorde — inklusiv at rydde "Udført"-punkter fra formularen
    bagefter.
    - **Foto-knappen selv trigger IKKE auto-log ved klik** (det er bare
      filvælgeren, der åbnes der — billedet er ikke klar endnu). I stedet
      sender `REPORT_HTML`s `applyPhoto()`-funktion en `dlh-photo-saved`
      custom event fra knappen, når `btn.dataset.photo` reelt er sat
      (billedet er skaleret og klar), og det samme sker ved "✕ Skift/fjern
      foto". Det ydre script lytter efter denne event og kalder
      `autoLogToday()` derfra. `applyPhoto(btn, dataUrl, skipNotify)` har
      et `skipNotify`-flag, som `deserializeState()` bruger, når den
      genskaber gemte/synkroniserede billeder — ellers ville det at hente
      data fra serveren i sig selv udløse en ny (unødvendig) gemning.
      Rettet fordi status-klik/felt-forladt allerede dækkede tekst, men
      billeder blev reelt ikke fanget af auto-gem, da klik-baseret
      trigger skete for tidligt (før billedbehandlingen var færdig).
  - **Status-klik sender kun ÉN rapport-gemning, ikke to konkurrerende**:
    `.toggle`-klik trigger `autoLogToday()`, som selv sender den
    (ryddede) rapport videre til sidst — det almindelige forsinkede
    `schedulePush()` (der ellers kører på alle `input`-ændringer) er
    bevidst IKKE også koblet på `.toggle`-klik. Var det, kunne den
    forsinkede, urensede udgave nogle gange "vinde" kapløbet og få en
    lige-fuldført opgave til at dukke op igen ved næste genindlæsning
    (oplevet i praksis: "opgaven forsvinder, men er der igen når jeg
    skifter side og går tilbage").
  - **Grunddata er Lokation (dropdown) + Dato**, ikke længere en
    "Medarbejder"-tekstboks — appen bruges af flere personer, så et
    medarbejdernavn gav ikke mening. Feltets interne id hedder stadig
    `m-montor` (og JSON-nøglen `montor`) for ikke at skulle røre alle
    steder, der læser/skriver den — kun label og markup (`<select>` med
    valgmuligheder, pt. kun "Allingåbro") er ændret. Flere lokationer
    tilføjes i `<select id="m-montor">` i `REPORT_HTML`, når det bliver
    bedt om.
  - **Tidsregistrering og Flex-overblik er fjernet helt** (felter,
    beregningsfunktioner `recalcTime`/`recalcFlex`, og "Ugentligt
    timeoverblik" i Opgaveoverblik) — gav ikke mening som personlig
    tidsregistrering, nu hvor flere bruger appen sammen.
  - **"Generér rapport" i Opgaveoverblik-fanen**: vælg lokation + dato for
    en allerede gemt dag, og få den samme rapport-visning
    (print/PDF/Excel) som "Vis rapport" i selve Rapport-fanen — men bygget
    ud fra den gemte historik (`window.__dlhGetHistory()`), ikke ud fra
    hvad der tilfældigt står i den åbne formular. Virker ved at sende
    dataen ind i iframen via det allerede eksisterende
    `__setReportState`/`deserializeState`, og derefter kalde
    `window.__showReport()` (eksporteret fra `REPORT_HTML` - der var
    tidligere kun en anonym click-handler på "Vis rapport"-knappen).
    Spørger med `confirm()` først, da det overskriver det, der evt. er
    åbent i formularen.
- **Opgaveoverblik-fane**: viser opgaver logget over tid (`history`-nøgle),
  samt "Kommende opgaver" (`upcoming`-nøgle) — begge gemt i `localStorage`
  og synkroniseret på samme måde som rapporten.
  - **Status-ændring, sletning og "Ryd dubletter" kræver adgangskode
    `8961`** (`requireOvPassword()` i Opgaveoverblik-IIFE'en) - kun en let
    spærre mod uheld, ikke rigtig sikkerhed (koden ligger i klartekst i
    appens kode). Låses op én gang pr. session (variabel `ovUnlocked`,
    nulstilles ved genindlæsning). At *se*/generere en rapport er
    ikke beskyttet (kun læsning).
  - **Historik-punkter har et stabilt id** (`REPORT_HTML`:
    `genItemId`/`ensureItemId`, sat på hvert `.item-card` og inkluderet i
    `serializeState`/`deserializeState`). Ældre punkter uden id migreres
    automatisk (`window.__dlhMigrateHistoryItemIds`, kaldt af
    `__dlhRenderOverview` FØR noget sammenlægges).
  - **Sammenlægning af historik sker punkt for punkt, ikke hel dag ad
    gangen** (`mergeHistory`/`mergeHistoryItems`) - et punkt, der kun
    findes hos den ene part, bevares altid. Punkter uden rigtigt id (fra
    en enhed, der endnu ikke har migreret) får en GARANTERET unik nøgle
    under selve sammenlægningen (aldrig en tekst-baseret nøgle, der kan
    kollidere) - værste konsekvens er en duplikeret række, aldrig et tabt
    punkt. `migrateHistoryList()` køres på BÅDE lokale og lige-hentede
    server-data før sammenlægning - ellers bliver server-punkter uden id
    ved med at blive opfattet som "nye" for hver synkronisering, og
    dubletter vokser i det uendelige (skete i praksis, rettet).
  - **"🧹 Ryd dubletter"-knap**: finder punkter med identisk
    titel/beskrivelse/ansvarlig på samme dato (typisk rester fra før
    id-migreringen), beholder den bedste status, fjerner resten som
    tombstones.
  - **Punkter der stadig "Afventer" på tværs af flere datoer vises kun
    med den nyeste** (`buildCombinedDays` i Opgaveoverblik-IIFE'en,
    matchet på punkt-id). Rapport-formularen rydder bevidst kun
    "Udført"-punkter efter hver automatisk logning (se
    `__clearCompletedItems` i `REPORT_HTML`) - et punkt der stadig
    afventer bliver stående og logges derfor på ny, hver gang det
    auto-gemmes (fx en dag efter). Dette er rent et
    visnings-/tællings-lag (ligesom "Ryd dubletter", bare på tværs af
    datoer i stedet for inden for én dato) - rører ikke selve den
    gemte historik, kræver derfor ikke adgangskoden.
  - **"📄 Generér rapport"**: se under Rapport-fanen ovenfor.
  - Sletning bruger "tombstones" (`{id, deleted:true}`) ligesom resten af
    appen - se afsnittet om enheds-sync nedenfor.
- **Enheds-sync**: bruger Netlify Blobs (indbygget nøgle/værdi-lager på selve
  Netlify-sitet) via edge-funktionen `netlify/edge-functions/sync.js`, kaldt
  fra `index.html` på adressen `/api/sync/<kode>/<nøgle>`. En
  "forbindelseskode" (bruges som stikord for "en delt kode", ikke et fysisk
  rum) er bare en nøgle i lageret — genereres lokalt i browseren (ingen
  server-kald, ingen e-mail/konto nødvendig). Rapport (`report`), historik
  (`history`), kommende opgaver (`upcoming`), depotrum (`rum`) og
  depot-optælling (`optaelling`) synkroniseres denne vej.
  - Virker kun når siden faktisk er deployet på Netlify (edge-funktionen
    kører ikke ved lokal `npx serve` eller ved at åbne filen direkte) —
    brug `netlify dev` hvis sync skal testes lokalt.
  - Tidligere brugte appen kvdb.io til dette; det er udskiftet, fordi
    kvdb.io's "opret kode"-endpoint stoppede med at virke pålideligt.
  - **Sletning bruger "tombstones"** (`deleted:true` + nyt `updatedAt`) i
    stedet for at fjerne posten helt — både for rum, optalte ting og
    "kommende opgaver". Hvis man i stedet bare filtrerer posten væk fra
    listen, kan den "genopstå": en anden enhed, der endnu ikke har hørt om
    sletningen, lægger sin (ældre) lokale kopi sammen med serverens igen.
  - **Skrive-funktioner henter altid friskeste data først** (rum og
    optælling, funktionerne `freshRooms`/`freshCount`): før en tilføjelse/
    justering/sletning gemmes, hentes den nyeste stand fra den delte kode og
    lægges sammen med det lokale — så to enheder, der f.eks. begge trykker
    "+1" på samme ting uden at have opdateret imellem, ikke overskriver
    hinandens ændring (ellers baserer den sidste "+1" sig på et forældet
    antal, og den anden enheds klik forsvinder stille).
  - **Gem-kald er ETag-beskyttede mod kapløb mellem flere samtidige
    enheder** (`fetchWithEtag`/`putWithEtag`/`safeMergePush` i sync-IIFE'en,
    samt selve edge-funktionen `netlify/edge-functions/sync.js`, som nu kun
    skriver med Netlify Blobs' `onlyIfMatch`/`onlyIfNew` og svarer 409 ved
    konflikt). Før dette skrev edge-funktionen blindt, uanset hvad der lå
    der i forvejen — den korrekte sammenlægning skete kun i browseren, FØR
    afsendelse, hvilket ikke hjælper hvis to enheder gemmer med få
    sekunders mellemrum: den sidste vandt og overskrev fuldstændigt den
    førstes (allerede korrekt sammenlagte) data. Ramte i praksis, da
    appen gik fra én til flere samtidige brugere. `pushHistory`,
    `pushUpcoming`, `pushRooms` og `pushCount` bruger nu alle
    `safeMergePush`, som ved konflikt henter den nyeste udgave igen,
    lægger sammen (med den relevante merge-funktion) og prøver igen (op
    til 6 forsøg, ellers opgives stille til næste automatiske synk).
    `report`-nøglen (selve den åbne rapport-formular) er bevidst IKKE
    lavet om — det er reelt et andet problem (sammenlægning af
    formular-felter under samtidig redigering), ikke rettet endnu.
  - **Versionsmærket sendes som egne header-navne, ikke "rigtige" HTTP
    ETag/If-Match** (`X-Dlh-Version`/`X-Dlh-If-Version`). Første udgave
    brugte ETag/If-Match, men det gjorde at gem-kald konsekvent troede,
    intet var gemt endnu (tom/ulæselig version ved hentning), og derfor
    altid endte i konflikt og gav op efter 6 forsøg — data blev kun
    gemt lokalt, aldrig sendt videre. Årsagen er ikke 100 % bekræftet
    (mistanke: ETag/If-Match har strenge formaterings-/anførselstegns-
    regler, som et mellemliggende lag kan have rettet i eller fjernet),
    men da egne header-navne (ingen indbygget fortolkning noget sted)
    løste det, er det den nuværende, robuste løsning.
  - **Hele synk-kæden er fejlsikret**: `safeMergePush` og alle fire
    `pushXxx`/`freshXxx`/`__dlhRefreshXxx`-funktioner (historik, kommende
    opgaver, rum, optælling) samt den automatiske baggrunds-polling er
    pakket ind i try/catch. Går sammenlægning eller selve netværkskaldet
    galt (fx uventet formet data fra serveren), opgives synkroniseringen
    for den omgang stille - de allerede lokalt gemte data røres ikke, og
    der vises ALDRIG en fejl for brugeren af den grund. `__dlhLogToday`
    har derudover et sikkert faldback, hvis selve den lokale
    sammenlægning fejler (tilføjer dagens punkter uden at overskrive
    anden historik, i stedet for slet ikke at gemme). Knap-handlerne i
    Opgaveoverblik (status, slet, ryd dubletter) bruger try/finally, så
    en knap aldrig kan blive hængende i "disabled" tilstand uden
    forklaring. Dette er bevidst prioriteret højt, fordi appen nu bruges
    af flere personer samtidig til rigtigt arbejde.
- **Optælling-fane** (tredje fane, erstattede den tidligere AI-chat-fane
  "Struktur & optimering"): opdelt i **rum** (fx et fysisk depotrum) — man
  opretter selv rum via "+ Nyt rum" (`window.__dlhAddRoom` m.fl.), skifter
  mellem dem med piller øverst, og hvert rum har sin egen liste af ting
  (navn, antal, valgfrit billede). Der er også et **søgefelt**, der søger på
  tværs af alle rum (`window.__dlhSearchCount`) og viser hvilket rum en
  match ligger i, med en "gå til rum"-knap. Billeder skaleres ned til maks.
  640px/JPEG i browseren (canvas), før de gemmes i `localStorage` og
  synkroniseres, så de ikke fylder for meget.
  - Ting fra før "rum" fandtes (ingen `roomId`) flyttes automatisk ind i et
    nyoprettet "Depotrum 1" første gang fanen åbnes efter opdateringen
    (`window.__dlhMigrateOrphanCountItems`), så intet forsvinder.
  - Der har tidligere også ligget en simplere "Depotrum – inventar"-liste
    (vare/antal/lav-lager-advarsel) inde i Opgaveoverblik-fanen — den er
    fjernet igen, da Optælling-fanen dækker behovet.
- **Del/installér**: Web Share API + download-fallback, samt en indlejret
  web app manifest (data-URI) til "Installér som app".
- **Backup (💾) / Gendan (📥)-knapper** øverst i appen (ved siden af
  del-ikonet): 💾 læser KUN fra `localStorage` og synkroniserer intet - må
  gerne bruges selv hvis en enhed mistænkes for at have data, andre
  enheder mangler (fx efter en synkroniseringsfejl), uden risiko. 📥
  lægger en tidligere eksporteret backup-fil sammen med det, der allerede
  er der, via `window.__dlhImportBackup` (samme sammenlægningsfunktioner
  som resten af appen - `mergeHistory`, `mergeUpcoming`, `mergeById`).
  Blev brugt til at redde ~57 opgaver efter et rigtigt hændelsesforløb med
  datatab (se git-historikken for `index.html` omkring
  historik-sammenlægning for detaljer).

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
  bedt om det specifikt — det er et rigtigt arbejdsredskab.
- **Redigering af `REPORT_HTML` (den indlejrede rapport-HTML)**: filen er én
  lang escaped streng på én linje. Undgå at redigere den escapede tekst i
  `index.html` direkte via tekstsøgning på tværs af to ens-udseende
  kodeblokke (fx to steder, der begge har `pointCount++; var card =
  buildPointCard(pointCount); pointsWrap.appendChild(card);`) - en
  find/erstat, der rammer "den forkerte" af to næsten-identiske blokke, er
  sket før (gav en `ReferenceError` i "+ Tilføj opgave"-knappen, som blev
  opdaget og rettet). Sikreste fremgangsmåde: pak `REPORT_HTML` ud til en
  selvstændig, læsbar fil (`eval()` i Node afkoder alle `\uXXXX`/`\n`
  korrekt - se git-historik for eksempel), redigér den med almindelige
  værktøjer, og pak den ind igen med `JSON.stringify()` + `.replace(/<\//,
  '<\\/')` for at beskytte `</script`-forekomster. Syntaks-tjek altid BÅDE
  det ydre script og det udpakkede `REPORT_HTML`'s eget script bagefter
  (`new Function(...)` på begge).
