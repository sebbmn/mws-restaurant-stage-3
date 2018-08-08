/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Reviews Database URL.
   */
  static get REVIEWS_DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews/?restaurant_id=`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    const dbPromise = idb.open('restaurantsDB', 1, upgradeDB => {
      switch (upgradeDB.oldVersion){
        case 0:
        upgradeDB.createObjectStore('restaurants', {
          keyPath: 'id'
        });
      }
    })

    fetch(DBHelper.DATABASE_URL)
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        return dbPromise.then(db => {
          const tx = db.transaction ('restaurants', 'readwrite');
          let keyValStore = tx.objectStore('restaurants')
          
          console.log("From server: ");
          console.log(response);

          response.forEach((restaurant) =>{
            keyValStore.put(restaurant);
          })
          return keyValStore.getAll();
        })
      })
      .then((response) => {
        callback(null, response);
      })
      .catch((error) => {
        return dbPromise.then(db => {
          const tx = db.transaction ('restaurants', 'readwrite');
          let keyValStore = tx.objectStore('restaurants')
          return keyValStore.getAll();
        }).then((response) => {
          callback(null, response);
        }).catch((e) => {
          callback(e, response);
        });
    });
  }

  /**
   * Fetch all reviews for a restaurant.
   */
  static fetchReviews(id, callback) {
    const dbPromise = idb.open('reviewsDB', 1, upgradeDB => {
      switch (upgradeDB.oldVersion){
        case 0:
        upgradeDB.createObjectStore('reviews', {
          keyPath: 'id'
        });
      }
    })

    fetch(DBHelper.REVIEWS_DATABASE_URL+id)
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        return dbPromise.then(db => {
          const tx = db.transaction ('reviews', 'readwrite');
          let keyValStore = tx.objectStore('reviews')
          
          //console.log("Reviews: ");
          //console.log(response);

          response.forEach((review) =>{
            keyValStore.put(review);
          })
          return keyValStore.getAll();
        })
      })
      .then((response) => {
        callback(null, response);
      })
      .catch((error) => {
        return dbPromise.then(db => {
          const tx = db.transaction ('reviews', 'readwrite');
          let keyValStore = tx.objectStore('reviews')
          return keyValStore.getAll();
        }).then((response) => {
          callback(null, response);
        }).catch((e) => {
          callback(e, response);
        });
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if(restaurant.photograph === undefined) {
      return (`/img/10.jpg`);
    } else {
      return (`/img/${restaurant.photograph}.jpg`);
    }
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
          url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
      return marker;
    } 
}
