import tmdb, { requests } from './src/services/tmdb';

async function test() {
  try {
     const res = await tmdb.get(requests.fetchMoviesByGenre(28));
     console.log("Success! count:", res.data.results.length);
     console.log("First movie title:", res.data.results[0].title);
     console.log("First movie backdrop:", res.data.results[0].backdrop_path);
  } catch (err: any) {
     console.error("Failed:", err.message);
  }
}
test();
