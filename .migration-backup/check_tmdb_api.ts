import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function checkTmdbApi() {
  const apiKey = process.env.VITE_TMDB_API_KEY;

  if (!apiKey || apiKey === 'your_tmdb_api_key_here') {
    console.log('STATUS: Chave de API TMDb não configurada nos Secrets (VITE_TMDB_API_KEY).');
    return;
  }

  console.log('Testando conexão com TMDb API...');
  
  try {
    const response = await axios.get(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`);
    console.log('STATUS: API TMDb está ATIVADA e a chave é VÁLIDA.');
    console.log('Número de filmes encontrados:', response.data.results?.length || 0);
    if (response.data.results?.length > 0) {
      console.log('Primeiro filme da lista:', response.data.results[0].title);
    }
  } catch (error: any) {
    if (error.response) {
      const message = error.response.data?.status_message || '';
      console.log(`ERRO DA API TMDb (${error.response.status}):`, message);
      
      if (error.response.status === 401) {
        console.log('CONCLUSÃO: A sua VITE_TMDB_API_KEY é INVÁLIDA ou EXPIRADA.');
      } else if (error.response.status === 404) {
        console.log('CONCLUSÃO: Recurso não encontrado. Verifique a URL da API.');
      }
    } else {
      console.log('ERRO DE CONEXÃO:', error.message);
    }
  }
}

checkTmdbApi();
