const https = require('https');

const paths = [
  '/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg', // Interstellar
  '/n6bUvigpRFqSwmwpF1SnFlqPIbA.jpg', // Joker
  '/hqkIcbrOHL86UncnHIsKVbBBDgC.jpg', // Dark Knight
  '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', // Pulp Fiction
  '/hZkgoQYus5mWEk1mH1Ene91b70D.jpg', // Fight Club
  '/3h1JZGDhZ8nzxdgvkxha0qBqi05.jpg', // Forrest Gump
  '/s3TBrRGB1invsyVmLjvBiG977D.jpg',  // Inception
  '/lZpWprJqbIFpEV5uoHfoK0KCnTW.jpg', // Matrix
  '/lXhgNSYcqROkEFnIOZq8kO03lOO.jpg', // LotR
  '/yDI6D5iHjAIF7UjXgYAxvGts8xY.jpg', // Titanic
  '/sqkng0hIfE8sM70F1NIt5d3RymD.jpg'  // Star Wars
];

const tmdb = 'https://image.tmdb.org/t/p/w780';

Promise.all(paths.map(path => {
  return new Promise((resolve) => {
    https.get(tmdb + path, (res) => {
      resolve(`${res.statusCode} - ${path}`);
    }).on('error', (e) => {
      resolve(`Error - ${path}`);
    });
  });
})).then(results => console.log(results.join('\n')));
