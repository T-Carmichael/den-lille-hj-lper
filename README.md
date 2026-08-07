# Den lille hjælper

En samlet app til Norddjurs Kommune-arbejde: opgaverapport (pr. lokation)
med enheds-synkronisering, opgaveoverblik over tid, og optælling i
depotrum (navn, antal og billede pr. ting).

Hele appen er én selvstændig HTML-fil (`index.html`) – ingen build-trin,
ingen dependencies. Det eneste, der kræves for at køre den, er en browser.

## Køre lokalt

Åbn `index.html` direkte i en browser, eller kør en simpel lokal server:

```bash
npx serve .
```

## Deploy til Netlify

**Via Git (anbefalet – automatisk opdatering ved hvert push):**

1. Push denne mappe til et GitHub-repo
2. Gå til [app.netlify.com](https://app.netlify.com) → "Add new site" → "Import an existing project"
3. Vælg dit GitHub-repo
4. Build settings er allerede sat i `netlify.toml` (ingen build, publish er rodmappen) – tryk bare "Deploy"

**Via drag-and-drop (hurtig test uden Git):**

Træk mappen ind på [app.netlify.com/drop](https://app.netlify.com/drop)

## Struktur

- `index.html` – hele appen (UI, rapport-værktøj, sync-logik)
- `netlify.toml` – Netlify deploy-konfiguration
