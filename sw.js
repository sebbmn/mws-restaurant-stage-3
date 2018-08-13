importScripts('/js/idb.js');

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '/css/styles.css',
        '/data/',
        '/data/restaurants.json',
        '/img/1.jpg',
        '/img/2.jpg',
        '/img/3.jpg',
        '/img/4.jpg',
        '/img/5.jpg',
        '/img/6.jpg',
        '/img/7.jpg',
        '/img/8.jpg',
        '/img/9.jpg',
        '/img/10.jpg',
        '/js/',
        '/js/dbhelper.js',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/index.html',
        '/restaurant.html',
        '/'
      ]);
    }).catch(function(err) {
      console.log(err)
    })
  );
});
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request).then(function(response) {
        return caches.open('v1').then(function(cache) {
          cache.put(event.request, response.clone());
          return response;
        });  
      });;
    })
  );
});
/**
 * sync task to send the data once online
 */
self.addEventListener('sync', function(event) {
  idb.open('reviewsToSend', 1, function(upgradeDb) {
    upgradeDb.createObjectStore('reviews', { autoIncrement : true, keyPath: 'restaurant_id' });
  }).then((db) => {
    let tx = db.transaction('reviews', 'readwrite');
    let keyValStore = tx.objectStore('reviews')
    let results = keyValStore.getAll();
    keyValStore.clear();
    return results;
  }).then((results) => {
    console.log(results);
  });
});