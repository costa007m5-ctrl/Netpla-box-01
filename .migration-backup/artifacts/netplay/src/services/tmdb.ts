import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'pt-BR',
  },
});

// Interceptor para previnir que "Network Error" quebre a visualização do app e providenciar um fallback
tmdb.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Se foi Network Error (geralmente problema de CORS ou adblock)
    if (error.message === 'Network Error' || !error.response) {
      console.warn("TMDB Network Error - tentando fallback...");
      try {
        const originalRequest = error.config;
        if (!originalRequest._retry) {
           originalRequest._retry = true;
           // Constrói a URL completa com parâmetros e passa pro corsproxy
           const fullUri = tmdb.getUri(originalRequest);
           const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(fullUri);
           const fallbackResponse = await axios.get(proxyUrl);
           return fallbackResponse;
        }
      } catch (retryError) {
         console.warn("Fallback do TMDB falhou também.");
      }
    }
    
    // Apenas logamos silenciosamente em vez de re-jogar na cara do React App
    console.warn("TMDB fetch falhou, retornando dados vazios:", error?.message);
    return Promise.resolve({ data: { results: [], cast: [], logos: [], flatrate: [], buy: [] }, status: 200 });
  }
);

export const requests = {
  fetchTrending: `/trending/all/week`,
  fetchNetflixOriginals: `/discover/tv?with_networks=213`,
  fetchTopRated: `/movie/top_rated`,
  fetchActionMovies: `/discover/movie?with_genres=28`,
  fetchComedyMovies: `/discover/movie?with_genres=35`,
  fetchHorrorMovies: `/discover/movie?with_genres=27`,
  fetchRomanceMovies: `/discover/movie?with_genres=10749`,
  fetchDocumentaries: `/discover/movie?with_genres=99`,
  searchMovie: `/search/movie`,
  searchTv: `/search/tv`,
  searchMulti: `/search/multi`,
  movieDetails: (id: number) => `/movie/${id}`,
  tvDetails: (id: number) => `/tv/${id}`,
  movieCredits: (id: number) => `/movie/${id}/credits`,
  tvCredits: (id: number) => `/tv/${id}/credits`,
  movieWatchProviders: (id: number) => `/movie/${id}/watch/providers`,
  tvWatchProviders: (id: number) => `/tv/${id}/watch/providers`,
  tvSeasonDetails: (tvId: number, seasonNumber: number) => `/tv/${tvId}/season/${seasonNumber}`,
  movieImages: (id: number) => `/movie/${id}/images`,
  tvImages: (id: number) => `/tv/${id}/images`,
  fetchCollection: (id: number) => `/collection/${id}`,
  searchCollection: `/search/collection`,
  fetchMoviesByGenre: (genreId: number) => `/discover/movie?with_genres=${genreId}`,
};

export const getMovieLogo = async (id: number, type: 'movie' | 'tv' = 'movie'): Promise<string | null> => {
  try {
    const endpoint = type === 'movie' ? requests.movieImages(id) : requests.tvImages(id);
    const { data } = await tmdb.get(endpoint, {
      params: { include_image_language: 'pt,en,null' }
    });
    
    const logos = data.logos || [];
    if (logos.length === 0) return null;

    // Prioritize PT, then EN, then FIRST
    const logo = logos.find((l: any) => l.iso_639_1 === 'pt') || 
                 logos.find((l: any) => l.iso_639_1 === 'en') || 
                 logos[0];

    return logo ? `https://image.tmdb.org/t/p/original${logo.file_path}` : null;
  } catch (error) {
    console.error("Erro ao buscar logo:", error);
    return null;
  }
};

export const fetchSeasonDetailsWithFallback = async (tvId: number, seasonNumber: number) => {
  const res = await tmdb.get(requests.tvSeasonDetails(tvId, seasonNumber), { params: { language: 'pt-BR' } });
  let episodes = res.data.episodes || [];
  
  try {
    const enRes = await tmdb.get(requests.tvSeasonDetails(tvId, seasonNumber), { params: { language: 'en-US' } });
    const enEpisodes = enRes.data.episodes || [];
    const { translateToPortuguese } = await import('./ai');
    
    episodes = await Promise.all(episodes.map(async (ep: any, idx: number) => {
      let finalOverview = ep.overview;
      let finalName = ep.name;
      
      const fallbackEnOverview = enEpisodes[idx]?.overview || '';
      const fallbackEnTitle = enEpisodes[idx]?.name || '';
      
      // If pt-BR overview is empty, OR if pt-BR overview identically matches the en-US overview (meaning TMDB fell back to English), let's translate it!
      if (!finalOverview || finalOverview === '' || (finalOverview === fallbackEnOverview && fallbackEnOverview !== '')) {
         if (fallbackEnOverview) {
           finalOverview = await translateToPortuguese(fallbackEnOverview);
         }
      }
      
      // Same logic for the tile
      if (!finalName || finalName.startsWith('Episódio') || finalName === `Episode ${ep.episode_number}` || (finalName === fallbackEnTitle && fallbackEnTitle !== '')) {
          if (fallbackEnTitle && !fallbackEnTitle.startsWith('Episode ') && !fallbackEnTitle.startsWith('Episódio')) {
              try {
                finalName = await translateToPortuguese(fallbackEnTitle);
              } catch (e) {
                finalName = fallbackEnTitle;
              }
          }
      }
      
      return {
        ...ep,
        overview: finalOverview,
        name: finalName
      };
    }));
  } catch (e) {
    console.warn("Failed to fetch/translate fallback English overviews for season", seasonNumber);
  }
  
  return { ...res, data: { ...res.data, episodes } };
};

export default tmdb;
