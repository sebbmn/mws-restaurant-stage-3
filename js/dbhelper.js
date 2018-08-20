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
   * POST Reviews Database URL.
   */
  static get POST_REVIEWS_DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/reviews/`;
  }

  /**
   * IDB access method
   */
  static getIdbPromise(dbName, objectStoreName, key) {
    return idb.open(dbName, 1, upgradeDB => {
      switch (upgradeDB.oldVersion){
        case 0:
        upgradeDB.createObjectStore(objectStoreName, {
          keyPath: key
        });
      }
    })
  }

  /**
   * Add a record or an array of records in an Objectstore
   */
  static addIdbRecords(db, objectStoreName, records, record, keyValStore=null) {
    if(keyValStore==null) {
      const tx = db.transaction (objectStoreName, 'readwrite');
      keyValStore = tx.objectStore(objectStoreName);
    }

    if(records) {
      records.forEach((record) => {
        keyValStore.put(record);
      })
    } else if (record) {
      keyValStore.put(record);
    }
    //to chain the promises
    return keyValStore;
  }

  /**
   * Get all the record of an Objectstore
   */
  static getAllIdbRecords(db, objectStoreName, keyValStore=null) {
    if(keyValStore==null) {
      const tx = db.transaction (objectStoreName, 'readwrite');
      keyValStore = tx.objectStore(objectStoreName);
    }
    return keyValStore.getAll();
  }

  /**
   * Clear all records
   */
  static clearAllIdbRecords(db, objectStoreName, keyValStore=null) {
    if(keyValStore==null) {
      const tx = db.transaction (objectStoreName, 'readwrite');
      keyValStore = tx.objectStore(objectStoreName);
    }

    keyValStore.clear();
    return keyValStore;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    const dbPromise = DBHelper.getIdbPromise('restaurantsIDB','restaurants','id');

    fetch(DBHelper.DATABASE_URL)
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        return dbPromise.then(db => {
          return DBHelper.addIdbRecords(db,'restaurants',response)
          .then((keyValStore) => {
            return DBHelper.getAllIdbRecords(keyValStore);
          });
        })
      })
      .then((response) => {
        callback(null, response);
      })
      .catch((error) => {
        return dbPromise.then(db => {
          return DBHelper.getAllIdbRecords(db,'restaurants');
        }).then((response) => {
          callback(null, response);
        }).catch((e) => {
          callback(e, null);
        });
    });
  }

  /**
   * Fetch all reviews for a restaurant.
   */
  static fetchReviews(id, callback) {
    const dbPromise = DBHelper.getIdbPromise('reviewsIDB','reviews','id');

    fetch(DBHelper.REVIEWS_DATABASE_URL+id)
      .then((response) => {
        return response.json();
      })
      .then((response) => {
        return dbPromise.then(db => {
          return DBHelper.addIdbRecords(db,'reviews',response)
          .then((keyValStore) => {
            return DBHelper.getAllIdbRecords(keyValStore)
            .then((response) => {
              return response.filter( (review) => {
                return review.restaurant_id == id;
              });
            });
          });
        })
      })
      .then((response) => {
        callback(null, response);
      })
      .catch((error) => {
        return dbPromise.then(db => {
          return DBHelper.getAllIdbRecords(db,'reviews')
          .then((response) => {
            return response.filter( (review) => {
              return review.restaurant_id == id;
            });
          });
        }).then((response) => {
          callback(null, response);
        }).catch((e) => {
          callback(e, null);
        });
    });
  }

  /**
   * Put a review
   */
  static addReview(review) {
    const dbPromise = DBHelper.getIdbPromise('awaitingReviewsIDB','reviews','id');

    let reviewTosend = {
      restaurant_id: review.restaurant_id,
      name: review.name,
      rating: review.rating,
      comments: review.comments
    };
    let reviewTostore = review;

    fetch(DBHelper.POST_REVIEWS_DATABASE_URL, {
      method: "POST", 
      headers: {
          "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(reviewTosend),
    })
    .then((response) => {
      response.json()
      console.log("review posted",reviewTosend);
    }) // parses response to JSON
    .catch((error) => {
      console.error(`Unable to fetch, store the data locally. Fetch Error =\n`, error);
      dbPromise.then(db => {
        DBHelper.addIdbRecords(db,'reviews',null,review);
      })
    });
  }

    /**
   * update the favorite status of a restaurant
   */
  static updateFavoriteStatus(restaurantId, newStatus) {
    let url = `http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${newStatus}`
    const dbPromise = DBHelper.getIdbPromise('awaitingStatusUpdateIDB','favorite','id');

    let statusUpdate = {
      id: restaurantId,
      status: newStatus
    }

    fetch(url, {
      method: "PUT"
    })
    .then((response) => {
      response.json();
      console.log("Favorite updated", response);
    })
    .catch((error) => {
      console.error(`Unable to fetch, store the data locally. Fetch Error =\n`, error);
      dbPromise.then(db => {
        DBHelper.addIdbRecords(db,'favorite',null,statusUpdate);
      })
    });
  }

  /**
   * send all the records and flush the awaitings DBs
   */
  static sendAwaitingRecords() {
    console.log("back online, we'll send all the stuff!")
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
