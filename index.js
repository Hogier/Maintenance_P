// Проверка того, что наш браузер поддерживает Service Worker API.
console.log("serviceWorker in navigator");
if ('serviceWorker' in navigator) {
    // Весь код регистрации у нас асинхронный.
    navigator.serviceWorker.register('./sw.js')
      .then(() => navigator.serviceWorker.ready.then((worker) => {
        worker.sync.register('syncdata'); console.log("serviceWorker ready");
      }))
      .catch((err) => console.log("Ошибка регистрации Service Worker: ",err));
}