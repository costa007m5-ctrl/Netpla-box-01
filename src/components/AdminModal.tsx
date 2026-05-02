import React, { useState, useEffect, useMemo } from 'react';
import { X, Database, Copy, Check, Info, ShieldAlert, Trash2, Edit, Film, Loader2, Search, Filter, LayoutGrid, List, ChevronRight, Tv, PlayCircle, Plus, Settings, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import tmdb, { requests } from '../services/tmdb';
import { Movie, Episode, ScannerState } from '../types';

const cleanTitleWithAI = async (title: string, type?: string) => title;

interface AdminModalProps {
  onClose: () => void;
  onRefresh?: () => void;
  onOpenCustomUrl?: () => void;
  onStartReScan?: (movies: Movie[]) => void;
  scannerState?: ScannerState | null;
  reScannerState?: any;
}

const AdminModal: React.FC<AdminModalProps> = ({ 
  onClose, 
  onRefresh, 
  onOpenCustomUrl,
  onStartReScan,
  scannerState,
  reScannerState
}) => {
  const [copied, setCopied] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sql' | 'manage' | 'status' | 'missing' | 'bulk'>('manage');
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [apiStatus, setApiStatus] = useState({
    supabase: 'checking',
    tmdb: 'checking',
    gemini: 'checking',
    drive: 'checking'
  });
  const [editForm, setEditForm] = useState({ 
    title: '', 
    videoUrl: '', 
    videoUrl2: '',
    genres: '', 
    backdrop_path: '', 
    poster_path: '', 
    logo_path: '',
    type: 'movie' as 'movie' | 'series',
    overview: '',
    file_name: '',
    release_date: '',
    runtime: 0,
    rating: 0,
    actors: '',
    is_hidden: false,
    episodes: [] as Episode[]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isReScanning, setIsReScanning] = useState(false);
  const [reScanProgress, setReScanProgress] = useState({ current: 0, total: 0 });
  const [isSearchingTMDB, setIsSearchingTMDB] = useState(false);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [newFolderUrl, setNewFolderUrl] = useState('');
  const [newFolderSeason, setNewFolderSeason] = useState<string>('auto');
  const [isScanningNewFolder, setIsScanningNewFolder] = useState(false);

  const GENRE_MAP: { [key: number]: string } = {
    28: "Ação", 12: "Aventura", 16: "Animação", 35: "Comédia", 80: "Crime",
    99: "Documentário", 18: "Drama", 10751: "Família", 14: "Fantasia",
    36: "História", 27: "Terror", 10402: "Música", 9648: "Mistério",
    10749: "Romance", 878: "Ficção Científica", 10770: "Cinema TV",
    53: "Suspense", 10752: "Guerra", 37: "Faroeste"
  };

  const handleBulkAdd = async () => {
    if (!bulkInput.trim()) return;
    
    // Improved Parsing logic
    // 1. Sanitize input: join URLs that were split across lines
    const sanitizedInput = bulkInput
      .replace(/\n\//g, '/') 
      .replace(/\/d\n/g, '/d/')
      .replace(/\/view\n/g, '/view ') // Add space after view if it's the end of a line to separate from next title
      .replace(/https?:\/\/\n/g, 'https://');
    
    const lines = sanitizedInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items: { title: string, url: string }[] = [];
    
    let pendingTitle = '';
    
    for (const line of lines) {
      if (line.includes('http')) {
        // Case: Title and URL on the same line OR just URL
        const parts = line.split(/(https?:\/\/.*)/);
        const titlePart = parts[0].trim();
        const urlPart = parts[1].trim();
        
        const finalTitle = titlePart || pendingTitle;
        if (finalTitle && urlPart) {
          items.push({ title: finalTitle, url: urlPart });
          pendingTitle = '';
        }
      } else {
        // Case: Just a title
        pendingTitle = line;
      }
    }

    if (items.length === 0) {
      alert('Nenhum par de Título e Link encontrado. Certifique-se de que o título está na linha acima do link.');
      return;
    }

    if (!window.confirm(`Deseja processar ${items.length} filmes?`)) return;

    setIsBulkProcessing(true);
    setBulkProgress({ current: 0, total: items.length, currentTitle: '' });
    console.log('Iniciando processamento em massa de', items.length, 'itens');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1, currentTitle: item.title }));
      console.log(`Processando [${i+1}/${items.length}]: ${item.title}`);

      try {
        // 1. Pre-clean title (remove year in parentheses, brackets, or at the end, and common prefixes)
        let rawTitle = item.title
          .replace(/^\w+\s\(\d{4}\)\s?/, '') // Handle "Foi (2019) " or "Foi (2019)"
          .replace(/\(\d{4}\)/g, '')
          .replace(/\[\d{4}\]/g, '')
          .replace(/\s\d{4}$/, '')
          .trim();
        
        // 2. Clean title with AI
        const cleanName = await cleanTitleWithAI(rawTitle);
        
        // 3. Search TMDB
        // Use the cleaned name for search, but if it fails, try the rawTitle
        let searchRes = await tmdb.get(requests.searchMovie, { params: { query: cleanName } });
        
        if (searchRes.data.results.length === 0 && cleanName !== rawTitle) {
          searchRes = await tmdb.get(requests.searchMovie, { params: { query: rawTitle } });
        }
        
        const result = searchRes.data.results[0];
        
        let movieData: any = {
          title: rawTitle, // Use the pre-cleaned title as default
          video_url: item.url,
          overview: 'Adicionado via Bulk Add. Sinopse não encontrada.',
          backdrop_path: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop',
          poster_path: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop',
          genres: 'Outros',
          type: 'movie',
          file_name: item.title
        };

        if (result) {
          const detailsRes = await tmdb.get(requests.movieDetails(result.id));
          const details = detailsRes.data;
          
          // Fetch logo
          let logoPath = null;
          try {
            const imagesRes = await tmdb.get(requests.movieImages(result.id), {
              params: { include_image_language: 'pt,en,null' }
            });
            const logos = imagesRes.data.logos || [];
            const logo = logos.find((l: any) => l.iso_639_1 === 'pt') || logos.find((l: any) => l.iso_639_1 === 'en') || logos[0];
            if (logo) logoPath = `https://image.tmdb.org/t/p/w500${logo.file_path}`;
          } catch (e) {
            console.error('Erro ao buscar logo no bulk add:', e);
          }
          
          movieData = {
            ...movieData,
            title: details.title || details.name,
            overview: details.overview,
            backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : movieData.backdrop_path,
            poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : movieData.poster_path,
            logo_path: logoPath,
            genres: details.genres?.map((g: any) => g.name).join(', ') || 'Outros',
            runtime: details.runtime || 0,
            rating: details.vote_average || 0,
            release_date: details.release_date || details.first_air_date || ''
          };

          // Fetch actors (credits)
          try {
            const creditsRes = await tmdb.get(`/${movieData.type === 'series' ? 'tv' : 'movie'}/${result.id}/credits`);
            const cast = creditsRes.data.cast || [];
            movieData.actors = cast.slice(0, 5).map((a: any) => a.name).join(', ');
          } catch (e) {
            console.error('Erro ao buscar elenco no bulk add:', e);
          }
        }

        // 4. Save to Supabase
        const { error: insertError } = await supabase.from('movies').insert([movieData]);
        if (insertError) throw insertError;
        
      } catch (error) {
        console.error(`Erro ao adicionar ${item.title}:`, error);
      }
    }

    setIsBulkProcessing(false);
    setBulkInput('');
    alert('Processamento concluído!');
    fetchMovies();
    if (onRefresh) onRefresh();
  };

  const handleManualSearch = async () => {
    if (!editForm.title.trim()) return;
    setIsSearchingTMDB(true);
    try {
      const type = editForm.type === 'series' ? 'tv' : 'movie';
      const response = await tmdb.get(type === 'tv' ? requests.searchTv : requests.searchMovie, {
        params: { query: editForm.title }
      });
      setTmdbSearchResults(response.data.results.slice(0, 5));
    } catch (error) {
      console.error('Erro ao buscar no TMDB:', error);
    } finally {
      setIsSearchingTMDB(false);
    }
  };

  const selectTMDBResult = async (result: any) => {
    const type = editForm.type === 'series' ? 'tv' : 'movie';
    
    // Mapear gêneros
    let genreNames = '';
    if (result.genre_ids) {
      genreNames = result.genre_ids
        .map((id: number) => GENRE_MAP[id])
        .filter(Boolean)
        .join(', ');
    }

    setEditForm(prev => ({
      ...prev,
      title: result.title || result.name,
      backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/original/${result.backdrop_path}` : prev.backdrop_path,
      poster_path: result.poster_path ? `https://image.tmdb.org/t/p/w500/${result.poster_path}` : prev.poster_path,
      overview: result.overview || prev.overview,
      genres: genreNames || prev.genres
    }));

    // Buscar logo
    try {
      const response = await tmdb.get(`/${type}/${result.id}/images`, {
        params: { include_image_language: 'pt,en,null' }
      });
      const logos = response.data.logos;
      if (logos && logos.length > 0) {
        const ptLogo = logos.find((l: any) => l.iso_639_1 === 'pt');
        const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
        const selectedLogo = ptLogo || enLogo || logos[0];
        setEditForm(prev => ({ ...prev, logo_path: `https://image.tmdb.org/t/p/w500/${selectedLogo.file_path}` }));
      }
    } catch (error) {
      console.error('Erro ao buscar logo:', error);
    }

    // Buscar detalhes dos episódios se for série e tiver episódios vinculados
    if (editForm.type === 'series' && editForm.episodes.length > 0) {
      const uniqueSeasons = Array.from(new Set(editForm.episodes.map(e => e.season))) as number[];
      const seasonDetails: Record<number, any[]> = {};
      
      for (const s of uniqueSeasons) {
        try {
          const { fetchSeasonDetailsWithFallback } = await import('../services/tmdb');
          const res = await fetchSeasonDetailsWithFallback(result.id, s);
          let episodes = res.data.episodes;

          seasonDetails[s] = episodes;
        } catch (e) {
          console.error(`Erro ao buscar temporada ${s} na busca manual:`, e);
        }
      }

      setEditForm(prev => ({
        ...prev,
        episodes: prev.episodes.map(ep => {
          const tmdbEp = seasonDetails[ep.season]?.find(te => te.episode_number === ep.episode);
          return {
            ...ep,
            title: tmdbEp?.name || ep.title,
            overview: tmdbEp?.overview || ep.overview || '',
            still_path: tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w500/${tmdbEp.still_path}` : ep.still_path,
            release_date: tmdbEp?.air_date || ep.release_date,
            rating: tmdbEp?.vote_average || ep.rating,
            runtime: tmdbEp?.runtime || ep.runtime
          };
        })
      }));
    }

    setTmdbSearchResults([]);
  };

  const listAllFilesRecursive = async (folderId: string, driveApiKey: string, parentName?: string): Promise<any[]> => {
    let allFiles: any[] = [];
    try {
      let fileToken = '';
      do {
        const query = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${driveApiKey}&fields=nextPageToken,files(id,name,mimeType)&pageSize=100${fileToken ? `&pageToken=${fileToken}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.files) {
          const videoFiles = data.files.filter((f: any) => 
            f.mimeType.includes('video/') || 
            /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(f.name)
          );
          allFiles = [...allFiles, ...videoFiles.map((f: any) => ({ ...f, parentFolderName: parentName }))];
        }
        fileToken = data.nextPageToken;
      } while (fileToken);

      let folderToken = '';
      do {
        const query = `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${driveApiKey}&fields=nextPageToken,files(id,name)&pageSize=100${folderToken ? `&pageToken=${folderToken}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.files) {
          for (const subfolder of data.files) {
            const subfolderFiles = await listAllFilesRecursive(subfolder.id, driveApiKey, subfolder.name);
            allFiles = [...allFiles, ...subfolderFiles];
          }
        }
        folderToken = data.nextPageToken;
      } while (folderToken);
    } catch (error) {
      console.error('Erro na recursão do Drive:', error);
    }
    return allFiles;
  };

  const handleScanNewFolder = async () => {
    if (!newFolderUrl) return;
    const driveApiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
    if (!driveApiKey) {
      alert('API Key do Drive não encontrada.');
      return;
    }

    let folderId = '';
    const match = newFolderUrl.match(/[-\w]{25,}/);
    if (match) folderId = match[0];

    if (!folderId) {
      alert('URL do Drive inválida.');
      return;
    }

    setIsScanningNewFolder(true);
    try {
      const files = await listAllFilesRecursive(folderId, driveApiKey);
      if (files.length === 0) {
        alert('Nenhum arquivo de vídeo encontrado na pasta.');
        return;
      }

      const newEpisodes = files.map(f => {
        const name = f.name;
        const seMatch = name.match(/(\d+)x(\d+)/);
        const sMatch = seMatch ? { 1: seMatch[1] } : (name.match(/[Ss](\d+)/) || 
                       (f.parentFolderName?.match(/(?:Temporada|Season|T|S)\s*(\d+)/i)) ||
                       (f.parentFolderName?.match(/^(\d+)$/)));
        
        const eMatch = seMatch ? { 1: seMatch[2] } : (name.match(/[Ee](\d+)/) || 
                       name.match(/[Ee]p(?:isódio)?\s*(\d+)/i));
        
        let episodeNum = 1;
        if (eMatch) {
          episodeNum = parseInt(eMatch[1]);
        } else {
          const seasonNum = sMatch ? parseInt(sMatch[1]) : 1;
          const numbers = name.match(/\d+/g);
          if (numbers) {
            const found = numbers.find(n => parseInt(n) !== seasonNum);
            episodeNum = found ? parseInt(found) : parseInt(numbers[0]);
          }
        }

        return {
          id: f.id,
          title: name.replace(/\.[^/.]+$/, ""),
          season: newFolderSeason === 'auto' ? (sMatch ? parseInt(sMatch[1]) : 1) : parseInt(newFolderSeason),
          episode: episodeNum,
          videoUrl: `https://drive.google.com/file/d/${f.id}/view`,
          overview: '',
          still_path: null
        } as Episode;
      });

      // Mesclar com episódios existentes, evitando duplicados por videoUrl
      const existingUrls = new Set(editForm.episodes.map(e => e.videoUrl));
      const filteredNew = newEpisodes.filter(e => !existingUrls.has(e.videoUrl));

      if (filteredNew.length === 0) {
        alert('Todos os episódios desta pasta já estão no catálogo.');
        return;
      }

      // Tentar buscar metadados para os novos episódios se tivermos o ID do TMDB
      // Como não temos o ID do TMDB aqui facilmente (a menos que busquemos), vamos apenas adicionar
      // O usuário pode usar a busca manual depois para preencher tudo.
      
      const mergedEpisodes = [...editForm.episodes, ...filteredNew].sort((a, b) => (a.season - b.season) || (a.episode - b.episode));
      
      setEditForm(prev => ({ ...prev, episodes: mergedEpisodes }));
      setNewFolderUrl('');
      alert(`${filteredNew.length} novos episódios adicionados à lista de edição. Clique em "Salvar Alterações" para confirmar.`);
    } catch (error) {
      console.error('Erro ao escanear nova pasta:', error);
      alert('Erro ao escanear pasta do Drive.');
    } finally {
      setIsScanningNewFolder(false);
    }
  };

  const handleReScanMissing = async () => {
    const missingMovies = movies.filter(m => 
      m.genres === 'Outros' || 
      !m.overview || 
      m.overview.includes('não encontradas') ||
      m.overview.includes('Adicionado via pasta')
    );
    
    if (missingMovies.length === 0) {
      alert('Nenhum conteúdo com informações faltando encontrado.');
      return;
    }

    if (!window.confirm(`Deseja tentar encontrar informações para ${missingMovies.length} itens em segundo plano?`)) return;

    if (onStartReScan) {
      onStartReScan(missingMovies);
    }
  };

  const isMissingInfo = (movie: Movie) => {
    return movie.genres === 'Outros' || 
           !movie.overview || 
           movie.overview.includes('não encontradas') || 
           movie.overview.includes('Adicionado via pasta');
  };

  const checkApiStatus = async () => {
    // Supabase
    try {
      const { error } = await supabase.from('movies').select('id').limit(1);
      setApiStatus(prev => ({ ...prev, supabase: error ? 'error' : 'ok' }));
    } catch {
      setApiStatus(prev => ({ ...prev, supabase: 'error' }));
    }

    // TMDB
    try {
      const res = await tmdb.get(requests.searchMovie, { params: { query: 'Matrix' } });
      setApiStatus(prev => ({ ...prev, tmdb: res.data ? 'ok' : 'error' }));
    } catch {
      setApiStatus(prev => ({ ...prev, tmdb: 'error' }));
    }

    // Gemini
    try {
      const res = await cleanTitleWithAI('The.Matrix.1999.1080p.mkv');
      setApiStatus(prev => ({ ...prev, gemini: res ? 'ok' : 'error' }));
    } catch {
      setApiStatus(prev => ({ ...prev, gemini: 'error' }));
    }

    // Drive
    const driveKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
    setApiStatus(prev => ({ ...prev, drive: driveKey ? 'ok' : 'missing' }));
  };

  useEffect(() => {
    fetchMovies();
    checkApiStatus();
  }, []);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setMovies(data.map(m => ({
          id: m.id,
          title: m.title,
          backdrop_path: m.backdrop_path || '',
          poster_path: m.poster_path || m.backdrop_path || '',
          logo_path: m.logo_path || '',
          overview: m.overview || '',
          vote_average: m.vote_average || m.rating || 0,
          videoUrl: m.video_url,
          videoUrl2: m.video_url_2,
          genres: m.genres || '',
          type: m.type || 'movie',
          episodes: m.episodes || [],
          file_name: m.file_name || '',
          watch_providers: m.watch_providers || '',
          release_date: m.release_date || '',
          runtime: m.runtime || 0,
          rating: m.rating || m.vote_average || 0,
          actors: m.actors || '',
          is_hidden: m.is_hidden || false,
          created_at: m.created_at,
          last_rescanned_at: m.last_rescanned_at || null
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar filmes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Escutar mudanças em tempo real para o scanner
  useEffect(() => {
    const channel = supabase
      .channel('admin_movies_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => {
        fetchMovies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchesSearch = m.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || m.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [movies, searchTerm, filterType]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este conteúdo?')) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro Supabase ao deletar:', error);
        throw error;
      }
      
      setMovies(prev => prev.filter(m => m.id !== id));
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar o filme. Verifique sua conexão ou permissões.');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setEditForm({
      title: movie.title || '',
      videoUrl: movie.videoUrl || '',
      videoUrl2: movie.videoUrl2 || '',
      genres: movie.genres || '',
      backdrop_path: movie.backdrop_path || '',
      poster_path: movie.poster_path || '',
      logo_path: movie.logo_path || '',
      type: movie.type || 'movie',
      overview: movie.overview || '',
      file_name: movie.file_name || '',
      release_date: movie.release_date || '',
      runtime: movie.runtime || 0,
      rating: movie.rating || movie.vote_average || 0,
      actors: movie.actors || '',
      is_hidden: movie.is_hidden || false,
      episodes: movie.episodes || [],
      watch_providers: movie.watch_providers || ''
    });
  };

  const handleUpdate = async () => {
    if (!editingMovie) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('movies')
        .update({
          title: editForm.title,
          video_url: editForm.videoUrl || '',
          video_url_2: editForm.videoUrl2 || '',
          genres: editForm.genres,
          backdrop_path: editForm.backdrop_path,
          poster_path: editForm.poster_path,
          logo_path: editForm.logo_path,
          type: editForm.type,
          overview: editForm.overview,
          file_name: editForm.file_name,
          release_date: editForm.release_date,
          runtime: editForm.runtime,
          rating: editForm.rating,
          actors: editForm.actors,
          is_hidden: editForm.is_hidden,
          episodes: editForm.episodes,
          watch_providers: editForm.watch_providers,
          last_rescanned_at: editingMovie.last_rescanned_at
        })
        .eq('id', editingMovie.id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      setEditingMovie(null);
      fetchMovies();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      alert(`Erro ao atualizar o conteúdo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const sqlCode = `
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS (VERSÃO 3.0)
-- Copie e cole este código no SQL Editor do seu Supabase e clique em RUN.

-- 1. Criar a tabela de filmes (se não existir)
create table if not exists movies (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  video_url text,
  video_url_2 text,
  backdrop_path text,
  poster_path text,
  logo_path text,
  overview text,
  genres text,
  file_name text,
  type text default 'movie',
  episodes jsonb default '[]'::jsonb,
  watch_providers text,
  release_date text,
  runtime integer,
  rating float,
  actors text,
  is_hidden boolean default false,
  last_rescanned_at timestamp with time zone,
  user_id uuid references auth.users(id) default auth.uid()
);

-- 2. Garantir que todas as colunas necessárias existam (para tabelas já criadas)
do $$ 
begin 
  -- Coluna genres
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='genres') then
    alter table movies add column genres text;
  end if;

  -- Tornar video_url opcional (para séries)
  alter table movies alter column video_url drop not null;
  
  -- Coluna video_url_2
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='video_url_2') then
    alter table movies add column video_url_2 text;
  end if;

  -- Coluna poster_path
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='poster_path') then
    alter table movies add column poster_path text;
  end if;
  
  -- Coluna logo_path
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='logo_path') then
    alter table movies add column logo_path text;
  end if;
  
  -- Coluna overview
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='overview') then
    alter table movies add column overview text;
  end if;

  -- Coluna type
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='type') then
    alter table movies add column type text default 'movie';
  end if;
  
  -- Coluna episodes
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='episodes') then
    alter table movies add column episodes jsonb default '[]'::jsonb;
  end if;

  -- Coluna watch_providers
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='watch_providers') then
    alter table movies add column watch_providers text;
  end if;

  -- Coluna release_date
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='release_date') then
    alter table movies add column release_date text;
  end if;

  -- Coluna runtime
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='runtime') then
    alter table movies add column runtime integer;
  end if;

  -- Coluna rating
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='rating') then
    alter table movies add column rating float;
  end if;

  -- Coluna actors
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='actors') then
    alter table movies add column actors text;
  end if;

  -- Coluna is_hidden
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='is_hidden') then
    alter table movies add column is_hidden boolean default false;
  end if;

  -- Coluna last_rescanned_at
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='last_rescanned_at') then
    alter table movies add column last_rescanned_at timestamp with time zone;
  end if;

  -- Coluna user_id
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='user_id') then
    alter table movies add column user_id uuid references auth.users(id) default auth.uid();
  end if;

  -- Coluna file_name
  if not exists (select 1 from information_schema.columns where table_name='movies' and column_name='file_name') then
    alter table movies add column file_name text;
  end if;
end $$;

-- 3. Habilitar RLS (Segurança)
alter table movies enable row level security;

-- 4. Outras tabelas necessárias
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  avatar_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists watch_history (
  id bigint primary key generated always as identity,
  profile_id uuid references profiles(id) on delete cascade not null,
  movie_id bigint references movies(id) on delete cascade not null,
  last_position float default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(profile_id, movie_id)
);

-- NOVA TABELA: Minha Lista
create table if not exists my_list (
  id bigint primary key generated always as identity,
  profile_id uuid references profiles(id) on delete cascade not null,
  movie_id bigint references movies(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(profile_id, movie_id)
);

-- NOVA TABELA: Configurações do App
create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  theme text default 'dark',
  language text default 'pt-BR',
  autoplay_next boolean default true,
  show_logos boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='app_settings' and column_name='subscription_plan') then
    alter table app_settings add column subscription_plan text default 'hub';
  end if;
end $$;

alter table profiles enable row level security;
alter table watch_history enable row level security;
alter table my_list enable row level security;
alter table app_settings enable row level security;

-- 5. Limpar e recriar políticas de segurança
do $$
begin
    -- Políticas para movies
    drop policy if exists "Permitir tudo para usuários autenticados" on movies;
    drop policy if exists "Usuários podem ver apenas seus próprios filmes" on movies;
    drop policy if exists "Usuários podem inserir seus próprios filmes" on movies;
    drop policy if exists "Usuários podem atualizar seus próprios filmes" on movies;
    drop policy if exists "Usuários podem deletar seus próprios filmes" on movies;
    drop policy if exists "Usuários autenticados podem ver todos os filmes" on movies;
    
    create policy "Usuários autenticados podem ver todos os filmes" on movies for select using (auth.role() = 'authenticated');
    create policy "Usuários podem inserir seus próprios filmes" on movies for insert with check (auth.role() = 'authenticated');
    create policy "Usuários podem atualizar seus próprios filmes" on movies for update using (auth.role() = 'authenticated');
    create policy "Usuários podem deletar seus próprios filmes" on movies for delete using (auth.role() = 'authenticated');

    -- Políticas para profiles
    drop policy if exists "Gerenciar próprios perfis" on profiles;
    drop policy if exists "Usuários podem gerenciar seus próprios perfis" on profiles;
    create policy "Usuários podem gerenciar seus próprios perfis" on profiles for all using (auth.uid() = user_id);

    -- Políticas para watch_history
    drop policy if exists "Gerenciar próprio histórico" on watch_history;
    drop policy if exists "Perfis podem gerenciar seu próprio histórico" on watch_history;
    create policy "Perfis podem gerenciar seu próprio histórico" on watch_history for all using (
      exists (select 1 from profiles where id = watch_history.profile_id and user_id = auth.uid())
    );

    -- Políticas para my_list
    drop policy if exists "Perfis podem gerenciar sua própria lista" on my_list;
    create policy "Perfis podem gerenciar sua própria lista" on my_list for all using (
      exists (select 1 from profiles where id = my_list.profile_id and user_id = auth.uid())
    );

    -- Políticas para app_settings
    drop policy if exists "Usuários podem gerenciar suas próprias configurações" on app_settings;
    create policy "Usuários podem gerenciar suas próprias configurações" on app_settings for all using (auth.uid() = user_id);
end $$;
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-[#0f0f0f] w-full max-w-5xl rounded-2xl shadow-2xl relative border border-gray-800 overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="bg-[#181818] p-6 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-red-600 to-red-800 p-3 rounded-xl shadow-lg shadow-red-900/20">
              <Database size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">ADMIN CENTER</h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Controle Total do Sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenCustomUrl}
              className="flex items-center gap-2 bg-white text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm hover:bg-gray-200 transition-all"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Novo Conteúdo</span><span className="sm:hidden">Novo</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative border-b border-gray-800 bg-[#121212]">
          <div className="flex px-4 md:px-6 overflow-x-auto scrollbar-hide scroll-smooth">
            <button 
              onClick={() => setActiveTab('manage')}
              className={`px-4 md:px-8 py-4 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'manage' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Catálogo
              {activeTab === 'manage' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('sql')}
              className={`px-4 md:px-8 py-4 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'sql' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Banco de Dados
              {activeTab === 'sql' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('status')}
              className={`px-4 md:px-8 py-4 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'status' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Status APIs
              {activeTab === 'status' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('missing')}
              className={`px-4 md:px-8 py-4 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'missing' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                Pendentes
                {movies.filter(isMissingInfo).length > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                    {movies.filter(isMissingInfo).length}
                  </span>
                )}
              </div>
              {activeTab === 'missing' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('bulk')}
              className={`px-4 md:px-8 py-4 text-xs md:text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === 'bulk' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <List size={16} />
                Bulk Add
              </div>
              {activeTab === 'bulk' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full" />}
            </button>
          </div>
          {/* Sombra indicativa de scroll no mobile */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#121212] to-transparent pointer-events-none md:hidden" />
        </div>

        {/* Toolbar */}
        {activeTab === 'manage' && (
          <div className="bg-[#181818] p-4 border-b border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between px-8">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#232323] border border-gray-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-red-600 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleReScanMissing}
                disabled={reScannerState?.isScanning}
                className="flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
              >
                {reScannerState?.isScanning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                {reScannerState?.isScanning ? `Escaneando ${reScannerState.current}/${reScannerState.total}` : 'Corrigir "Outros"'}
              </button>
              <div className="h-8 w-px bg-gray-800 mx-2" />
              <div className="flex bg-[#232323] rounded-xl p-1 border border-gray-700">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFilterType('movie')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'movie' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Filmes
                </button>
                <button 
                  onClick={() => setFilterType('series')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'series' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Séries
                </button>
              </div>
              <div className="h-8 w-px bg-gray-800 mx-2" />
              <div className="flex bg-[#232323] rounded-xl p-1 border border-gray-700">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0f0f0f]">
          {activeTab === 'manage' ? (
            <div className="space-y-6">
              {loading && movies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="relative">
                    <Loader2 size={48} className="text-red-600 animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-red-600/20 animate-pulse" />
                  </div>
                  <p className="text-gray-400 font-medium">Sincronizando catálogo...</p>
                </div>
              ) : filteredMovies.length === 0 ? (
                <div className="text-center py-32 border-2 border-dashed border-gray-800 rounded-3xl bg-[#121212]">
                  <Film size={48} className="text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Nenhum resultado encontrado.</p>
                  <button onClick={() => {setSearchTerm(''); setFilterType('all');}} className="text-red-500 text-sm mt-2 hover:underline">Limpar filtros</button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
                  {filteredMovies.map((movie) => (
                    <div 
                      key={movie.id} 
                      className={`bg-[#181818] rounded-2xl border border-gray-800 hover:border-red-600/50 transition-all group overflow-hidden ${viewMode === 'list' ? 'flex items-center p-3 gap-4' : 'flex flex-col'}`}
                    >
                      <div className={`relative ${viewMode === 'list' ? 'w-32 shrink-0' : 'w-full'}`}>
                        <img 
                          src={movie.backdrop_path.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/w300/${movie.backdrop_path}`} 
                          alt="" 
                          className={`object-cover ${viewMode === 'list' ? 'aspect-video rounded-xl' : 'aspect-video w-full'}`}
                        />
                        <div className="absolute top-2 left-2">
                          {movie.type === 'series' ? (
                            <div className="bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                              <Tv size={10} /> SÉRIE
                            </div>
                          ) : (
                            <div className="bg-red-600 text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                              <Film size={10} /> FILME
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 p-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold truncate text-lg">{movie.title}</h4>
                          {movie.is_hidden && <span className="text-[8px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded-full border border-red-500/30 font-black uppercase tracking-widest">Oculto</span>}
                          {movie.videoUrl2 && <span className="text-[8px] bg-blue-600/20 text-blue-500 px-1.5 py-0.5 rounded-full border border-blue-500/30 font-black uppercase tracking-widest">Link 2</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
                            {movie.genres?.split(',')[0] || 'Geral'}
                          </span>
                          {movie.release_date && (
                             <span className="text-[10px] text-gray-500 font-medium">
                               {new Date(movie.release_date).getFullYear()}
                             </span>
                          )}
                          {movie.runtime > 0 && (
                             <span className="text-[10px] text-gray-500 font-medium">
                               {movie.runtime} min
                             </span>
                          )}
                          {movie.watch_providers && (
                            <span className="text-[9px] text-gray-500 font-medium bg-white/5 px-2 py-0.5 rounded">
                               {movie.watch_providers.split(',')[0]}
                            </span>
                          )}
                          {movie.type === 'series' && (
                            <span className="text-[10px] text-blue-400 font-bold">
                              {movie.episodes?.length || 0} Episódios
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          {viewMode === 'list' && (
                            <p className="text-[10px] text-gray-600 truncate max-w-xs font-mono">{movie.videoUrl}</p>
                          )}
                          {movie.actors && (
                            <p className="text-[10px] text-gray-500 italic truncate max-w-[150px]">
                              {movie.actors}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'px-4' : 'p-4 bg-[#121212] border-t border-gray-800'}`}>
                        <button 
                          onClick={() => startEdit(movie)}
                          className="flex-1 md:flex-none p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-2"
                          title="Editar"
                        >
                          <Edit size={18} />
                          {viewMode === 'grid' && <span className="text-xs font-bold">Editar</span>}
                        </button>
                        <button 
                          onClick={() => handleDelete(movie.id)}
                          disabled={deletingId === movie.id}
                          className="flex-1 md:flex-none p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center gap-2"
                          title="Excluir"
                        >
                          {deletingId === movie.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          {viewMode === 'grid' && <span className="text-xs font-bold">Excluir</span>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal de Edição Repaginado */}
              {editingMovie && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
                  <div className="bg-[#121212] w-full max-w-2xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#181818]">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                          <Edit size={20} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Editar Conteúdo</h3>
                      </div>
                      <button onClick={() => setEditingMovie(null)} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full">
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Título Principal</label>
                            <div className="flex gap-2 mt-1">
                              <input 
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                className="flex-1 bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white focus:border-blue-600 outline-none transition-all"
                              />
                              <button 
                                onClick={handleManualSearch}
                                disabled={isSearchingTMDB}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition-all disabled:opacity-50"
                                title="Buscar informações automaticamente"
                              >
                                {isSearchingTMDB ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                              </button>
                            </div>

                            {tmdbSearchResults.length > 0 && (
                              <div className="absolute z-[220] mt-1 w-full max-w-md bg-[#232323] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
                                {tmdbSearchResults.map((result) => (
                                  <button
                                    key={result.id}
                                    onClick={() => selectTMDBResult(result)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-gray-800 last:border-0"
                                  >
                                    <img 
                                      src={result.poster_path ? `https://image.tmdb.org/t/p/w92/${result.poster_path}` : 'https://via.placeholder.com/92x138'} 
                                      alt="" 
                                      className="w-10 h-14 object-cover rounded shadow-md"
                                    />
                                    <div>
                                      <p className="text-sm font-bold text-white line-clamp-1">{result.title || result.name}</p>
                                      <p className="text-[10px] text-gray-500">{result.release_date || result.first_air_date || 'Data desconhecida'}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipo de Conteúdo</label>
                            <select 
                              value={editForm.type}
                              onChange={(e) => setEditForm({...editForm, type: e.target.value as any})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 focus:border-blue-600 outline-none transition-all"
                            >
                              <option value="movie">Filme</option>
                              <option value="series">Série</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gêneros</label>
                            <input 
                              type="text"
                              value={editForm.genres}
                              onChange={(e) => setEditForm({...editForm, genres: e.target.value})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 focus:border-blue-600 outline-none transition-all"
                              placeholder="Ação, Drama, etc"
                            />
                          </div>

                          {editForm.type === 'series' && (
                            <div className="p-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl space-y-4">
                              <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                <Plus size={14} /> Adicionar Temporada/Pasta
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[9px] text-gray-500 uppercase font-bold">Link da Pasta do Google Drive</label>
                                  <input 
                                    type="text"
                                    value={newFolderUrl}
                                    onChange={(e) => setNewFolderUrl(e.target.value)}
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-blue-600 outline-none transition-all"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <div className="flex-1">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold">Temporada</label>
                                    <select 
                                      value={newFolderSeason}
                                      onChange={(e) => setNewFolderSeason(e.target.value)}
                                      className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:border-blue-600 outline-none transition-all"
                                    >
                                      <option value="auto">Automático (Detectar)</option>
                                      {[...Array(30)].map((_, i) => (
                                        <option key={i+1} value={i+1}>Temporada {i+1}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button 
                                    onClick={handleScanNewFolder}
                                    disabled={isScanningNewFolder || !newFolderUrl}
                                    className="self-end bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {isScanningNewFolder ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    Rastrear
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {editForm.type === 'movie' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Link Principal (GDrive)</label>
                                <input 
                                  type="text"
                                  value={editForm.videoUrl}
                                  onChange={(e) => setEditForm({...editForm, videoUrl: e.target.value})}
                                  className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 focus:border-blue-600 outline-none transition-all font-mono text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-red-500 uppercase tracking-widest">Link Secundário (KingX/Terabox)</label>
                                <input 
                                  type="text"
                                  value={editForm.videoUrl2}
                                  onChange={(e) => setEditForm({...editForm, videoUrl2: e.target.value})}
                                  className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 focus:border-red-600 outline-none transition-all font-mono text-xs"
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Lançamento</label>
                              <input 
                                type="text"
                                value={editForm.release_date}
                                onChange={(e) => setEditForm({...editForm, release_date: e.target.value})}
                                className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 text-xs"
                                placeholder="AAAA-MM-DD"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Duração (min)</label>
                              <input 
                                type="number"
                                value={editForm.runtime}
                                onChange={(e) => setEditForm({...editForm, runtime: parseInt(e.target.value) || 0})}
                                className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Avaliação</label>
                              <input 
                                type="number"
                                step="0.1"
                                value={editForm.rating}
                                onChange={(e) => setEditForm({...editForm, rating: parseFloat(e.target.value) || 0})}
                                className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 text-xs"
                              />
                            </div>
                            <div className="flex flex-col justify-center pt-5">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <div 
                                  onClick={() => setEditForm({...editForm, is_hidden: !editForm.is_hidden})}
                                  className={`w-10 h-5 rounded-full transition-all relative ${editForm.is_hidden ? 'bg-red-600' : 'bg-gray-800'}`}
                                >
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editForm.is_hidden ? 'left-6' : 'left-1'}`} />
                                </div>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Ocultar</span>
                              </label>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Atores / Elenco</label>
                            <input 
                              type="text"
                              value={editForm.actors}
                              onChange={(e) => setEditForm({...editForm, actors: e.target.value})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 text-xs"
                              placeholder="Nomes separados por vírgula"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Plataformas (ex: Netflix, HBO)</label>
                            <input 
                              type="text"
                              value={editForm.watch_providers || ''}
                              onChange={(e) => setEditForm({...editForm, watch_providers: e.target.value})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 text-xs"
                              placeholder="Nomes separados por vírgula"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sinopse</label>
                            <textarea 
                              value={editForm.overview}
                              onChange={(e) => setEditForm({...editForm, overview: e.target.value})}
                              rows={4}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-xl p-3 text-white mt-1 focus:border-blue-600 outline-none transition-all resize-none text-sm"
                            />
                          </div>
                          {editForm.file_name && (
                            <div>
                              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Nome Real do Arquivo (Admin)</label>
                              <div className="w-full bg-[#1c1c1c] border border-blue-900/30 rounded-xl p-3 text-gray-400 mt-1 text-xs font-mono break-all">
                                {editForm.file_name}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-800">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Imagens e Identidade</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-600">Banner (Backdrop)</label>
                            <input 
                              type="text"
                              value={editForm.backdrop_path}
                              onChange={(e) => setEditForm({...editForm, backdrop_path: e.target.value})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg p-2 text-xs text-white mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-600">Poster</label>
                            <input 
                              type="text"
                              value={editForm.poster_path}
                              onChange={(e) => setEditForm({...editForm, poster_path: e.target.value})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg p-2 text-xs text-white mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-600">Logo</label>
                            <input 
                              type="text"
                              value={editForm.logo_path}
                              onChange={(e) => setEditForm({...editForm, logo_path: e.target.value})}
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg p-2 text-xs text-white mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      {editForm.type === 'series' && (
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Episódios ({editForm.episodes.length})</h4>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={async () => {
                                  if (!editForm.title.trim()) {
                                    alert('Nome da série não pode estar vazio para buscar episódios no TMDB.');
                                    return;
                                  }
                                  try {
                                    const searchRes = await tmdb.get(requests.searchTv, { params: { query: editForm.title } });
                                    if (searchRes.data.results.length === 0) {
                                      alert('Série não encontrada no TMDB.');
                                      return;
                                    }
                                    const result = searchRes.data.results[0]; // Pegamos o primeiro resultado
                                    
                                    const uniqueSeasons = Array.from(new Set(editForm.episodes.map(e => e.season))) as number[];
                                    const seasonDetails: Record<number, any[]> = {};
                                    
                                    for (const s of uniqueSeasons) {
                                      try {
                                        const { fetchSeasonDetailsWithFallback } = await import('../services/tmdb');
                                        const res = await fetchSeasonDetailsWithFallback(result.id, s);
                                        let episodes = res.data.episodes;
                                        
                                        seasonDetails[s] = episodes;
                                      } catch (e) {
                                        console.error(`Erro ao buscar temporada ${s}:`, e);
                                      }
                                    }

                                    setEditForm(prev => ({
                                      ...prev,
                                      episodes: prev.episodes.map(ep => {
                                        const tmdbEp = seasonDetails[ep.season]?.find(te => te.episode_number === ep.episode);
                                        return {
                                          ...ep,
                                          title: tmdbEp?.name || ep.title,
                                          overview: tmdbEp?.overview || ep.overview || '',
                                          still_path: tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w500/${tmdbEp.still_path}` : ep.still_path,
                                          release_date: tmdbEp?.air_date || ep.release_date,
                                          rating: tmdbEp?.vote_average || ep.rating,
                                          runtime: tmdbEp?.runtime || ep.runtime
                                        };
                                      })
                                    }));
                                    alert('Episódios sincronizados com o TMDB com sucesso!');
                                  } catch (error) {
                                    console.error('Erro geral na sincronização:', error);
                                    alert('Ocorreu um erro ao buscar detalhes dos episódios no TMDB.');
                                  }
                                }}
                                className="text-[10px] bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full hover:bg-green-600 hover:text-white transition-all flex items-center gap-1"
                              >
                                <RefreshCw size={12} /> Sync TMDB
                              </button>
                              <button 
                                onClick={() => setEditForm({...editForm, episodes: [...editForm.episodes, { id: Date.now().toString(), title: '', season: 1, episode: editForm.episodes.length + 1, videoUrl: '' }]})}
                                className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full hover:bg-blue-600 hover:text-white transition-all"
                              >
                                + Add Ep
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-end gap-2 mb-2 p-2 bg-[#1c1c1c] rounded-lg border border-gray-800">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Auto-Next (Fim):</span>
                            <input 
                              type="number" 
                              placeholder="Segs (ex: 30)"
                              className="w-20 bg-black border border-gray-800 text-xs text-center text-white p-1 rounded outline-none h-6"
                              id="bulkCreditsTimeAdmin"
                            />
                            <button 
                              onClick={() => {
                                const val = (document.getElementById('bulkCreditsTimeAdmin') as HTMLInputElement).value;
                                if (val !== '') {
                                  setEditForm({...editForm, episodes: editForm.episodes.map(ep => ({...ep, credits_time: Number(val)}))});
                                }
                              }}
                              className="text-[10px] bg-red-600/20 text-red-500 border border-red-500/30 px-3 py-1 rounded hover:bg-red-600 hover:text-white transition-all h-6 flex items-center font-bold"
                            >
                              Aplicar a Todos
                            </button>
                          </div>

                          <div className="space-y-2">
                            {editForm.episodes.map((ep, idx) => (
                              <div key={ep.id} className="bg-[#1c1c1c] rounded-xl border border-gray-800 overflow-hidden">
                                <div className="p-3 flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-gray-600">T</span>
                                    <input 
                                      type="number" 
                                      value={ep.season}
                                      onChange={(e) => {
                                        const newEps = [...editForm.episodes];
                                        newEps[idx].season = parseInt(e.target.value) || 1;
                                        setEditForm({...editForm, episodes: newEps});
                                      }}
                                      className="w-8 bg-transparent border-b border-gray-800 text-xs text-white p-1 outline-none focus:border-blue-600 text-center"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-gray-600">E</span>
                                    <input 
                                      type="number" 
                                      value={ep.episode}
                                      onChange={(e) => {
                                        const newEps = [...editForm.episodes];
                                        newEps[idx].episode = parseInt(e.target.value) || 1;
                                        setEditForm({...editForm, episodes: newEps});
                                      }}
                                      className="w-8 bg-transparent border-b border-gray-800 text-xs text-white p-1 outline-none focus:border-blue-600 text-center"
                                    />
                                  </div>
                                  <input 
                                    type="text" 
                                    placeholder="Título"
                                    value={ep.title}
                                    onChange={(e) => {
                                      const newEps = [...editForm.episodes];
                                      newEps[idx].title = e.target.value;
                                      setEditForm({...editForm, episodes: newEps});
                                    }}
                                    className="flex-1 bg-transparent border-b border-gray-800 text-xs text-white p-1 outline-none focus:border-blue-600"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="URL"
                                    value={ep.videoUrl}
                                    onChange={(e) => {
                                      const newEps = [...editForm.episodes];
                                      newEps[idx].videoUrl = e.target.value;
                                      setEditForm({...editForm, episodes: newEps});
                                    }}
                                    className="flex-[2] bg-transparent border-b border-gray-800 text-xs text-white p-1 outline-none focus:border-blue-600"
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="Auto-Next (s)"
                                    title="Segundos antes do final para pular o episódio/créditos"
                                    value={ep.credits_time !== undefined ? ep.credits_time : ''}
                                    onChange={(e) => {
                                      const newEps = [...editForm.episodes];
                                      newEps[idx].credits_time = e.target.value ? Number(e.target.value) : undefined;
                                      setEditForm({...editForm, episodes: newEps});
                                    }}
                                    className="w-24 bg-transparent border-b border-gray-800 text-xs text-white p-1 outline-none focus:border-blue-600"
                                  />
                                  <button 
                                    onClick={() => setEditForm({...editForm, episodes: editForm.episodes.filter((_, i) => i !== idx)})}
                                    className="text-gray-600 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="px-3 pb-2">
                                  <textarea 
                                    placeholder="Sinopse do episódio..."
                                    value={ep.overview || ''}
                                    onChange={(e) => {
                                      const newEps = [...editForm.episodes];
                                      newEps[idx].overview = e.target.value;
                                      setEditForm({...editForm, episodes: newEps});
                                    }}
                                    rows={1}
                                    className="w-full bg-transparent border-b border-gray-800 text-[10px] text-gray-400 p-1 outline-none focus:border-blue-600 resize-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-[#181818] border-t border-gray-800 flex gap-4">
                      <button 
                        onClick={() => setEditingMovie(null)}
                        className="flex-1 bg-[#232323] text-white font-bold py-3 rounded-xl hover:bg-[#2f2f2f] transition-all"
                      >
                        Descartar
                      </button>
                      <button 
                        onClick={handleUpdate}
                        disabled={loading}
                        className="flex-[2] bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                        {loading ? 'Salvando...' : 'Confirmar Alterações'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'missing' ? (
            <div className="space-y-6">
              <div className="bg-red-600/10 border border-red-600/20 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="bg-red-600 p-3 rounded-xl shadow-lg shadow-red-900/20">
                    <ShieldAlert size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Conteúdos com Informações Faltando</h3>
                    <p className="text-xs text-gray-400">Estes itens foram adicionados mas não possuem sinopse ou imagens corretas.</p>
                  </div>
                </div>
                <button 
                  onClick={handleReScanMissing}
                  disabled={reScannerState?.isScanning}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {reScannerState?.isScanning ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  {reScannerState?.isScanning ? `Corrigindo ${reScannerState.current}/${reScannerState.total}` : 'Tentar Corrigir Todos com IA'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {movies.filter(isMissingInfo).map(movie => (
                  <div key={movie.id} className="bg-[#181818] border border-gray-800 rounded-2xl p-4 flex gap-4 hover:border-red-600/50 transition-all group">
                    <div className="w-24 h-36 bg-[#222] rounded-lg overflow-hidden shrink-0 border border-gray-800">
                      <img 
                        src={movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w200/${movie.poster_path}`} 
                        alt="" 
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-white font-bold truncate">{movie.title}</h4>
                        <p className="text-[10px] text-blue-500 font-mono mt-1 truncate">Arquivo: {movie.file_name || 'Desconhecido'}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {movie.genres === 'Outros' && <span className="text-[9px] bg-yellow-600/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">Sem Gênero</span>}
                          {(!movie.overview || movie.overview.includes('não encontradas')) && <span className="text-[9px] bg-red-600/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20">Sem Sinopse</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => startEdit(movie)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Edit size={14} /> Editar Manual
                        </button>
                        <button 
                          onClick={() => handleDelete(movie.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {movies.filter(isMissingInfo).length === 0 && (
                  <div className="col-span-full py-20 text-center bg-[#121212] rounded-3xl border-2 border-dashed border-gray-800">
                    <Check size={48} className="text-green-600 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">Tudo em ordem!</p>
                    <p className="text-xs text-gray-600">Todos os conteúdos possuem informações básicas.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'bulk' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-blue-600/10 border border-blue-600/20 p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20">
                    <List size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Adicionar em Massa (Bulk Add)</h3>
                    <p className="text-xs text-gray-400">Cole uma lista de títulos e links do Google Drive para adicionar automaticamente.</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] border border-gray-800 rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Lista de Filmes e Links</label>
                    <button 
                      onClick={() => setBulkInput('')}
                      className="text-[10px] text-gray-500 hover:text-white transition-colors"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                  <textarea 
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder="Exemplo:&#10;Garota Veneno (2002)&#10;https://drive.google.com/file/d/1yVC91bUrjCQeQC-zfCyH1hhRD8MJMgFq/view&#10;&#10;Vovó... Zona (2000) https://drive.google.com/file/d/1ulcelUxXdYkJa9oU1Jrq5fbzTI-mMn8l/view"
                    className="w-full h-80 bg-[#121212] border border-gray-800 rounded-xl p-4 text-sm text-white focus:border-blue-600 outline-none transition-all resize-none font-mono"
                    disabled={isBulkProcessing}
                  />
                  <p className="text-[10px] text-gray-500 italic">Dica: O sistema aceita o nome do filme seguido do link (na mesma linha ou na linha abaixo).</p>
                </div>

                {isBulkProcessing && (
                  <div className="bg-blue-600/5 border border-blue-600/20 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-400 font-bold">Processando: {bulkProgress.currentTitle}</span>
                      <span className="text-gray-500">{bulkProgress.current} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300" 
                        style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleBulkAdd}
                  disabled={isBulkProcessing || !bulkInput.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
                >
                  {isBulkProcessing ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                  {isBulkProcessing ? 'Processando Lista...' : 'Começar a Adicionar'}
                </button>
              </div>
            </div>
          ) : activeTab === 'status' ? (
            <div className="space-y-6">
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings className="text-red-600" /> Verificação de Conectividade
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#222] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${apiStatus.supabase === 'ok' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : apiStatus.supabase === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-white">Supabase (Banco de Dados)</p>
                        <p className="text-[10px] text-gray-500">Armazenamento de filmes e perfis</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${apiStatus.supabase === 'ok' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {apiStatus.supabase === 'ok' ? 'ONLINE' : apiStatus.supabase === 'checking' ? 'TESTANDO...' : 'ERRO'}
                    </span>
                  </div>

                  <div className="bg-[#222] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${apiStatus.tmdb === 'ok' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : apiStatus.tmdb === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-white">TMDB API</p>
                        <p className="text-[10px] text-gray-500">Busca de capas e sinopses</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${apiStatus.tmdb === 'ok' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {apiStatus.tmdb === 'ok' ? 'ONLINE' : apiStatus.tmdb === 'checking' ? 'TESTANDO...' : 'ERRO'}
                    </span>
                  </div>

                  <div className="bg-[#222] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${apiStatus.gemini === 'ok' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : apiStatus.gemini === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-white">Google Gemini (IA)</p>
                        <p className="text-[10px] text-gray-500">Limpeza de títulos e organização</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${apiStatus.gemini === 'ok' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {apiStatus.gemini === 'ok' ? 'ONLINE' : apiStatus.gemini === 'checking' ? 'TESTANDO...' : 'ERRO'}
                    </span>
                  </div>

                  <div className="bg-[#222] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${apiStatus.drive === 'ok' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-white">Google Drive API</p>
                        <p className="text-[10px] text-gray-500">Scanner de pastas e arquivos</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${apiStatus.drive === 'ok' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {apiStatus.drive === 'ok' ? 'CONFIGURADA' : 'FALTANDO'}
                    </span>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-red-600/10 border border-red-600/20 rounded-xl text-center">
                  <p className="text-xs text-red-200/80 leading-relaxed">
                    <span className="font-bold text-red-500">Dica:</span> Se alguma API estiver em "ERRO", verifique se as chaves de API foram adicionadas corretamente no menu <span className="font-bold">Settings &gt; Secrets</span> do AI Studio.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-lg flex gap-4">
                <ShieldAlert className="text-yellow-400 shrink-0" size={20} />
                <div>
                  <p className="text-sm font-bold text-yellow-100 mb-1">Problemas com conteúdo oculto?</p>
                  <p className="text-xs text-yellow-100/80">
                    Se alguns filmes não aparecem no catálogo ou na busca, é provável que as regras de segurança (RLS) estejam bloqueando o acesso. Execute o script abaixo para liberar o acesso a todos os conteúdos para usuários logados.
                  </p>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg flex gap-4">
                <Info className="text-blue-400 shrink-0" size={20} />
                <p className="text-sm text-blue-100">
                  Execute este script no Supabase se encontrar erros ao salvar ou se a tabela não existir.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Script SQL</label>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs font-bold bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white px-3 py-1.5 rounded transition-all"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <pre className="bg-black p-4 rounded-lg text-xs text-green-400 font-mono overflow-x-auto border border-gray-800 leading-relaxed max-h-64">
                  {sqlCode}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert size={16} className="text-yellow-500" />
                  Instruções
                </h3>
                <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                  <li>Acesse o <strong>SQL Editor</strong> no Supabase.</li>
                  <li>Cole o código e clique em <strong>Run</strong>.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#181818] p-6 border-t border-gray-800 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-white text-black font-bold px-6 py-2 rounded hover:bg-gray-200 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminModal;
