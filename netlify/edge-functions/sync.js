// Enheds-synkronisering for "Den lille hjælper".
// Gemmer/henter data (rapport, historik, kommende opgaver) i Netlify Blobs,
// som er indbygget lagring på selve Netlify-sitet - ingen tredjepart,
// ingen e-mail eller konto nødvendig.
//
// URL-mønster: /api/sync/<forbindelseskode>/<nøgle>
//   PUT  -> gemmer request-body'en under koden/nøglen
//   GET  -> henter den gemte værdi (404 hvis intet er gemt endnu)

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
    await store.set(blobKey, body);
    return new Response("ok", { status: 200 });
  }

  if (request.method === "GET") {
    const value = await store.get(blobKey);
    if (value === null) {
      return new Response("Ikke fundet", { status: 404 });
    }
    return new Response(value, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Metode ikke understøttet", { status: 405 });
};

export const config = { path: "/api/sync/*" };
