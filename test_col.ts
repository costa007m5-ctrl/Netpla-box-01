import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_TMDB_API_KEY;

async function test() {
  // Avengers collection ID: 86311
  try {
     const res = await fetch(`https://api.themoviedb.org/3/collection/86311/images?api_key=${API_KEY}`);
     const data = await res.json();
     console.log('Keys:', Object.keys(data));
  } catch(e) {
     console.log(e.message);
  }
}
test();
