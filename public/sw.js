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
