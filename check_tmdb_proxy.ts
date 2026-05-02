import axios from 'axios';

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: {
    api_key: 'fake',
    language: 'pt-BR',
  },
});

const req = {
    url: '/discover/movie',
    method: 'get',
    baseURL: 'https://api.themoviedb.org/3',
    params: {
        with_genres: 28,
        api_key: 'fake',
        language: 'pt-BR'
    }
};

console.log(tmdb.getUri(req));
