// Service Worker
self.addEventListener('fetch', (event) => {
  // Vous pouvez ajouter ici des logiques pour gérer les requêtes fetch
});

self.addEventListener('message', (event) => {
  if (event.data.action === 'skip') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          action: 'skip',
          direction: event.data.direction
        });
      });
    });
  }
});
