import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, Calendar, Star, Sparkles, Loader2, X, ChevronRight, Play, Info, ThumbsUp, Mic, History, TrendingUp, Cpu, LayoutGrid, Activity, Zap, Map, Ghost, Wand2, Rocket, Shield, Heart, Tv, Eye, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import tmdb, { requests } from '../services/tmdb';
import { Movie } from '../types';
import { CATEGORIES } from '../constants';

interface AdvancedSearchProps {
  onSelectMovie: (movie: Movie) => void;
  myMovies: Movie[];
  moviesByGenre: Record<string, Movie[]>;
  dynamicFranchises: any[];
  onSelectFranchise: (franchise: any) => void;
  categories?: any[];
}

const AdvancedSearch = React.memo(({ onSelectMovie, myMovies, moviesByGenre, dynamicFranchises, onSelectFranchise, categories = CATEGORIES }: AdvancedSearchProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [localResults, setLocalResults] = useState<Movie[]>([]);
  const [externalResults, setExternalResults] = useState<Movie[]>([]);
  const [franchiseResults, setFranchiseResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [history] = useState(['Oppenheimer', 'Marvel', 'Terror', 'Ficção']);
  const [year, setYear] = useState<string>('');
  const [minRating, setMinRating] = useState<number>(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const popularTags = ['Novidades', 'Top 10', 'Oscar 2024', 'Marvel', 'DC', 'Dublados'];

  // Helper to normalize and match titles with year
  const getMovieKey = (movie: any) => {
    const title = (movie.title || movie.name || '').toLowerCase().trim();
    const releaseYear = (movie.release_date || movie.first_air_date || '').substring(0, 4);
    return `${title}-${releaseYear}`;
  };

  // Debounce the query for external TMDB & AI requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 600);
    return () => clearTimeout(handler);
  }, [query]);

  // Synchronous Local Filter on Every Keystroke
  useEffect(() => {
    if (!query) {
      setLocalResults([]);
      setFranchiseResults([]);
      return;
    }
    const queryLower = query.toLowerCase();
    
    const lMatches = myMovies.filter(m => 
      (m.title || m.name || "").toLowerCase().includes(queryLower) ||
      (m.genres || "").toLowerCase().includes(queryLower)
    );
    setLocalResults(lMatches);

    const fMatches = dynamicFranchises.filter(f => 
      f.name.toLowerCase().includes(queryLower)
    );
    setFranchiseResults(fMatches);
  }, [query, myMovies, dynamicFranchises]);

  // External Fetching mapping directly to debouncedQuery (600ms)
  useEffect(() => {
    const fetchExternal = async () => {
      // Clear external results if query is empty
      if (!debouncedQuery && selectedGenres.length === 0) {
        setExternalResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let tmdbResults: any[] = [];
        const activeQuery = debouncedQuery;
        if (!activeQuery) return;
        
        const queryLower = activeQuery.toLowerCase();
        let endpoint = requests.searchMulti;
        let searchParamsTMDB: any = { query: activeQuery, language: 'pt-BR' };

        // Quick Command Logic
        if (queryLower === 'novidades') {
          endpoint = '/movie/now_playing';
          searchParamsTMDB = { language: 'pt-BR' };
        } else if (queryLower === 'top 10' || queryLower === 'em alta') {
          endpoint = '/trending/all/week';
          searchParamsTMDB = { language: 'pt-BR' };
        } else if (queryLower === 'marvel') {
          endpoint = '/discover/movie';
          searchParamsTMDB = { with_companies: 420, sort_by: 'popularity.desc', language: 'pt-BR' };
        } else if (queryLower === 'dc') {
          endpoint = '/discover/movie';
          searchParamsTMDB = { with_companies: 128064, sort_by: 'popularity.desc', language: 'pt-BR' };
        } else if (queryLower === 'oscar 2024') {
          endpoint = '/discover/movie';
          searchParamsTMDB = { primary_release_year: 2023, sort_by: 'vote_average.desc', 'vote_count.gte': 1000, language: 'pt-BR' };
        } else if (queryLower === 'dublados') {
           endpoint = '/discover/movie';
           searchParamsTMDB = { with_original_language: 'pt', sort_by: 'popularity.desc', language: 'pt-BR' };
        }

        const { data } = await tmdb.get(endpoint, { params: searchParamsTMDB });
        tmdbResults = data.results?.filter((r: any) => r.media_type !== 'person') || [];

        let filteredTmdb = tmdbResults.map((r: any) => ({
            ...r,
            title: r.title || r.name,
            media_type: r.media_type || (r.title ? 'movie' : 'tv'),
            _isTmdb: true
        })).filter((r: any) => {
            const matchesRating = !minRating || (r.vote_average >= minRating);
            const matchesYear = !year || (r.release_date || r.first_air_date || "").includes(year);
            return matchesRating && matchesYear;
        });

        setExternalResults(filteredTmdb);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExternal();
  }, [debouncedQuery, minRating, year, selectedGenres]);

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setLocalResults([]);
    setExternalResults([]);
    setFranchiseResults([]);
    setSearchParams({}, { replace: true });
  };

  const setSyncQuery = (q: string) => {
     setQuery(q);
     setDebouncedQuery(q);
     setSearchParams({ q }, { replace: true });
  };

  // Synchronize internal query with URL params for consistency
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null && qParam !== query) {
      setQuery(qParam);
    }
  }, [searchParams]);

  // Deduplicate merged results for final render
  const mergedDisplayResults = useMemo(() => {
     // Combine synchronous local results using Title+Year
     const localsMap = new globalThis.Map<string, Movie>();
     localResults.forEach(loc => {
        localsMap.set(getMovieKey(loc), loc);
     });
     
     const externals: any[] = [];
     
     externalResults.forEach((ext: any) => {
        const extKey = getMovieKey(ext);
        // Check if this TMDB match ALREADY exists in the ENTIRE library
        const existingInLibrary = myMovies.find(m => m.id === ext.id || getMovieKey(m) === extKey);
        
        if (existingInLibrary) {
          // If we already own it, but our local text search missed it, add it to localsMap!
          if (!localsMap.has(extKey)) {
             localsMap.set(extKey, existingInLibrary);
          }
        } else {
          // Truly an external suggestion
          // Ensure we don't duplicate suggestions
          if (!externals.some(e => e.id === ext.id || getMovieKey(e) === extKey)) {
            externals.push(ext);
          }
        }
     });

     const locals = Array.from(localsMap.values());
     
     // Annotate the arrays to easily render badges
     const annotatedLocals = locals.map((m: any) => ({ ...(m as any), _isLocal: true }));
     const annotatedExternals = externals.map((m: any) => ({ ...(m as any), _isLocal: false }));
     
     return [...annotatedLocals, ...annotatedExternals];
  }, [localResults, externalResults, myMovies]);


  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 font-space overflow-x-hidden">
      {/* 🔮 SEARCH PORTAL - AT THE TOP */}
      <div className="sticky top-0 z-[60] bg-black/80 backdrop-blur-3xl border-b border-white/5 py-6 md:py-10 px-5 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-6">
          <div className="w-full relative group">
            <div className="relative flex items-center bg-[#111] border-2 border-white/5 focus-within:border-red-600 rounded-2xl md:rounded-[2rem] p-1.5 transition-colors shadow-2xl group-hover:bg-[#151515]">
              <div className="flex gap-1 md:gap-2 mr-1">
                <div className="px-3 md:px-5 py-2.5 rounded-xl md:rounded-2xl font-black text-[7px] md:text-[9px] uppercase tracking-widest flex items-center gap-1.5 bg-gray-600 text-white">
                  <Search size={12} /> Busca
                </div>
              </div>

              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={"O que vamos explorar hoje?..."}
                className="flex-1 bg-transparent py-3 px-2 md:px-4 text-xs md:text-lg font-bold outline-none placeholder-gray-700"
              />

              <div className="flex items-center gap-1 md:gap-2 ml-2">
                {query && (
                  <button onClick={clearSearch} className="p-2 hover:text-red-500 transition-colors">
                    <X size={18} />
                  </button>
                )}
                <div className="p-3 md:p-4 bg-red-600 rounded-xl md:rounded-2xl text-white shadow-xl shadow-red-600/20">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                </div>
              </div>
            </div>
            
            {/* Quick Filters/Tags */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 mt-4">
              {popularTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setSyncQuery(tag)}
                  className={`whitespace-nowrap px-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${query === tag ? 'text-red-500 border-red-500/50 bg-red-500/5' : 'text-gray-500 hover:text-white'}`}
                >
                  {tag}
                </button>
              ))}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="whitespace-nowrap px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 flex items-center gap-2"
              >
                <Filter size={10} /> Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 md:px-20 max-w-[1920px] mx-auto mt-12 min-h-[400px]">
         {mergedDisplayResults.length > 0 || franchiseResults.length > 0 ? (
            <div className="space-y-24">
               {franchiseResults.length > 0 && (
                  <div className="space-y-12">
                     <h3 className="text-2xl md:text-5xl font-black uppercase italic tracking-tighter">Sagas & Universos</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {franchiseResults.map(f => (
                          <div 
                            key={f.id}
                            onClick={() => {
                              onSelectFranchise(f);
                              navigate(`/universe/${f.id}`);
                            }}
                            className="h-64 rounded-[2rem] overflow-hidden group cursor-pointer border border-white/5 relative"
                          >
                             <img src={f.backdrop} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000" referrerPolicy="no-referrer" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent p-10 flex flex-col justify-end">
                                <span className="text-red-600 font-black text-[10px] uppercase tracking-[0.4em] mb-2">Dados de Origem</span>
                                <h4 className="text-white font-black text-3xl uppercase italic tracking-tighter leading-none">{f.name}</h4>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               )}

               {mergedDisplayResults.length > 0 && (
                 <div className="space-y-12 pb-20">
                    <div className="flex items-center justify-between">
                       <h3 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter border-l-4 border-red-600 pl-6">Arquivos Detectados</h3>
                       <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{mergedDisplayResults.length} Títulos</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                       {mergedDisplayResults.map((m: any, idx) => (
                         <motion.div 
                           key={`${m.id}-${m._isLocal ? 'local' : 'ext'}`}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                           className="group cursor-pointer relative"
                           onClick={() => onSelectMovie(m)}
                         >
                            <div className={`aspect-[2/3] rounded-2xl md:rounded-3xl overflow-hidden relative shadow-2xl transition-all ${m._isLocal ? 'border-2 border-red-600/30 group-hover:border-red-600' : 'border border-white/5 group-hover:border-white/20'}`}>
                               <img 
                                 src={m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w500/${m.poster_path}`) : "https://via.placeholder.com/500x750?text=Sem+Poster"} 
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                 referrerPolicy="no-referrer"
                                 loading="lazy"
                               />
                               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                                  <span className="text-red-600 font-black text-[10px] mb-2">{m.vote_average?.toFixed(1) || '-'} ★</span>
                                  <h4 className="text-white font-black text-sm md:text-lg uppercase leading-none truncate">{m.title}</h4>
                               </div>
                               
                               {/* MOBILE OPTIMIZED BADGES */}
                               {m._isLocal ? (
                                  <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1.5 md:gap-2 bg-red-600 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-red-500 shadow-lg shadow-red-600/30 z-10">
                                     <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] animate-pulse" />
                                     <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-white leading-none mt-0.5" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Na Biblioteca</span>
                                  </div>
                               ) : (
                                  <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1 md:gap-1.5 bg-black/80 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-white/10 opacity-85 z-10">
                                     <Star size={8} className="text-yellow-400 md:w-2.5 md:h-2.5" />
                                     <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-gray-200 leading-none mt-0.5">Sugestão</span>
                                  </div>
                               )}
                            </div>
                         </motion.div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
         ) : query && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
               <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 md:w-40 md:h-40 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10"
               >
                  <Search size={48} className="text-gray-700" />
               </motion.div>
               <h3 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">Nada Encontrado</h3>
               <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs max-w-md">O multiverso é vasto, mas não localizamos esse título. Tente mudar os filtros para uma busca mais assertiva.</p>
               <button onClick={clearSearch} className="mt-10 px-10 py-4 bg-red-600 rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-110 transition-transform">Limpar Busca</button>
            </div>
         ) : (
            <div className="space-y-32 mt-[-20px]">
               {/* 🚀 CATEGORIES CAROUSEL SYSTEM */}
               <section className="space-y-10 group">
                  <div className="flex items-center justify-between">
                     <h3 className="text-2xl md:text-5xl font-black uppercase italic tracking-tighter">Explorar por Gênero</h3>
                     <div className="hidden md:flex gap-2">
                        <div className="w-8 h-1 bg-red-600 rounded-full" />
                        <div className="w-4 h-1 bg-white/10 rounded-full" />
                        <div className="w-4 h-1 bg-white/10 rounded-full" />
                     </div>
                  </div>
                  
                  <div className="flex overflow-x-auto no-scrollbar gap-4 md:gap-12 pb-12 snap-x">
                     {categories.map(cat => (
                       <motion.div 
                         key={cat.id}
                         whileHover={{ y: -10, scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => navigate(`/genre/${cat.name}`)}
                         className="relative min-w-[320px] md:min-w-[550px] aspect-video rounded-[2.5rem] md:rounded-[4rem] overflow-hidden group/card cursor-pointer border border-white/5 bg-[#0a0a0a] snap-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all"
                       >
                          <img 
                            src={cat.backdrop} 
                            className="w-full h-full object-cover transition-all duration-1000 opacity-60 group-hover/card:scale-110 group-hover/card:opacity-100" 
                            referrerPolicy="no-referrer" 
                            alt={cat.name}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-8 md:p-14 flex flex-col justify-end">
                             <div className="mb-6 w-14 h-14 md:w-20 md:h-20 bg-white/10 backdrop-blur-3xl rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center border border-white/10 group-hover/card:bg-red-600 group-hover/card:border-red-400/50 transition-all shadow-2xl">
                                <cat.icon size={window.innerWidth < 768 ? 24 : 36} className="text-white" />
                             </div>
                             <h4 className="text-white font-black uppercase text-2xl md:text-[4rem] tracking-tighter italic mb-4 leading-[0.8] drop-shadow-2xl">{cat.name}</h4>
                             <div className="flex items-center gap-6">
                                <span className="text-gray-300 font-bold text-[10px] md:text-sm uppercase tracking-[0.3em] italic">Explorar Nexus</span>
                                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                   <div className="h-full w-[10%] bg-red-600 group-hover/card:w-full transition-all duration-1000 ease-in-out" />
                                </div>
                                <ChevronRight size={20} className="text-white/40 group-hover:text-red-500 transition-colors" />
                             </div>
                          </div>
                          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                       </motion.div>
                     ))}
                  </div>
               </section>

               {/* 🕒 RECENT HISTORY (MOBILE STYLE) */}
               <section className="bg-white/5 rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-20 border border-white/5">
                  <div className="flex items-center gap-6 mb-12">
                     <History className="text-red-600" size={32} />
                     <h3 className="text-2xl md:text-5xl font-black uppercase italic tracking-tighter">Histórico de Missão</h3>
                  </div>
                  <div className="space-y-6">
                     {history.map(item => (
                       <div 
                         key={item}
                         onClick={() => setSyncQuery(item)}
                         className="flex items-center justify-between p-6 bg-black/40 border border-white/5 rounded-2xl md:rounded-3xl cursor-pointer hover:bg-white/5 group"
                       >
                          <span className="text-gray-400 font-black uppercase text-[10px] md:text-sm tracking-widest group-hover:text-white transition-colors">{item}</span>
                          <ChevronRight size={18} className="text-gray-600 group-hover:text-red-600 transition-colors" />
                       </div>
                     ))}
                  </div>
               </section>

               {/* 📊 TRENDING BENTO */}
               <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-gradient-to-br from-red-900/20 to-transparent p-12 rounded-[3rem] border border-red-900/10 flex flex-col justify-between">
                     <TrendingUp className="text-red-600 mb-10" size={40} />
                     <h4 className="text-white font-black text-3xl uppercase italic tracking-tighter leading-none">Bombando Agora</h4>
                     <p className="text-gray-500 font-bold text-xs mt-4 uppercase tracking-widest">Gêneros de Ação e Aventura estão vendo um aumento de 40% nas solicitações de busca.</p>
                  </div>
                  <div className="md:col-span-2 bg-[#111] p-12 rounded-[3rem] border border-white/5 flex flex-col md:flex-row gap-10">
                     <div className="flex-1">
                        <h4 className="text-white font-black text-3xl md:text-5xl uppercase italic tracking-tighter mb-6 leading-none">Filtragem Avançada</h4>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-relaxed mb-8">Acesse nossa suíte completa de filtros para refinar sua busca por ano, avaliação e duração com precisão cirúrgica.</p>
                        <button onClick={() => setShowFilters(!showFilters)} className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px]">Abrir Filtros</button>
                     </div>
                     <div className="shrink-0 w-32 md:w-48 h-32 md:h-48 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                        <Activity size={48} className="text-red-600" />
                     </div>
                  </div>
               </section>
            </div>
         )}
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
});

export default AdvancedSearch;
