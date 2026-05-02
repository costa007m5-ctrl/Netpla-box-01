const https = require('https');

const urls = [
  'https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
  'https://image.tmdb.org/t/p/w780/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
  'https://image.tmdb.org/t/p/w780/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
  'https://image.tmdb.org/t/p/w780/yMsuowA1wD908l1P0RjH5bQo2D0.jpg', // Hangover?
  'https://image.tmdb.org/t/p/w780/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', // Shawshank?
  'https://image.tmdb.org/t/p/w780/tcheoA2nPATCm2vvXw2hVQoaZbD.jpg', // It?
  'https://image.tmdb.org/t/p/w780/xJHokMbljvjEVA34xRPhmH1h1eD.jpg', // Interstellar?
  'https://image.tmdb.org/t/p/w780/8rpDcsfLJypbO6vtecxs5HMVu00.jpg', // Dune?
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
