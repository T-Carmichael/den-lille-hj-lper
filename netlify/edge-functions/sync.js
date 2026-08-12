// Enheds-synkronisering for "Den lille hjælper".
// Gemmer/henter data (rapport, historik, kommende opgaver) i Netlify Blobs,
// som er indbygget lagring på selve Netlify-sitet - ingen tredjepart,
// ingen e-mail eller konto nødvendig.
//
// URL-mønster: /api/sync/<forbindelseskode>/<nøgle>
//   GET -> henter den gemte værdi (404 hvis intet er gemt endnu), og sender
//          et versionsmærke med (header X-Dlh-Version).
//   PUT -> gemmer request-body'en under koden/nøglen, men KUN hvis intet er
//          ændret siden klienten sidst hentede (se X-Dlh-If-Version nedenfor).
//
// Betinget skrivning (kapløbs-beskyttelse):
// Med flere enheder aktive samtidig kan to enheder nå at hente, lægge
// sammen lokalt og forsøge at gemme næsten samtidig. Uden beskyttelse
// ville den sidste, der gemmer, overskrive den førstes gemte data
// fuldstændigt, selvom begges lokale sammenlægning var korrekt - det er
// det, der fik enheder til at vise forskellige, indbyrdes uenige tal.
//
// Klienten sender derfor en "X-Dlh-If-Version: <version>" header med hvert
// PUT, baseret på den version den fik ved sidste GET (eller "__new__" hvis
// den tror, at intet er gemt endnu). Netlify Blobs' onlyIfMatch/onlyIfNew
// sikrer, at skrivningen kun gennemføres, hvis det stadig passer - ellers
// svares der 409 (Konflikt), og klienten henter den nyeste udgave, lægger
// sammen igen, og prøver på ny.
//
// Bevidst IKKE de "rigtige" HTTP-header-navne ETag/If-Match: de har strenge
// formaterings-/anførselstegn-regler (RFC 7232) og kan risikere at blive
// omskrevet eller fjernet af mellemliggende lag (CDN/cache), der selv
// forsøger at "forstå" dem. Med egne header-navne (X-Dlh-...) er der
// ingen indbygget fortolkning noget sted - kun rå strenge, der sendes og
// læses igen, uændret.
import { getStore } from "https://esm.sh/@netlify/blobs@10";

export default async (request, context) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "sync", "<kode>", "<nøgle>"]
  const code = parts[2];
  const key = parts[3];

  if (!code || !key) {
    return new Response("Ugyldig forespørgsel: kode og nøgle mangler", { status: 400 });
  }

  const store = getStore("dlh-sync");
  const blobKey = code + "/" + key;

  if (request.method === "PUT") {
    const body = await request.text();
    const ifVersion = request.headers.get("X-Dlh-If-Version");

    let result;
    if (!ifVersion || ifVersion === "__new__") {
      // Klienten mener, intet er gemt endnu - skriv kun hvis det stemmer.
      result = await store.set(blobKey, body, { onlyIfNew: true });
    } else {
      // Klienten så denne version sidst - skriv kun hvis den stadig er aktuel.
      result = await store.set(blobKey, body, { onlyIfMatch: ifVersion });
    }

    if (!result.modified) {
      return new Response("Konflikt: data er ændret siden sidst hentet", { status: 409 });
    }
    const headers = { "Content-Type": "text/plain" };
    if (result.etag) headers["X-Dlh-Version"] = result.etag;
    return new Response("ok", { status: 200, headers });
  }

  if (request.method === "GET") {
    const result = await store.getWithMetadata(blobKey);
    if (result === null) {
      return new Response("Ikke fundet", { status: 404 });
    }
    const headers = { "Content-Type": "application/json" };
    if (result.etag) headers["X-Dlh-Version"] = result.etag;
    return new Response(result.data, { status: 200, headers });
  }

  return new Response("Metode ikke understøttet", { status: 405 });
};

export const config = { path: "/api/sync/*" };
