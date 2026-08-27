// Minimal service worker - findes UDELUKKENDE for at kunne vise
// notifikationer korrekt på mobil (se index.html: notifyEnabled/showAppNotification).
//
// Android Chrome understøtter IKKE "new Notification(...)" direkte fra
// sidens eget script - det kaster en fejl ("Failed to construct
// 'Notification': Illegal constructor. Use ServiceWorkerRegistration.
// showNotification() instead."). Det er derfor nødvendigt at have en
// registreret service worker og bruge dens showNotification()-metode i
// stedet, selv for helt almindelige, lokale notifikationer (ikke "rigtig"
// push - denne service worker lytter IKKE efter push-events, og der er
// ingen server-del, der sender noget til den. Den henter/tjekker heller
// intet i baggrunden på egen hånd).
self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
