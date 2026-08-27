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
- `_headers` — beder Netlify/browseren om ALDRIG at cache `index.html`/
  `admin-restore.html` (`Cache-Control: no-cache, no-store, must-revalidate`).
  Tilføjet fordi flere rapporterede rettelser (statusændringer, der
  "ikke gjorde noget" i hverken Rapport- eller Opgaveoverblik-fanen)
  ikke kunne genskabes i test, uanset hvor mange gange koden blev
  rettet - mistanke om, at enheden viste en cachet, forældet udgave af
  appen, der aldrig hentede den nyeste `index.html` ned, selv efter
  "genindlæsning". Løser IKKE et scenarie, hvor en allerede åben
  browser-fane bare ligger stille i baggrunden (den kører stadig den
  gamle, indlæste JS i hukommelsen, uanset cache-headers) - kræver en
  reel ny sidehentning (luk fanen helt og åbn den igen, eller et
  "hårdt" genindlæs).
- `tilfoej-opgave.html` — separat, selvstændig side til at tilføje en
  opgave via QR-kode (se afsnittet om QR-opgaver nedenfor). Ikke en del af
  selve app-fanerne, linkes kun til via QR-koden/linket.
- Udover disse er der ingen andre kildefiler. Redigér `index.html` direkte.

## Hvad appen indeholder

- **Rapport-fane**: Norddjurs Kommunes opgaverapport, kørende i en
  `<iframe srcdoc="...">` inde i `index.html`. Selve rapport-HTML'en ligger
  som en escaped JS-streng midt i filen (søg efter `REPORT_HTML`).
  - **Ingen "Gem"-knap** — opgaver logges automatisk til Opgaveoverblik, når
    man forlader et felt (titel/beskrivelse/bemærkning/ansvarlig), klikker
    en status-knap, eller et foto rent faktisk er færdigbehandlet/fjernet
    (`autoLogToday` i det ydre script, kaldt fra begivenheds-lyttere sat op
    i `reportFrame`'s `"load"`-event, hver i sin egen try/catch). Kalder
    bare den samme (allerede fejlsikrede) `window.__dlhLogToday()`, som
    "Gem"-knappen tidligere gjorde — inklusiv at rydde "Udført"-punkter fra
    formularen bagefter.
    - **Statusskift (Udført/Afventer) opdages via en `dlh-status-changed`-
      besked, ikke ved at opfange selve klikket via bobling fra iframen**
      (samme mønster som `dlh-photo-saved`, se nedenfor). `REPORT_HTML`s
      `wireToggle()`/`setStatus()` sender selv beskeden, lige efter status
      reelt er sat. Rettet fordi klik-baseret bobling fra iframen til det
      ydre dokument i praksis viste sig ikke altid pålideligt at nå at
      trigge den automatiske gemning - symptom: status skiftede synligt i
      selve rapport-formularen (knappen blev grøn/rød), men opgaven blev
      hverken ryddet fra formularen eller logget til Opgaveoverblik.
    - **Sikkerhedsnet**: en baggrunds-tjek hvert 4. sekund (uafhængig af
      forbindelseskode - selve loggen er 100% lokal) kigger direkte i den
      åbne rapport-formulars DOM efter et `.item-card[data-status="OK"]`,
      der stadig ligger der, og trigger `autoLogToday()` hvis det gør. Ren
      ekstra robusthed, hvis en begivenheds-lytter mod forventning alligevel
      ikke skulle nå at trigge - fanger og retter det op i under 4 sekunder,
      uanset årsag.
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
  - **Opslag på "dagen med denne dato" leder på tværs af ALLE dage med den
    dato, ikke kun den første** (`findHistoryItemByDate`, brugt af både
    `__dlhDeleteHistoryItem` og `__dlhSetHistoryItemStatus`). Rettet fordi
    to selvstændige dag-objekter med SAMME dato-streng kan forekomme i en
    brugers historik (rester fra ældre data/hændelser, fra før al
    sammenlægning konsekvent lagde dage med samme dato sammen til én -
    `mergeHistory` forhindrer NYE dubletter i at opstå under selve
    sammenlægningen, men rydder ikke allerede-eksisterende op). Uden denne
    rettelse brugte `.filter(d => d.date === dato)[0]` kun den FØRSTE af de
    to dage - hvis punktet, man ville slette/ændre, i virkeligheden lå i
    den ANDEN, fandt opslaget det aldrig, og knappen så ud til slet ikke at
    gøre noget (intet synligt sker, ingen fejl) - meldt af brugeren som
    "kan ikke slette en opgave efter jeg har ændret status til udført".
    Kunne ikke genskabes med normale, "rene" testscenarier - kun ved
    bevidst at seede to dag-objekter med samme dato, hvilket bekræftede
    hypotesen (samme symptom, punktet forblev fuldstændig urørt).
    **Denne rettelse løste IKKE hele problemet** - se de to punkter
    nedenfor for den reelle, bekræftede årsag til den konkrete sag, brugeren
    meldte (en QR-indsendt opgave, markeret udført via "✓ Udført" i selve
    Kommende opgaver-listen, som ikke kunne slettes bagefter).
  - **`__dlhDeleteUpcomingEntry` (kommende opgavers "✕"-knap) brugte en
    RIGTIG (hård) sletning i stedet for en tombstone** - eneste sted i hele
    appen, der gjorde det (alt andet: historik, depotrum, optælling, faste
    opgaver, bruger konsekvent tombstones af netop denne grund). En hård
    sletning fjerner punktet helt fra den lokale liste, FØR den sendes til
    serveren - men selve afsendelsen (`pushUpcoming`/`safeMergePush`) henter
    SELV den nyeste server-udgave og lægger sammen med den lokale FØRST. Når
    det lokale punkt er væk (intet at sammenligne imod), vinder serverens
    ældre, endnu-ikke-slettede udgave af `mergeUpcoming` ubetinget, og bliver
    gemt tilbage lokalt igen - i praksis så det ud som om "✕" slet ikke
    gjorde noget, fordi punktet var tilbage i samme øjeblik skærmen blev
    tegnet igen (bekræftet ved at genskabe præcis dette forløb i test: en
    allerede-fuldført kommende opgave, kendt af både enheden og serveren,
    forblev synlig efter et kald til `__dlhDeleteUpcomingEntry`). Rettet til
    samme tombstone-mønster som resten af appen: punktet bliver liggende i
    listen, men `completedAt` ryddes (`null`) og `updatedAt` sættes til nu -
    så det hverken tælles som aktivt (`__dlhGetUpcoming` kræver `!deleted`)
    eller som fuldført (`__dlhGetCompletedUpcoming` kræver BÅDE `deleted`
    OG `completedAt`), men en sammenlægning altid foretrækker denne nyeste
    udgave frem for en ældre kopi et andet sted.
  - **`renderList()` (selve Opgaveoverblik-listen, som også viser fuldførte
    kommende opgaver/QR-indsendelser) blev ikke gen-tegnet efter kommende
    opgaver var hentet færdigt** - hverken i `__dlhRenderOverview` eller i
    den periodiske 20-sekunders baggrunds-opdatering. Begge kaldte kun
    `renderUpcoming()` (den SEPARATE, aktive "Kommende opgaver"-liste)
    efter `__dlhRefreshUpcoming()` var færdig, ikke `renderList()`. I
    praksis betød det, at et nyligt fuldført/QR-indsendt punkt, der lige
    var hentet fra serveren, kunne være usynligt i selve overblikket ved
    første fane-åbning - det dukkede først op ved en SENERE gen-tegning
    (fx et tilfældigt sammenfald med en historik-opdatering), hvilket gjorde
    opførslen inkonsekvent og svær at regne ud for brugeren. Rettet ved at
    kalde `renderList()` begge steder, lige efter `renderUpcoming()`.
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
  - **Hvert punkt har sit eget `updatedAt`, ikke kun dagen som helhed**:
    når to udgaver af SAMME punkt-id findes under sammenlægning, afgøres
    vinderen (hvis begge har `updatedAt`) af punktets EGET tidspunkt, ikke
    af hvilken side der havde det nyeste `day.savedAt`. `updatedAt` sættes
    dels i `REPORT_HTML` (`touchItemCard` i det ydre script, kaldt fra
    `.toggle`-klik/`focusout`/`dlh-photo-saved`-lytterne i `reportFrame`'s
    `"load"`-event, lige før `autoLogToday()`), dels i
    `__dlhSetHistoryItemStatus`/`__dlhDeleteHistoryItem`/
    `__dlhRemoveDuplicateHistoryItems` (statusændring/sletning/oprydning i
    Opgaveoverblik - tombstones fra sletning/"Ryd dubletter" sætter NU også
    `updatedAt`, se nedenfor). Har KUN den ene side et `updatedAt`, vinder
    DEN altid (en sporet, bevidst ændring skal ikke kunne overskrives af en
    urørt, gammel kopi). Kun hvis INGEN af de to har `updatedAt`, falder
    sammenlægningen tilbage til den gamle opførsel (den side, der kaldes
    "newer", vinder ubetinget) - det rammer kun punkter, der aldrig er rørt
    af nogen af disse funktioner.
    **Rettet igen (14/8) - opgaver, der "kom igen" efter gentagne
    fuldførelser/sletninger:** to selvstændige fejl spillede sammen.
    1) **Den egentlige hovedfejl**: `mergeHistoryItems` filtrerede
    ubetinget alle tombstones (`deleted: true`) fra i det SAMMENLAGTE
    resultat, den selv returnerede (`.filter(it => !it.deleted)` i
    slutningen). Det betød, at en sletnings-tombstone ALDRIG nåede at
    blive gemt varigt NOGET sted - end ikke lokalt på den enhed, der selv
    lige slettede punktet - fordi `pushHistory`/`__dlhDeleteHistoryItem`
    gemmer resultatet af netop denne sammenlægning tilbage igen. I
    praksis forsvandt beviset for at et punkt var slettet, næsten med det
    samme. Rettet ved at STOPPE med at filtrere tombstones væk i
    `mergeHistoryItems` - de gemmes nu varigt, ligesom for kommende
    opgaver/rum/optælling. Visnings-laget (Opgaveoverblik, `buildCombinedDays`
    m.fl.) filtrerede allerede selv slettede punkter fra ved rendering, så
    dette krævede ingen UI-ændring - kun 💾-backup-knappens optælling af
    "opgaver ialt" manglede et tilsvarende filter, tilføjet samme omgang.
    2) **En medvirkende, mere snigende fejl**: `touchItemCard` stempler et
    punkt-korts `updatedAt` ved `focusout` - men et felt, der bare sidder
    fokuseret UDEN reelt at blive redigeret (fx fordi man skifter
    fane/app midt i, uden at nå at forlade feltet selv), mister først
    fokus LÆNGE efter, når et HELT ANDET felt i formularen røres. Det
    tidspunkt afspejler kun hvornår feltet mistede fokus, ikke hvornår det
    reelt sidst havde meningsfuldt indhold - så et punkt kunne fremstå
    "kunstigt friskt" og dermed vinde over en reelt nyere sletning/
    fuldførelse fra en anden enhed, selv EFTER fejl 1 var rettet. Rettet
    ved en ny funktion, `reconcileOpenReportWithHistory` (sync-IIFE'en):
    fjerner proaktivt ethvert punkt fra den ÅBNE rapport-formular, som
    frisk hentet historik siger er udført/slettet - kaldt (a) SYNKRONT,
    FØR formularen overhovedet samles sammen i `__dlhLogToday` (så et
    punkt aldrig når at blive gemt igen, selv i det snævre vindue mellem
    en anden enheds sletning og denne enheds næste urelaterede gemning),
    og (b) ved forbindelse/"Hent nyeste" samt nu også i den periodiske
    20-sekunders baggrunds-poll (`startPolling`, som tidligere KUN
    genhentede `report`, ikke historik). Ingen tidspunkts-sammenligning i
    selve reconcile-funktionen - findes historikken en tombstone/"OK", vinder
    den ubetinget (der findes ingen "genåbn en udført/slettet opgave"-
    funktion i appen, så der er ingen legitim grund til det modsatte).
    Desuden får tombstones fra sletning/"Ryd dubletter" nu deres eget
    `updatedAt` (som status-ændringer allerede havde), og
    `mergeHistoryItems` foretrækker et punkt MED `updatedAt` over et UDEN
    - uanset behandlingsrækkefølge - i stedet for at lade den side, der
    tilfældigvis blev tilføjet sidst, vinde ubetinget. Dette er et
    ekstra sikkerhedslag oven på rettelse 1+2, ikke selve hovedrettelsen.
    Rettet fordi hele dagens `savedAt` tidligere blev brugt til at afgøre
    en vinder for ALLE punkter under ét: et statusskift i Opgaveoverblik
    kunne blive "fortrudt" af en efterfølgende, helt urelateret gemning
    fra selve rapport-formularen for samme dato (som stadig viste punktets
    gamle status) - eller omvendt. Oplevet i praksis: "når jeg færdiggøre
    opgaver inde i rapport fanen, så ændre de ikke status i overbliksfanen,
    og når jeg så ændre deres status i overbliksfanen så kommer de igen
    over i rapport fanen".
  - **"🧹 Ryd dubletter"-knap**: finder punkter med identisk
    titel/beskrivelse/ansvarlig på samme dato (typisk rester fra før
    id-migreringen), beholder den bedste status, fjerner resten som
    tombstones.
  - **"↩ Fortryd"-knap**: vises kun på punkter, der allerede er "Udført",
    ved siden af "✕"-slet-knappen. Sætter status tilbage til "Afventer" -
    til den situation hvor "Udført" blev trykket ved en fejl. Kræver
    samme adgangskode som resten af status-/sletningsfunktionerne
    (`requireOvPassword()`) og en ekstra `confirm()`, ligesom sletning.
    Genbruger den allerede eksisterende, generiske
    `window.__dlhSetHistoryItemStatus(date, itemId, status)` (samme
    funktion som "✓ Udført"-knappen bruger, bare med `"AFV"` i stedet for
    `"OK"`) - ingen ny gemme-/sync-logik nødvendig.
  - **"✓ Udført"-knappen i Opgaveoverblik vises for alt, der ikke allerede
    er "Udført"** — altså både "Afventer" OG "Ikke udfyldt" (`it.status
    !== "OK"` i `renderList`, ikke længere kun `it.status === "AFV"`).
    Før dette kunne "Ikke udfyldt"-opgaver (fx et punkt hvor kun
    beskrivelsen blev udfyldt, men aldrig en status) kun slettes fra
    Opgaveoverblik, ikke markeres udført — man skulle ind i Rapport-fanen
    og finde punktet der for at ændre status.
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
    - **Et punkt-id, der optræder som "Udført" NOGEN steder, viser aldrig
      også en Afventer/blank-udgave af sig selv fra en tidligere dato**
      (`hasOkVersion` i `buildCombinedDays`). Uden dette blev den GAMLE
      "Afventer"-dag-post ved med at blive vist som sin egen række,
      selvom punktet siden er blevet færdiggjort på en senere dato (siden
      "Afventer"-punkter bevidst bliver stående i formularen dag til dag,
      indtil de udføres) - så det samme punkt kunne se ud som om det
      optrådte TO gange i Opgaveoverblik, én gang "Afventer" (den ældre,
      nu forældede post) og én gang "Udført" (den nye) - og stødte man på
      den ældre post først, så det ud som om opgaven "faldt tilbage" til
      Afventer, selvom den reelt var korrekt markeret udført. Rent
      visnings-lag, som resten af denne mekanisme.
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
    `report`-nøglen (selve den åbne rapport-formular) bruger stadig IKKE
    denne fulde ETag/sammenlægnings-mekanisme — det er reelt et andet,
    sværere problem (sammenlægning af formular-felter under samtidig
    redigering af samme punkt), ikke rettet.
  - **`report`-nøglen har dog et lettere værn mod at hente en FORÆLDET
    udgave ned over en nyere lokal** (`knownServerReportSavedAt` i
    sync-IIFE'en, brugt i `pullState`): før en hentet rapport-udgave
    lægges ned over den, der vises lige nu, tjekkes det, at den hentede
    udgaves `savedAt` rent faktisk er nyere end den seneste udgave, vi
    selv VED serveren har (fra vores eget seneste gem eller hentning). Er
    den hentede ældre, kasseres den (og der forsøges i stedet sendt en
    frisk gemning op, så serveren selv indhenter det). Rettet fordi
    allerede udførte/fjernede opgaver kunne "komme igen" i selve
    Rapport-fanen, typisk lige efter man afbrød og genoprettede
    forbindelsen: uden dette værn var `pullState()` et blindt overskriv,
    uanset hvor forældet den hentede udgave var (fx fra en anden enhed,
    der ikke havde opdateret sig for nyligt, og hvis gemning nåede
    serveren efter denne enheds nyere, ryddede udgave). Løser IKKE det
    bredere, ovenstående problem med samtidig redigering af samme felt -
    kun det specifikke "en hel, forældet formular-udgave overskriver en
    nyere" scenarie.
  - **`pullState()` rydder nu også selv "Udført"-punkter væk fra den
    hentede rapport-udgave**, ligesom en almindelig gemning altid gør
    (`__clearCompletedItems`), og sender den ryddede udgave op igen bagefter.
    Uden dette blev en opgave, der er markeret "Udført" i den DATA, der lige
    hentes ned fra serveren, siddende fast i Rapport-fanen på ubestemt tid
    - `deserializeState()` (kaldt af `pullState`) genopbygger blot
    formularen præcis som den hentede data siger, uden selv at rydde op, og
    intet andet trigger'ede en oprydning bagefter (hverken at vente eller
    skifte fane hjalp - kun en ny redigering af selve punktet ville have
    gjort det). Ramt i praksis, formodentlig fra et kapløb mellem flere
    samtidige enheder (`report`-nøglen er stadig ikke fuldt sammenlagt, se
    ovenfor), hvor en ikke-helt-ryddet udgave nåede at blive gemt på
    serveren. Rører KUN selve `pullState()` (den løbende synkronisering) -
    IKKE `openGeneratedReport()`s brug af samme `__setReportState`/
    `deserializeState` til at vise en allerede gemt, historisk rapport (der
    skal jo netop vise de udførte punkter, ikke rydde dem væk).
  - **Denne oprydning (og selve `pushState()`) fik flere forsøg og en mere
    robust afsendelse, fordi den stadig kunne fejle stille under rigtig
    samtidig brug** (4-5 personer aktive på samme tid): `pushState()`s
    forsøg på at gemme, hvis en anden enhed nåede at gemme noget imellem
    (409-konflikt), gik fra 3 til 6 forsøg - samme antal som
    `safeMergePush` allerede bruger til historik/kommende opgaver/rum/
    optælling. Desuden sendes den ryddede udgave fra `pullState()`s
    oprydning nu direkte og ventet (`await pushState()`, EFTER
    `pullInFlight` er nulstillet igen) i stedet for via `schedulePush()`s
    1500ms-timer - før kunne et kald til `pushState()` midt i selve
    hentningen blive omdirigeret til netop denne timer (fordi
    `pullInFlight` stadig var sat), som igen kunne nå at blive overhalet/
    nulstillet af noget andet, FØR den overhovedet fik sendt noget. Var
    formodentlig medvirkende til, at en allerede udført opgave kunne blive
    ved med at sidde fast/komme igen i Rapport-fanen, selv efter gentagne
    "opdateret"-hentninger, ved rigtig samtidig brug fra flere enheder.
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
  - **`localStorage` kan blive fuldt (QuotaExceededError), typisk fordi
    mange opgaver over tid har før/efter-fotos vedhæftet** - hver skalering
    til 640px/JPEG er stadig et sted mellem 50-150 KB, og det lægger sig
    hurtigt oveni med mange opgaver over uger/måneder. **Dette var den
    reelle, bekræftede årsag** til en gentaget, svær-at-genskabe fejl:
    statusskift blev hverken ryddet fra Rapport-fanen eller vist i
    Opgaveoverblik, fordi selve `localStorage.setItem()`-kaldet i
    `saveHistoryLocal`/`saveCountLocal` kastede en fejl, som stoppede
    resten af gemme-kæden (rydning, synkronisering) - fundet via en
    midlertidig, synlig statuslinje-besked, der viste selve fejlteksten
    ("Failed to execute 'setItem'... exceeded the quota"), efter at have
    kigget grundigt på kode og testet uden held i lang tid. `saveHistoryLocal`
    forsøger nu, hvis den almindelige gemning fejler: (1) fjerne fotos fra
    dage ældre end 14 dage og prøve igen, (2) hvis stadig ikke nok plads,
    fjerne fotos fra ALLE dage og prøve igen. Selve opgave-/statusdataen
    (det vigtigste) bevares altid - kun ældre fotos ofres om nødvendigt.
    `saveCountLocal` (Optælling) har samme værn (fjerner billeder fra
    optalte ting ved pladsmangel). `saveHistoryLocal` returnerer nu den
    FAKTISK gemte udgave (kan være beskåret), som alle kaldere, der
    synkroniserer bagefter (`pushHistory`), bruger i stedet for den
    oprindelige - ellers ville et forsøg på at sende den for store,
    oprindelige udgave til serveren blot fejle af samme grund dér.
    Fejlfindingen brugte midlertidigt en synlig, meget "snakkende"
    statuslinje (hvert skridt i `__dlhLogToday`, samt selve `dlh-status-
    changed`-modtagelsen) til at afsløre fejlen uden direkte adgang til
    brugerens data - denne ekstra "snak" er fjernet igen nu hvor
    årsagen er fundet og rettet; kun de reelle fejlbeskeder (fx "kunne
    ikke gemme lokalt") er beholdt i statuslinjen, da de er nyttige
    permanent (stille fejl var netop det, der gjorde denne fejl så svær
    at opdage første gang).
    - **Dette løste kun symptomet ved pladsmangel (ofrer ældre fotos),
      ikke selve den underliggende plads-begrænsning** - `localStorage`
      har typisk kun ca. 5 MB i alt pr. side. Se næste punkt for den
      permanente løsning, som nu er gennemført for Rapport-fanens fotos.
  - **Rapport-fanens før/efter-fotos flyttet fra `localStorage` til
    `IndexedDB`** (den permanente løsning på pladsproblemet, ikke bare
    symptombehandling). `localStorage` har typisk kun ca. 5 MB i alt;
    `IndexedDB` har typisk 50+ MB, ofte betydeligt mere - rigeligt til
    måneders/års brug. **Arkitektur**: selve tekst-/status-dataen (titel,
    beskrivelse, status, ansvarlig osv.) ligger STADIG i `localStorage`
    som hidtil (fylder reelt intet, har aldrig været problemet) - kun
    selve billed-bytes (`fotoFor`/`fotoEfter`, base64) flyttes over i
    IndexedDB, og erstattes i `localStorage` af en lille tekst-reference
    (`"idbphoto:<id>"`). Dette er en langt mindre indgribende ændring end
    at gøre HELE historik-laget asynkront - kun de steder, der rent
    faktisk håndterer fotos, skal vide noget om IndexedDB; alt andet
    (sammenlægning, id-migrering, sletning, statusændring, Opgaveoverblik-
    visning) er fuldstændig uændret og kører stadig synkront som før.
    - **Nye fotos migreres med det samme**: `__dlhLogToday` kalder
      `migrateItemsPhotos()` på dagens punkter, FØR de gemmes i
      `localStorage` - et nyt foto, der lige er taget, ender aldrig som
      rå data i `localStorage`.
    - **Allerede-eksisterende (rå) fotos migreres automatisk ved app-
      start**: en baggrunds-oprydning (`sweepMigrateHistoryPhotos`, kaldt
      i slutningen af sync-IIFE'en) scanner HELE den lokalt gemte historik
      hver gang appen indlæses, flytter ethvert foto, der stadig ligger
      som rå data (fra FØR denne omlægning), over i IndexedDB, og gemmer
      den nu meget mindre historik tilbage. Trygt at køre igen og igen -
      allerede-migrerede punkter (kendt på `"idbphoto:"`-præfikset,
      `isPhotoRef()`) springes billigt over. Kører også ved almindelig
      synkronisering (`__dlhRefreshHistory`), da IndexedDB er PR. ENHED,
      ikke synkroniseret - data hentet fra en anden enhed/serveren kan
      stadig indeholde rå fotos, som DENNE enhed selv skal migrere for at
      få gavn af pladsbesparelsen.
    - **Fotos slås op igen (reference → rigtigt billede), når data skal
      VISES i selve rapport-formularen** - kun "Generér rapport"
      (`openGeneratedReport`) gjorde dette nødvendigt at ændre
      (`window.__dlhResolveItemsPhotos`, kaldt før `__setReportState`) -
      REPORT_HTML kender intet til IndexedDB og forventer altid rå fotos.
      Opgaveoverblikkets liste viser aldrig fotos direkte, så ingen
      ændring var nødvendig der.
    - **Backup (💾)/Gendan (📥) opdateret til at inkludere selve fotoene**
      - ellers ville en backup-fil se ud til at indeholde opgaver, men
      mangle de rigtige billeder ved en eventuel gendannelse, fordi de nu
      reelt ligger i IndexedDB, ikke i de `localStorage`-nøgler, backuppen
      ellers læser fra. Nyt `photos`-felt i backup-filen (`{id: dataUrl}`,
      hentet med `window.__dlhGetAllPhotos`); gendannelse lægger dem
      tilbage i IndexedDB med samme id'er, så eksisterende referencer i
      historikken passer uændret (`window.__dlhImportPhotos`/direkte i
      `__dlhImportBackup`).
    - **IndexedDB-forbindelsen lukker sig selv ved `onversionchange`** -
      forhindrer at en helt anden fane/kontekst, der forsøger at åbne
      databasen med en ny version, bare hænger og venter for evigt (fandt
      dette under test: `indexedDB.deleteDatabase()` blokerede
      uendeligt, fordi en allerede åben forbindelse ikke lukkede sig selv).
    - **Verificeret med realistisk skala i test**: 15 dage × 8 punkter × 2
      fotos (samme størrelsesorden som den rigtige krise, der udløste hele
      denne sag) gav under 30 KB i `localStorage` bagefter (var ca. 14 MB
      som rå data - ville have udløst QuotaExceededError næsten med det
      samme). Baglæns-kompatibilitet testet: gamle, allerede-gemte rå
      fotos vises stadig korrekt (både direkte, og efter automatisk
      migrering).
    - **Optælling-fanens depot-billeder (`image`-feltet) er IKKE migreret
      endnu** - samme mønster, men egen indsats (Optælling har sin egen
      visning, der viser billeder direkte i listen, kræver derfor mere
      end Opgaveoverblik gjorde). Planlagt som naturligt næste skridt,
      især efter flere brugere er begyndt at bruge fanen.
- **Rapport-fanens dato-felt sætter automatisk sig selv til dags dato**
  (`ensureTodayDate()` i det ydre script, kaldt fra `reportFrame`'s
  `"load"`-event - EFTER en eventuel `pullState()` er færdig, så den ikke
  bliver overskrevet af en synkroniseret, ældre dato bagefter). Rører kun
  selve dato-feltet, ikke resten af formularen - "Afventer"-punkter bliver
  stadig stående som hidtil, uanset dato. Tilføjet så man ikke selv skal
  huske at skifte dato manuelt, når en ny dag starter.
- **Optælling-fane** (tredje fane, erstattede den tidligere AI-chat-fane
  "Struktur & optimering"): opdelt i **rum** (fx et fysisk depotrum) — man
  opretter selv rum via "+ Nyt rum" (`window.__dlhAddRoom` m.fl.), skifter
  mellem dem med piller øverst, og hvert rum har sin egen liste af ting
  (navn, antal, valgfrit billede). Der er også et **søgefelt**, der søger på
  tværs af alle rum (`window.__dlhSearchCount`) og viser hvilket rum en
  match ligger i, med en "gå til rum"-knap. Billeder skaleres ned til maks.
  640px/JPEG i browseren (canvas), før de gemmes i `localStorage` og
  synkroniseres, så de ikke fylder for meget.
  - **"+ Tilføj"-knappen låses, mens et valgt billede stadig skaleres ned**
    (kan tage et øjeblik for et rigtigt kamerabillede, ofte flere MB, før
    det skaleres). Uden dette kunne et hurtigt tryk på "+ Tilføj" lige
    efter valg af billede nå at oprette tingen, FØR `pendingImage` var sat
    - og tingen blev gemt helt uden billede, stille og uden nogen fejl.
    Knappen viser "Behandler billede..." og genaktiveres, når billedet er
    klar (eller ved fejl).
  - Ting fra før "rum" fandtes (ingen `roomId`) flyttes automatisk ind i et
    nyoprettet "Depotrum 1" første gang fanen åbnes efter opdateringen
    (`window.__dlhMigrateOrphanCountItems`), så intet forsvinder.
  - Der har tidligere også ligget en simplere "Depotrum – inventar"-liste
    (vare/antal/lav-lager-advarsel) inde i Opgaveoverblik-fanen — den er
    fjernet igen, da Optælling-fanen dækker behovet.
- **Faste opgaver-fane** (fjerde fane): et simpelt, selvstændigt ugentligt
  overblik over faste, tilbagevendende opgaver og hvem af de 4-5
  medarbejdere der er ansvarlig lige nu — grupperet under de 7 ugedage
  (mandag-søndag, altid alle 7 vist, også tomme). **Bevidst IKKE koblet
  til Rapport eller Opgaveoverblik** — hverken data eller UI deler noget
  med dem, kun et separat overblik ("hvem gør hvad hvornår" på ugebasis,
  ikke en logget historik af udførte opgaver).
  - **Medarbejdernavn er et frit tekstfelt** (`ansvarlig`), ikke en
    dropdown — samme princip som "Ansvarlig" i selve rapporten. Titel og
    ansvarlig er begge direkte redigerbare tekstfelter i listen og gemmes
    automatisk ved `focusout` (samme "ingen Gem-knap"-princip som resten
    af appen), så en opgave nemt kan gives videre til en anden medarbejder.
  - **Data og sync følger nøjagtig samme mønster som depotrum/optælling**
    (`window.__dlhAddFasteOpgave`/`__dlhUpdateFasteOpgave`/
    `__dlhDeleteFasteOpgave`, `localStorage`-nøgle `dlh-faste-opgaver`,
    synk-nøgle `faste`): sletning er en tombstone (`deleted:true`), enhver
    ændring henter først den friskeste udgave fra den delte kode
    (`freshFaste`) og lægger sammen (`mergeById`, samme generiske
    funktion som rum/optælling bruger) FØR ændringen skrives, og selve
    gemningen går gennem `safeMergePush` (ETag-beskyttet, retter
    automatisk konflikter). Ingen ændringer nødvendige i
    `netlify/edge-functions/sync.js` — den er allerede fuldstændig
    generisk pr. `<kode>/<nøgle>`.
  - Opdaterer sig kun ved fane-skift (`window.__dlhRenderFaste`), ikke en
    løbende baggrunds-poll hvert 20. sekund — samme (simplere) mønster som
    Optælling-fanen, ikke Rapport/Opgaveoverblik.
  - Talt med i 💾 Backup-knappen og 📥 Gendan-knappen (`backup.faste`,
    samme sammenlægningsprincip som resten af backup-funktionen).
- **Tilføj opgave via QR-kode**: en "📱 QR-kode"-knap ved siden af "Kopiér
  kode" i den forbundne synk-linje viser en QR-kode, der peger på
  `tilfoej-opgave.html?kode=<den aktuelle forbindelseskode>`. Andre (fx en
  kollega uden appen installeret, eller en ekstern person) kan scanne den
  med mobilkameraet og sende en opgave direkte ind i "Kommende opgaver" —
  uden at åbne selve appen, installere noget eller logge ind. Formularen
  har kun Titel (påkrævet), Beskrivelse og "Dit navn" (begge valgfrie) —
  navnet lægges ind i opgavens note som "📱 Indsendt via QR-kode af X", så
  man kan se/spørge hvem der sendte den. Siden skriver direkte til samme
  `upcoming`-synk-nøgle som selve appen, med samme "hent nyeste, læg
  sammen, gem"-mønster (ETag-beskyttet, op til 6 forsøg) som resten af
  appen bruger for kommende opgaver — ingen ændringer nødvendige i
  `netlify/edge-functions/sync.js`. Ingen adgangskode kræves for at
  INDSENDE (det er hele pointen — udefrakommende har ikke appens kode 8961
  og skal heller ikke bruge den); at ÆNDRE/slette en allerede indsendt
  opgave foregår som altid inde i selve Opgaveoverblik-fanen, bag den
  almindelige adgangskode.
  - **QR-koden tegnes af en selvskrevet, indlejret QR-encoder** (samme
    IIFE-mønster som resten af appen, ingen ekstern billedtjeneste eller
    CDN-afhængighed — appen har ingen build-proces til at hente et npm-
    bibliotek ind, og et CDN-link ville stoppe med at virke offline/bag
    en firewall). Understøtter kun byte-mode og et fast mask-mønster
    (0) — tilstrækkeligt robust til korte links (op til version 10 /
    213 bytes ved fejlrettelsesniveau M, rigeligt til denne apps URL'er).
    **Grundigt verificeret** før den blev taget i brug: alle interne
    tabeller (Reed-Solomon-blokke, alignment-mønster-positioner,
    BCH-generatorpolynomier) er hentet direkte fra kildekoden til det
    velafprøvede python-bibliotek `qrcode`, og selve modul-for-modul
    outputtet er sammenlignet bit-for-bit mod dette biblioteks output for
    ~40 testtilfælde på tværs af version 1-10 (inklusiv flere blok-grænser
    og version 7's ekstra version-info-blok). Fandt og rettede undervejs to
    reelle fejl (en JS/Python for-løkke-forskel, der korrumperede kolonne-
    rækkefølgen ved data-placering, og en forkert rækkefølge mellem
    alignment- og timing-mønster-opsætning) — begge ville have givet
    QR-koder, der enten slet ikke kunne scannes, eller scannede forkert
    indhold, uden at det nødvendigvis var synligt ved et hurtigt kig.
    Efter rettelserne matchede output 100% for alle testtilfælde. Testet
    yderligere ende-til-ende: den faktiske QR-kode, som appens egen knap
    tegner, er screenshottet og afkodet med en rigtig, uafhængig
    QR-scanner (Python `pyzbar`), som bekræftede at den dekoder til
    nøjagtig det forventede link.
  - **"🔔 Notifikationer"-knap** i den forbundne synk-linje (ved siden af
    "📱 QR-kode"): beder om tilladelse til almindelige browser-
    notifikationer (`Notification`-API'et), og viser én, hver gang en NY
    opgave, indsendt via QR-koden, dukker op i "Kommende opgaver" - mens
    appen/fanen er åben (også minimeret/i baggrunden på telefonen).
    **Virker IKKE, hvis appen er helt lukket/ikke kører** - det ville
    kræve en "rigtig" push-notifikation (service worker + VAPID-nøgler +
    en serverdel, der selv kan sende signerede beskeder ud), som er en
    større, separat opgave - bevidst fravalgt indtil videre (brugeren
    valgte selv den simplere udgave, da begge blev præsenteret som
    mulighed).
    - **Kun QR-indsendte opgaver udløser en notifikation**, ikke opgaver
      man selv tilføjer i "Kommende opgaver" eller på en anden enhed -
      kendes på teksten "📱 Indsendt via QR-kode" i opgavens note (samme
      tekst, `tilfoej-opgave.html` altid sætter).
    - **Al hentning af "kommende opgaver" sker nu også i selve sync-
      IIFE'ens universelle 20-sekunders baggrunds-poll** (`startPolling`),
      ikke kun i Opgaveoverblik-fanens egen, separate poll (som kun kører,
      hvis man rent faktisk har åbnet den fane mindst én gang) - ellers
      ville en notifikation kun dukke op, hvis man tilfældigvis sad på
      netop Opgaveoverblik-fanen, i stedet for fx den langt mere
      sandsynlige Rapport-fane.
    - **Undgår en "bølge" af notifikationer for gamle opgaver**, når
      funktionen slås til første gang: alt, der allerede ligger i
      "Kommende opgaver" i det øjeblik man trykker knappen, markeres som
      "allerede set" (`dlh-notify-seen-ids` i `localStorage`) - kun
      opgaver, der dukker op DEREFTER, kan udløse en notifikation.
    - Tjekker `Notification.permission === "denied"` og viser en tydelig
      forklaring, hvis notifikationer er blokeret i selve browseren/
      telefonens indstillinger (kan ikke selv "genåbne" den slags - kun
      brugeren kan, uden for appen).
    - Testet grundigt: nye QR-opgaver udløser korrekt én notifikation
      hver, allerede-sete/ikke-QR-opgaver udløser ingen, og tilstanden
      (til/fra) består efter en genindlæsning.
  - **"▶ Sæt i gang"-knap** på hvert punkt i "Kommende opgaver" (Opgave-
    overblik-fanen) — virker på alle kommende opgaver, ikke kun dem fra
    QR-koden. Flytter punktet ind i den ÅBNE Rapport-formular som et nyt,
    rigtigt punkt (titel = opgavens titel, beskrivelse = opgavens note,
    status sat til "Afventer") — sætter samtidig rapportens dato til dags
    dato, logger det med det samme (`window.autoLogToday()`, samme
    funktion som resten af appens auto-gem bruger) og skifter til Rapport-
    fanen. Punktet fjernes fra "Kommende opgaver" (en rigtig sletning,
    `__dlhDeleteUpcomingEntry` — IKKE `__dlhCompleteUpcoming`, som ville
    have talt det som en færdig opgave i statistikker/dagslister, selvom
    det reelt bare lige er startet og stadig "Afventer").
    - **`REPORT_HTML` fik en ny eksporteret funktion, `window.__addReportItem`**,
      til dette — tilføjer ÉT punkt til den åbne formular uden at røre
      resten (i modsætning til `__setReportState`, som erstatter det hele
      og bruges af "Generér rapport"). Genbruger den samme kort-udfyldnings-
      logik som `deserializeState` allerede brugte (udtrukket til en fælles
      hjælpefunktion, `buildFilledPointCard`, så begge veje er 100% samme
      kode - ingen risiko for at de to stier driver fra hinanden over tid).
      Ændringen i selve `REPORT_HTML` fulgte den anbefalede fremgangsmåde
      (se "Vigtige begrænsninger" nedenfor): pakket ud til en selvstændig
      fil, redigeret, syntaks-tjekket, pakket ind igen med sanity- og
      roundtrip-tjek, FØR den blev sat ind i `index.html` igen.
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
