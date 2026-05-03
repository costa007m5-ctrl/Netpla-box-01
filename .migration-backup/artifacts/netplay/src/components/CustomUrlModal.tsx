import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Save, Search, Loader2, FolderOpen, Tv, Film, Plus, Trash2, Sparkles, Cloud, Info, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import tmdb, { requests } from '../services/tmdb';
import { Episode, ScannerState } from '../types';
import { motion, AnimatePresence } from 'motion/react';

// Mocked without gemini
const cleanTitleWithAI = async (title: string, type: string) => title;

interface CustomUrlModalProps {
  onClose: () => void;
  onPlay: (url: string) => void;
  onSave?: () => void;
  onStartScanner: (folderId: string, folderUrl: string, options?: { type?: 'movie' | 'series' }) => void;
  scannerState: ScannerState | null;
}

const CustomUrlModal: React.FC<CustomUrlModalProps> = ({ 
  onClose, 
  onPlay, 
  onSave, 
  onStartScanner,
  scannerState 
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'series' | 'terabox'>('single');
  const [teraboxType, setTeraboxType] = useState<'movie' | 'series'>('movie');
  const [url, setUrl] = useState('');
  const [teraboxUrl, setTeraboxUrl] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [title, setTitle] = useState('');
  const [backdrop, setBackdrop] = useState('');
  const [poster, setPoster] = useState('');
  const [logo, setLogo] = useState('');
  const [overview, setOverview] = useState('');
  const [genres, setGenres] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // States for Bulk Add
  const [folderUrl, setFolderUrl] = useState(scannerState?.folderUrl || '');
  const [isBackground, setIsBackground] = useState(false);

  // States for Series
  const [episodes, setEpisodes] = useState<Partial<Episode>[]>([]);

  const GENRE_MAP: { [key: number]: string } = {
    28: "Ação", 12: "Aventura", 16: "Animação", 35: "Comédia", 80: "Crime",
    99: "Documentário", 18: "Drama", 10751: "Família", 14: "Fantasia",
    36: "História", 27: "Terror", 10402: "Música", 9648: "Mistério",
    10749: "Romance", 878: "Ficção Científica", 10770: "Cinema TV",
    53: "Suspense", 10752: "Guerra", 37: "Faroeste"
  };

  const handleSearch = async (searchTitle?: string, type: 'movie' | 'tv' = 'movie') => {
    const query = searchTitle || title;
    if (query.length < 2) return;
    setIsSearching(true);
    try {
      const response = await tmdb.get(type === 'movie' ? requests.searchMovie : requests.searchTv, {
        params: { query }
      });
      setSearchResults(response.data.results.slice(0, 5));
    } catch (error) {
      console.error('Erro ao buscar no TMDB:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectMovie = async (movie: any, type: 'movie' | 'tv' = 'movie') => {
    setTitle(movie.title || movie.name);
    setBackdrop(movie.backdrop_path ? `https://image.tmdb.org/t/p/original/${movie.backdrop_path}` : '');
    setPoster(movie.poster_path ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}` : '');
    setOverview(movie.overview || '');
    
    // Mapear gêneros
    if (movie.genre_ids) {
      const genreNames = movie.genre_ids
        .map((id: number) => GENRE_MAP[id])
        .filter(Boolean)
        .join(', ');
      setGenres(genreNames);
    }

    // Buscar imagens adicionais (logos)
    try {
      const response = await tmdb.get(`/${type}/${movie.id}/images`, {
        params: { include_image_language: 'pt,en,null' }
      });
      
      const logos = response.data.logos;
      if (logos && logos.length > 0) {
        const ptLogo = logos.find((l: any) => l.iso_639_1 === 'pt');
        const enLogo = logos.find((l: any) => l.iso_639_1 === 'en');
        const selectedLogo = ptLogo || enLogo || logos[0];
        setLogo(`https://image.tmdb.org/t/p/w500/${selectedLogo.file_path}`);
      }
    } catch (error) {
      console.error('Erro ao buscar imagens adicionais:', error);
    }
    
    setSearchResults([]);
  };

  const extractFolderId = (url: string) => {
    // Suporta formatos: /folders/ID, ?id=ID, /open?id=ID
    const match = url.match(/folders\/([-\w]{25,})/) || url.match(/[?&]id=([-\w]{25,})/);
    return match ? match[1] : null;
  };

  const handleBulkAdd = async (type: 'movie' | 'series' = 'movie') => {
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      alert('Link da pasta do Drive inválido. Use o formato: https://drive.google.com/drive/folders/ID');
      return;
    }

    onStartScanner(folderId, folderUrl, { type });
    if (isBackground) {
      onClose();
    }
  };

  const handleAddEpisode = () => {
    setEpisodes([...episodes, { season: 1, episode: episodes.length + 1, title: '', videoUrl: '' }]);
  };

  const handleRemoveEpisode = (index: number) => {
    setEpisodes(episodes.filter((_, i) => i !== index));
  };

  const handleEpisodeChange = (index: number, field: keyof Episode, value: any) => {
    const newEpisodes = [...episodes];
    newEpisodes[index] = { ...newEpisodes[index], [field]: value };
    setEpisodes(newEpisodes);
  };

  const handleSaveSeries = async () => {
    if (!title.trim() || episodes.length === 0) {
      alert('Preencha o título e adicione pelo menos um episódio.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('movies')
        .insert([
          { 
            title: title.trim(), 
            backdrop_path: backdrop.trim() || 'https://picsum.photos/seed/series/1920/1080',
            poster_path: poster.trim() || backdrop.trim() || 'https://picsum.photos/seed/series/500/750',
            logo_path: logo.trim(),
            overview: overview.trim() || 'Série adicionada manualmente.',
            genres: genres.trim(),
            type: 'series',
            episodes: episodes // Supabase stores this as JSONB if the column exists
          }
        ]);

      if (error) throw error;
      
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar série:', error);
      alert('Erro ao salvar série.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onPlay(url.trim());
    }
  };

  const handleConvertTeraBox = async () => {
    if (!teraboxUrl.trim()) {
      alert('Por favor, cole um link do TeraBox primeiro.');
      return;
    }

    setIsConverting(true);
    try {
      const response = await fetch('/api/terabox/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: teraboxUrl.trim() })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Resposta não-JSON recebida:', text);
        throw new Error('O servidor retornou uma resposta inválida. Tente novamente em instantes.');
      }

      const data = await response.json();

      if (data.success) {
        let finalUrl = data.videoUrl || data.directUrl;
        if (finalUrl) {
          setUrl(finalUrl);
          
          // Se for série e tivermos episódios, podemos sugerir adicionar ao último ou novo
          if (activeTab === 'terabox' && teraboxType === 'series') {
            const newEp: Episode = {
              id: Math.random().toString(36).substr(2, 9),
              title: `Episódio ${episodes.length + 1}`,
              season: 1,
              episode: episodes.length + 1,
              videoUrl: finalUrl
            };
            setEpisodes([...episodes, newEp]);
          }

          // Se o título estiver vazio, tenta extrair algo da URL
          if (!title.trim()) {
            const urlObj = new URL(teraboxUrl.trim());
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart.length > 5) {
              setTitle(lastPart);
            }
          }

          alert('Link convertido com sucesso! Agora você pode buscar as informações do filme pelo título.');
        }
      } else {
        throw new Error(data.error || 'Erro desconhecido na conversão.');
      }
    } catch (error: any) {
      console.error('Erro ao converter:', error);
      alert('Falha na conversão automática: ' + error.message + '\n\nPor favor, use um dos conversores manuais abaixo.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim() || !title.trim()) {
      alert('Por favor, preencha o título e o link.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('movies')
        .insert([
          { 
            title: title.trim(), 
            video_url: url.trim(), 
            backdrop_path: backdrop.trim() || 'https://picsum.photos/seed/movie/1920/1080',
            poster_path: poster.trim() || backdrop.trim() || 'https://picsum.photos/seed/movie/500/750',
            logo_path: logo.trim(),
            overview: overview.trim() || 'Adicionado manualmente.',
            genres: genres.trim()
          }
        ]);

      if (error) throw error;
      
      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar no Supabase:', error);
      alert('Erro ao salvar. Verifique se a tabela "movies" existe no Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#121212] w-full max-w-2xl rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-10 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-600/20">
              <Plus className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Adicionar</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 italic">Expanda sua biblioteca</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white hover:rotate-90 duration-500"
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
          {/* Tabs */}
          <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/5">
            <button 
              onClick={() => setActiveTab('single')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all italic ${activeTab === 'single' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Film size={18} /> Individual
            </button>
            <button 
              onClick={() => setActiveTab('series')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all italic ${activeTab === 'series' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Tv size={18} /> Série
            </button>
            <button 
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all italic ${activeTab === 'bulk' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <FolderOpen size={18} /> Drive
            </button>
            <button 
              onClick={() => setActiveTab('terabox')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all italic ${activeTab === 'terabox' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Cloud size={18} /> TeraBox
            </button>
          </div>

          <div className="space-y-8">
            {activeTab !== 'bulk' && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Informações Básicas</h3>
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors">
                    <Search size={24} />
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={activeTab === 'series' ? "Nome da Série..." : "Nome do Filme..."}
                    className="w-full bg-white/5 text-white pl-16 pr-20 py-6 rounded-[2rem] outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm"
                  />
                  <button 
                    onClick={() => handleSearch(undefined, activeTab === 'series' ? 'tv' : 'movie')}
                    disabled={isSearching || title.length < 2}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-all disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-red-600" />}
                  </button>

                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-4 bg-[#181818] border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[160] overflow-hidden backdrop-blur-3xl"
                      >
                        {searchResults.map((movie) => (
                          <button
                            key={movie.id}
                            onClick={() => selectMovie(movie, activeTab === 'series' ? 'tv' : 'movie')}
                            className="w-full flex items-center gap-6 p-4 hover:bg-white/5 transition-all text-left group"
                          >
                            <img 
                              src={movie.poster_path ? `https://image.tmdb.org/t/p/w92/${movie.poster_path}` : 'https://via.placeholder.com/92x138'} 
                              alt="" 
                              className="w-12 h-16 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                            />
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tighter italic group-hover:text-red-500 transition-colors">{movie.title || movie.name}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{movie.release_date || movie.first_air_date}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {activeTab === 'single' && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Link do Conteúdo</h3>
                <div className="relative group">
                  <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors" size={24} />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Link do Drive, YouTube, etc..."
                    className="w-full bg-white/5 text-white pl-16 pr-6 py-6 rounded-[2rem] outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm"
                  />
                </div>
              </div>
            )}

            {activeTab === 'series' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Gerenciar Episódios</h3>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddEpisode}
                    className="text-[10px] font-black uppercase tracking-widest italic bg-red-600 text-white px-6 py-3 rounded-2xl hover:bg-red-500 transition-all flex items-center gap-3 shadow-lg shadow-red-600/20"
                  >
                    <Plus size={16} /> Novo Episódio
                  </motion.button>
                </div>
                
                <div className="space-y-4 max-h-80 overflow-y-auto pr-4 scrollbar-hide">
                  {episodes.map((ep, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 group hover:bg-white/10 transition-all"
                    >
                      <div className="flex gap-4">
                        <input 
                          type="number" 
                          placeholder="T"
                          value={ep.season}
                          onChange={(e) => handleEpisodeChange(idx, 'season', parseInt(e.target.value))}
                          className="w-16 bg-black/40 text-white px-4 py-3 rounded-xl text-xs font-black italic outline-none border border-white/5 focus:border-red-600/50"
                        />
                        <input 
                          type="number" 
                          placeholder="E"
                          value={ep.episode}
                          onChange={(e) => handleEpisodeChange(idx, 'episode', parseInt(e.target.value))}
                          className="w-16 bg-black/40 text-white px-4 py-3 rounded-xl text-xs font-black italic outline-none border border-white/5 focus:border-red-600/50"
                        />
                        <input 
                          type="text" 
                          placeholder="Título do Episódio"
                          value={ep.title}
                          onChange={(e) => handleEpisodeChange(idx, 'title', e.target.value)}
                          className="flex-1 bg-black/40 text-white px-4 py-3 rounded-xl text-xs font-black italic outline-none border border-white/5 focus:border-red-600/50"
                        />
                        <button onClick={() => handleRemoveEpisode(idx)} className="text-gray-500 hover:text-red-500 p-2 transition-colors">
                          <Trash2 size={20} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Link do Vídeo..."
                        value={ep.videoUrl}
                        onChange={(e) => handleEpisodeChange(idx, 'videoUrl', e.target.value)}
                        className="w-full bg-black/40 text-white px-4 py-3 rounded-xl text-xs font-black italic outline-none border border-white/5 focus:border-red-600/50"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'bulk' && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Importação em Massa</h3>
                  <div className="relative group">
                    <Cloud className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors" size={24} />
                    <input
                      type="text"
                      value={folderUrl}
                      onChange={(e) => setFolderUrl(e.target.value)}
                      placeholder="Link da pasta do Google Drive..."
                      className="w-full bg-white/5 text-white pl-16 pr-6 py-6 rounded-[2rem] outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm"
                    />
                  </div>
                </div>

                {scannerState?.isScanning && (
                  <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-red-600 font-black uppercase tracking-widest text-xs italic animate-pulse">{scannerState.status}</span>
                      <span className="text-white font-black italic">{scannerState.current} / {scannerState.total}</span>
                    </div>
                    <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(scannerState.total > 0 ? scannerState.current / scannerState.total : 0) * 100}%` }}
                        className="h-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]" 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest italic">
                      <span className="text-gray-500">Adicionados: <span className="text-green-500">{scannerState.added}</span></span>
                      <span className="text-gray-500">Pulados: <span className="text-yellow-500">{scannerState.skipped}</span></span>
                    </div>
                    {!isBackground && (
                      <button 
                        onClick={() => {
                          setIsBackground(true);
                          onClose();
                        }}
                        className="w-full py-4 text-[10px] font-black uppercase tracking-widest italic bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl transition-all border border-white/5"
                      >
                        Continuar em segundo plano
                      </button>
                    )}
                  </div>
                )}

                {!scannerState?.isScanning && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBulkAdd('movie')}
                      disabled={!folderUrl.trim()}
                      className="bg-white text-black font-black uppercase tracking-widest italic py-6 rounded-[2rem] hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl"
                    >
                      <Film size={24} /> Escanear Filmes
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBulkAdd('series')}
                      disabled={!folderUrl.trim()}
                      className="bg-red-600 text-white font-black uppercase tracking-widest italic py-6 rounded-[2rem] hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl shadow-red-600/20"
                    >
                      <Tv size={24} /> Escanear Séries
                    </motion.button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'terabox' && (
              <div className="space-y-8">
                <div className="flex bg-white/5 p-2 rounded-[2rem] gap-2">
                  <button 
                    onClick={() => setTeraboxType('movie')}
                    className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${teraboxType === 'movie' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Filme
                  </button>
                  <button 
                    onClick={() => setTeraboxType('series')}
                    className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${teraboxType === 'series' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Série
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Link do TeraBox</h3>
                  <div className="relative group">
                    <Cloud className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors" size={24} />
                    <input
                      type="text"
                      value={teraboxUrl}
                      onChange={(e) => setTeraboxUrl(e.target.value)}
                      placeholder="Cole o link do TeraBox aqui..."
                      className="w-full bg-white/5 text-white pl-16 pr-6 py-6 rounded-[2rem] outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic leading-relaxed px-6">
                    Para funcionar, você precisa converter o link do TeraBox para um link direto (M3U/MP4).
                  </p>
                  <div className="flex gap-4 px-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConvertTeraBox}
                      disabled={isConverting || !teraboxUrl.trim()}
                      className="flex-[2] bg-red-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest italic shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isConverting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                      {isConverting ? 'Convertendo...' : 'Converter Agora'}
                    </motion.button>
                  </div>
                  <div className="flex gap-4 px-6">
                    <a 
                      href="https://www.teraboxdownloader.pro" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest italic border border-white/10 transition-all"
                    >
                      Abrir Conversor 1
                    </a>
                    <a 
                      href="https://terabox-downloader.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest italic border border-white/10 transition-all"
                    >
                      Abrir Conversor 2
                    </a>
                  </div>
                </div>

                {teraboxType === 'series' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Episódios da Série</h3>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddEpisode}
                        className="text-[10px] font-black uppercase tracking-widest italic bg-red-600 text-white px-6 py-3 rounded-2xl hover:bg-red-500 transition-all flex items-center gap-3 shadow-lg shadow-red-600/20"
                      >
                        <Plus size={16} /> Novo Episódio
                      </motion.button>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      <AnimatePresence mode="popLayout">
                        {episodes.map((ep, index) => (
                          <motion.div 
                            key={ep.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 relative group"
                          >
                            <button 
                              onClick={() => setEpisodes(episodes.filter((_, i) => i !== index))}
                              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors p-2"
                            >
                              <Trash2 size={16} />
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Temporada</label>
                                <input
                                  type="number"
                                  value={ep.season}
                                  onChange={(e) => handleEpisodeChange(index, 'season', parseInt(e.target.value))}
                                  className="w-full bg-black/40 text-white px-6 py-4 rounded-2xl outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-xs"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Episódio</label>
                                <input
                                  type="number"
                                  value={ep.episode}
                                  onChange={(e) => handleEpisodeChange(index, 'episode', parseInt(e.target.value))}
                                  className="w-full bg-black/40 text-white px-6 py-4 rounded-2xl outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-xs"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Título do Episódio</label>
                              <input
                                type="text"
                                value={ep.title}
                                onChange={(e) => handleEpisodeChange(index, 'title', e.target.value)}
                                placeholder="Ex: O Início..."
                                className="w-full bg-black/40 text-white px-6 py-4 rounded-2xl outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-xs"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Link do Vídeo</label>
                              <input
                                type="text"
                                value={ep.videoUrl}
                                onChange={(e) => handleEpisodeChange(index, 'videoUrl', e.target.value)}
                                placeholder="Link direto..."
                                className="w-full bg-black/40 text-white px-6 py-4 rounded-2xl outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-xs"
                              />
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] italic">Link Direto Gerado</h3>
                  <div className="relative group">
                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors" size={24} />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Cole o link direto (M3U/MP4) gerado..."
                      className="w-full bg-white/5 text-white pl-16 pr-6 py-6 rounded-[2rem] outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'bulk' && backdrop && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2.5rem] overflow-hidden border border-white/10 relative group"
              >
                <img src={backdrop} alt="Preview" className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8">
                  {logo && (
                    <img src={logo} alt="Logo" className="w-40 object-contain drop-shadow-2xl mb-4" />
                  )}
                  <p className="text-xs text-gray-300 font-medium italic line-clamp-2 max-w-lg">{overview}</p>
                </div>
              </motion.div>
            )}

            {activeTab !== 'bulk' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={activeTab === 'terabox' && teraboxType === 'series' ? handleSaveSeries : handleSave}
                disabled={isSaving || !title.trim() || (activeTab === 'terabox' && teraboxType === 'series' ? episodes.length === 0 : !url.trim())}
                className="w-full bg-red-600 text-white font-black uppercase tracking-widest italic py-6 rounded-[2rem] hover:bg-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-4 shadow-xl shadow-red-600/20"
              >
                {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                {isSaving ? 'Salvando...' : activeTab === 'terabox' ? (teraboxType === 'series' ? 'Adicionar Série TeraBox' : 'Adicionar Filme TeraBox') : 'Adicionar à Biblioteca'}
              </motion.button>
            )}
          </div>
        </div>

        <div className="p-10 bg-black/40 border-t border-white/5 flex items-start gap-4 shrink-0">
          <div className="bg-white/5 p-3 rounded-xl text-gray-500">
            <Info size={20} />
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic leading-relaxed">
            {activeTab === 'bulk' 
              ? "Certifique-se de que a pasta do Drive está com acesso 'Qualquer pessoa com o link'. Nossa IA tentará identificar os títulos automaticamente." 
              : activeTab === 'terabox'
              ? "Cole o link do TeraBox, use um dos conversores acima para obter o link direto e adicione à sua biblioteca."
              : "Use a busca inteligente para preencher automaticamente as capas, logos e sinopses do conteúdo."}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomUrlModal;
