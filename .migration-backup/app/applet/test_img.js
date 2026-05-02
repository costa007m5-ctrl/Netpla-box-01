const https = require('https');

const urls = [
  'https://image.tmdb.org/t/p/w780/mDf935S7qbZOSo9u3YmBAzY6nU2.jpg',
  'https://image.tmdb.org/t/p/w780/9v8X8tB8bS19K6G2w6N8fXG8gC.jpg',
  'https://image.tmdb.org/t/p/w780/8Y736u7S99K3NBSmToIdpY2S8uF.jpg',
  'https://image.tmdb.org/t/p/w780/ve9P65Tf0JAs1GgM2Y8V4v5N5Wb.jpg',
  'https://image.tmdb.org/t/p/w780/lX999O9rKpsS0S6A1d1K3kF9fWb.jpg',
  'https://image.tmdb.org/t/p/w780/9n2tLpS0STIyuQq9S8fXG8gC.jpg',
  'https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg', // Avengers
  'https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg', // Spider-Verse
  'https://image.tmdb.org/t/p/w780/tmU7GeKVybMWFButWEGl2M4GeiP.jpg' // Godfather
];

Promise.all(urls.map(url => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(`${res.statusCode} - ${url}`);
    }).on('error', (e) => {
      resolve(`Error - ${url}`);
    });
  });
})).then(results => console.log(results.join('\n')));
