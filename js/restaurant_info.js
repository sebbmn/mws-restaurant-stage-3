let restaurant;
let reviews;
var newMap;

/**
 * Register a service worker if the browser support it
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
  .then(function(reg) {
    // registration worked
    console.log('Registration succeeded. Scope is ' + reg.scope);
  }).catch(function(error) {
    // registration failed
    console.log('Registration failed with ' + error);
  });
}

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Check if we are online
 */
window.addEventListener('offline', function(e) { 
 
});

/**
 * When back online, send what is in the store
 */
window.addEventListener('online', function(e) { 
  DBHelper.sendAwaitingRecords();
});

/**
 * Catch the submit event and add the review
 */
let form = document.getElementById("comments_form");
let review_id = 999;

form.addEventListener("submit",(event) => {
  event.preventDefault();

  let inputName = form["name"].value;
  let inputRating = form["rating"].value;
  let inputComments = form["comments"].value;
  const id = getParameterByName('id');

  let review = {
    id: review_id++,
    restaurant_id: id,
    name: inputName,
    rating: inputRating,
    comments: inputComments
  }

  DBHelper.addReview(review);
  form.reset();

  let createdAt = {createdAt: Date.now()};
  const ul = document.getElementById('reviews-list');
  ul.appendChild(createReviewHTML({...review,...createdAt}));
});

/**
 * Initialize map as soon as the page is loaded.
 */
initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.log(error);
      } else {    
        self.newMap = L.map('map', {
          center: [restaurant.latlng.lat, restaurant.latlng.lng],
          zoom: 16,
          scrollWheelZoom: false
        });
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
          mapboxToken: 'pk.eyJ1Ijoic2ViYm1uIiwiYSI6ImNpbGw3aWFnZDAwMnp0cWx6eDgwajQ4enQifQ.jIsGz7JyOzDpqVBseNDtXg',
          maxZoom: 18,
          attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          id: 'mapbox.streets'    
        }).addTo(newMap);
        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
      }
    });
} 

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}
/**
 * Fetch the reviews for this id
 */
fetchReviews = (callback) => {
  const id = getParameterByName('id');

  DBHelper.fetchReviews(id,(error, response) => {
    if(error) {
      console.log("no reviews "+error);
    } else {
      callback(null,response);
    }
  });
};
/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name+' restaurant';

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');

  title.innerHTML = 'Reviews';
  container.appendChild(title);

  let reviewList = document.getElementById('reviews-list');
  while(reviewList.hasChildNodes())
  {
    reviewList.removeChild(reviewList.lastChild);
  }

  fetchReviews( (error,reviews) => {
    if (error) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  })
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);
  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
