import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  ChevronLeft, Play, Info, Sparkles, Zap, Shield, History, Ghost, 
  Star, Calendar, Users, Trophy, Search, Filter, TrendingUp, 
  Clock, CheckCircle2, LayoutGrid, List, ArrowRight, Share2, 
  Heart, Download, Activity, Globe, Cpu, Rocket, Hash
} from 'lucide-react';
import { Movie } from '../types';
import Row from './Row';

interface UniverseViewProps {
  franchise: any;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  onToggleMyList: (movie: Movie) => void;
  onToggleFavorite: (movie: Movie) => void;
  myListIds: Set<number>;
  favoriteIds: Set<number>;
}

const UniverseView: React.FC<UniverseViewProps> = React.memo(({ 
  franchise, 
  onClose, 
  onSelectMovie, 
  onToggleMyList, 
  onToggleFavorite,
  myListIds,
  favoriteIds
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'story' | 'stats'>('overview');
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [searchInUniverse, setSearchInUniverse] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerOrder, setBannerOrder] = useState<'chronological' | 'latest'>('chronological');
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.2]);
  const contentY = useTransform(scrollY, [0, 400], [0, -100]);

  useEffect(() => {
    const timer = setTimeout(() => setIsIntroComplete(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // History Banner rotation
  useEffect(() => {
    if (activeTab !== 'overview' || !franchise.movies.length) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % Math.min(franchise.movies.length, 10));
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTab, franchise.movies.length]);

  // Categorize movies within the universe
  const categorizedMovies = useMemo(() => {
    let movies = [...franchise.movies] as Movie[];
    
    if (searchInUniverse) {
      movies = movies.filter(m => 
        (m.title || "").toLowerCase().includes(searchInUniverse.toLowerCase()) ||
        (m.overview || "").toLowerCase().includes(searchInUniverse.toLowerCase())
      );
    }

    return {
      chronological: [...movies].sort((a, b) => {
        // Usa o ano de lançamento para ordem cronológica. Na vida real, a API precisaria fornecer a cronologia real (ex: Capitã Marvel antes de Homem de Ferro).
        return (a.release_year || 0) - (b.release_year || 0);
      }),
      highestRated: [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
      latest: [...movies].sort((a, b) => {
        const dateA = a.release_date || "";
        const dateB = b.release_date || "";
        return dateA.localeCompare(dateB); // Ascending order
      })
    };
  }, [franchise.movies, searchInUniverse]);

  const featuredMovie = bannerOrder === 'chronological' 
    ? categorizedMovies.chronological[bannerIndex] || categorizedMovies.chronological[0]
    : categorizedMovies.latest[bannerIndex] || categorizedMovies.latest[0];

  // Advanced stats calculation
  const stats = useMemo(() => {
    const movies = franchise.movies as Movie[];
    const totalRuntime = movies.reduce((acc, m) => acc + (m.runtime || 0), 0);
    const avgRating = movies.reduce((acc, m) => acc + (m.rating || 0), 0) / movies.length;
    const years = movies.map(m => m.release_year || 0).filter(y => y > 0);
    const yearRange = years.length > 0 ? `${Math.min(...years)} - ${Math.max(...years)}` : 'N/A';
    
    return {
      totalRuntime,
      avgRating,
      yearRange,
      count: movies.length,
      hours: Math.floor(totalRuntime / 60),
      minutes: totalRuntime % 60
    };
  }, [franchise.movies]);

  const TABS = [
    { id: 'overview', label: 'Início', icon: Globe },
    { id: 'story', label: 'A Saga', icon: Sparkles },
    { id: 'timeline', label: 'Eventos', icon: History },
    { id: 'stats', label: 'Dados', icon: Cpu },
  ];

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      <AnimatePresence>
        {!isIntroComplete && (
          <motion.div 
            key="universe-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center p-10 overflow-hidden"
          >
            {/* Optimized Background Glow */}
            <div 
              className={`absolute inset-0 opacity-10`}
              style={{ background: `radial-gradient(circle, ${franchise.color || '#ff0000'} 0%, transparent 70%)` }}
            />

            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 100,
                damping: 20
              }}
              className="flex flex-col items-center relative z-10"
            >
              <div className="relative mb-12">
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                   className="absolute -inset-12 border-2 border-dashed border-white/5 rounded-full"
                />
                {franchise.logo ? (
                  <motion.img 
                    initial={{ filter: 'brightness(0)' }}
                    animate={{ filter: 'brightness(1)' }}
                    transition={{ duration: 1.5 }}
                    src={franchise.logo} 
                    className="h-20 md:h-32 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <h1 className="text-4xl md:text-6xl font-black text-white italic uppercase tracking-[0.25em] drop-shadow-2xl">{franchise.name}</h1>
                )}
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2, ease: "easeInOut" }}
                    className="absolute inset-0 bg-red-600 shadow-[0_0_20px_rgba(220,38,38,1)]"
                  />
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                   <span className="text-[9px] font-black uppercase tracking-[0.6em] text-white/50">Carregando Multiverso</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`absolute inset-0 ${franchise.bg || 'bg-[#050505]'} overflow-y-auto custom-scrollbar scroll-smooth`}
      >
        {/* Cinematic Backdrop Overlay */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute inset-0 bg-black" />
          <AnimatePresence mode="wait">
            <motion.div 
              key={`bg-${featuredMovie?.id || 'default'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              style={{ scale: heroScale }}
              className="absolute inset-0"
            >
              <img 
                src={franchise.backdrop || featuredMovie?.backdrop_path || featuredMovie?.poster_path} 
                className="w-full h-full object-cover blur-[2px] scale-110" 
                referrerPolicy="no-referrer"
                alt=""
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
              <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#050505]`} />
            </motion.div>
          </AnimatePresence>
          
          {/* Optimized Ambient Lights */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
            <div 
              className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%]`}
              style={{ background: `radial-gradient(circle at top left, ${franchise.color}, transparent 70%)` }}
            />
            <div 
              className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%]"
              style={{ background: `radial-gradient(circle at bottom right, rgba(37,99,235,0.4), transparent 70%)` }}
            />
          </div>
        </div>

        {/* Global Navigation */}
        <nav className="sticky top-0 left-0 right-0 z-[250] px-4 md:px-12 py-3 md:py-4 flex items-center justify-between backdrop-blur-3xl bg-black/40 border-b border-white/5">
          <motion.button 
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-white group"
          >
            <ChevronLeft size={18} className="group-hover:text-red-600 transition-colors" />
            <span className="font-black uppercase tracking-widest text-[8px] italic hidden sm:block">Sair</span>
          </motion.button>

          <div className="flex flex-col items-center">
            {franchise.logo ? (
              <img src={franchise.logo} className="h-6 md:h-10 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <span className={`text-xl font-black uppercase italic tracking-tighter ${franchise.accent}`}>{franchise.name}</span>
            )}
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center bg-black/40 border border-white/5 rounded-full px-4 py-2 focus-within:border-red-600 transition-all">
                <Search size={16} className="text-gray-500 mr-2" />
                <input 
                  type="text" 
                  value={searchInUniverse}
                  onChange={(e) => setSearchInUniverse(e.target.value)}
                  placeholder="Buscar na saga..." 
                  className="bg-transparent text-xs font-bold outline-none w-48 placeholder-gray-700"
                />
             </div>
             <motion.button 
               whileHover={{ scale: 1.1 }}
               className="p-3 bg-white/5 rounded-full border border-white/10"
             >
               <Share2 size={18} className="text-white" />
             </motion.button>
          </div>
        </nav>

        {/* Hero Experience */}
        <header className="relative min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-32 px-6 overflow-hidden">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.6, duration: 1 }}
            className="max-w-5xl w-full text-center"
          >
            {franchise.icon && (
               <div className="mb-10 inline-block p-8 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 relative group">
                  <div className={`absolute inset-0 bg-white/5 rounded-[3rem] blur-2xl group-hover:blur-3xl transition-all`}></div>
                  <franchise.icon size={80} className={`${franchise.accent} relative z-10 animate-float`} />
               </div>
            )}
            
            {franchise.logo ? (
              <motion.img 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7 }}
                src={franchise.logo} 
                className="h-16 md:h-36 object-contain mb-6 md:mb-10 drop-shadow-[0_15px_40px_rgba(0,0,0,1)] relative z-10" 
                referrerPolicy="no-referrer"
                alt={franchise.name}
              />
            ) : (
              <h1 className="text-3xl md:text-[8rem] font-black italic uppercase tracking-tighter text-white mb-6 md:mb-10 leading-[0.8] drop-shadow-2xl">
                 {franchise.name}
              </h1>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 md:mt-0">
               <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <Activity size={14} className="text-red-600" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{stats.count} Títulos</span>
               </div>
               <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <Clock size={14} className="text-blue-500" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{stats.hours}h {stats.minutes}m</span>
               </div>
               <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <Star size={14} className="text-yellow-400" fill="#facc15" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{stats.avgRating.toFixed(1)} Score</span>
               </div>
            </div>

            {franchise.movies.length > 1 && (
              <div className="mt-8 mb-8 bg-black/40 p-4 md:p-8 rounded-[2rem] border border-white/5 backdrop-blur-md max-w-5xl mx-auto relative z-10 w-full shadow-2xl">
                <div className="flex flex-col xl:flex-row items-center gap-8">
                   {/* Movie Poster Carousel Effect */}
                   <div className="w-48 xl:w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10 relative cursor-pointer" onClick={() => onSelectMovie(featuredMovie)}>
                     <AnimatePresence mode="wait">
                       <motion.img 
                         key={`poster-${featuredMovie?.id}`}
                         initial={{ opacity: 0, scale: 1.1 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.9 }}
                         transition={{ duration: 0.5 }}
                         src={featuredMovie?.poster_path?.startsWith('http') ? featuredMovie?.poster_path : `https://image.tmdb.org/t/p/w500/${featuredMovie?.poster_path}`}
                         className="w-full h-full object-cover"
                         referrerPolicy="no-referrer"
                         alt={featuredMovie?.title}
                       />
                     </AnimatePresence>
                   </div>
                   
                   <div className="flex-1 flex flex-col justify-center text-left w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-6 gap-4">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-red-500 italic">
                              Em Destaque
                            </span>
                         </div>
                         <div className="flex bg-white/5 rounded-full p-1 border border-white/10 self-start sm:self-auto">
                            <button 
                              onClick={() => { setBannerOrder('chronological'); setBannerIndex(0); }}
                              className={`text-[8px] md:text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-full transition-all ${bannerOrder === 'chronological' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                              Cronologia
                            </button>
                            <button 
                              onClick={() => { setBannerOrder('latest'); setBannerIndex(0); }}
                              className={`text-[8px] md:text-[10px] uppercase font-black tracking-widest px-4 py-1.5 rounded-full transition-all ${bannerOrder === 'latest' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                              Lançamento
                            </button>
                         </div>
                      </div>
                      
                      <h3 className="text-2xl md:text-4xl font-black text-white italic drop-shadow-lg leading-tight mb-4">
                        <span className="text-red-600 mr-2">{bannerIndex + 1}.</span> 
                        {featuredMovie?.title || featuredMovie?.name} 
                        <span className="text-gray-500 text-xl md:text-2xl ml-2">({featuredMovie?.release_year})</span>
                      </h3>

                      <p className="text-sm md:text-base text-gray-400 font-medium italic leading-relaxed mb-8 line-clamp-3 md:line-clamp-4">
                        {featuredMovie?.overview || franchise.description || "Inicie uma jornada sem precedentes através das camadas narrativas deste universo épico."}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        {(bannerOrder === 'chronological' ? categorizedMovies.chronological : categorizedMovies.latest).slice(0, 10).map((_: any, i: number) => (
                          <button 
                            key={`dot-${i}`} 
                            onClick={() => setBannerIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${i === bannerIndex ? 'w-8 md:w-12 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'w-2 bg-white/20 hover:bg-white/40'}`} 
                          />
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            )}

            {franchise.movies.length <= 1 && (
              <div className="mt-8 mb-8">
                <p className="text-sm md:text-xl text-gray-400 font-medium italic max-w-3xl mx-auto leading-relaxed mb-8 px-4 text-center">
                  {featuredMovie?.overview || franchise.description || "Inicie uma jornada sem precedentes através das camadas narrativas deste universo épico."}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6">
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectMovie(featuredMovie)}
                className="px-12 py-5 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.4em] text-[10px] md:text-xs flex items-center gap-4 shadow-2xl shadow-white/10"
              >
                <Rocket size={20} className="text-red-600" /> Iniciar Experiência
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-5 bg-black/40 backdrop-blur-3xl text-white border-2 border-white/10 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[10px] md:text-xs flex items-center gap-4 shadow-2xl group"
              >
                <List size={20} className="group-hover:text-red-600 transition-colors" /> Marcar Saga
              </motion.button>
            </div>
          </motion.div>
        </header>

        {/* Floating Tab Dock */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] w-[95%] sm:w-auto sm:min-w-[400px]">
           <div className="bg-black/80 backdrop-blur-3xl p-1.5 md:p-2 rounded-full border border-white/10 flex gap-1 md:gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-3 rounded-full transition-all relative group flex items-center justify-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  {activeTab === tab.id && (
                     <motion.div 
                        layoutId="active-universe-tab"
                        className="absolute inset-0 bg-red-600 rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     />
                  )}
                  <tab.icon size={16} className={`relative z-10 ${activeTab === tab.id ? 'text-white' : 'group-hover:text-red-400 transition-colors'}`} />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest relative z-10 hidden sm:block">{tab.label}</span>
                </button>
              ))}
           </div>
        </div>

        <motion.div 
          style={{ y: contentY }}
          className="relative z-[20] pb-40"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="tab-overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-32"
              >
                {/* Sections */}
                <div className="space-y-4">
                  <div className="px-6 md:px-12 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <History className="text-blue-500" size={32} />
                       <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic">Ordem Cronológica (História)</h3>
                    </div>
                  </div>
                  <Row 
                    title="" 
                    movies={categorizedMovies.chronological} 
                    onSelectMovie={onSelectMovie} 
                    onToggleMyList={onToggleMyList} 
                    onToggleFavorite={onToggleFavorite} 
                    myListIds={myListIds} 
                    favoriteIds={favoriteIds} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="px-6 md:px-12 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <Globe className="text-red-500" size={32} />
                       <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic">Ordem de Lançamento</h3>
                    </div>
                  </div>
                  <Row 
                    title="" 
                    movies={categorizedMovies.latest} 
                    isLargeRow={true} 
                    onSelectMovie={onSelectMovie} 
                    onToggleMyList={onToggleMyList} 
                    onToggleFavorite={onToggleFavorite} 
                    myListIds={myListIds} 
                    favoriteIds={favoriteIds} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="px-6 md:px-12 flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                       <Trophy className="text-yellow-500" size={32} />
                       <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic">Elite da Crítica</h3>
                    </div>
                    <Star className="text-yellow-500 animate-pulse" size={32} fill="currentColor" />
                  </div>
                  <Row 
                    title="" 
                    movies={categorizedMovies.highestRated.slice(0, 10)} 
                    onSelectMovie={onSelectMovie} 
                    onToggleMyList={onToggleMyList} 
                    onToggleFavorite={onToggleFavorite} 
                    myListIds={myListIds} 
                    favoriteIds={favoriteIds} 
                  />
                </div>

                {/* Interactive Universe Spec Grid */}
                <div className="px-6 md:px-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                      <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 group hover:border-red-600/30 transition-all">
                         <Globe className="text-red-500 mb-6" size={32} />
                         <h4 className="text-white font-black text-xl uppercase italic mb-2">Alcance Global</h4>
                         <p className="text-gray-500 text-xs font-bold leading-relaxed">Disponível em 180+ países com suporte neural 4K HDR.</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 group hover:border-blue-500/30 transition-all">
                         <Shield className="text-blue-500 mb-6" size={32} />
                         <h4 className="text-white font-black text-xl uppercase italic mb-2">Original Studio</h4>
                         <p className="text-gray-500 text-xs font-bold leading-relaxed">Conteúdo verificado e restaurado para qualidade máster digital.</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 group hover:border-purple-500/30 transition-all">
                         <Zap className="text-purple-500 mb-6" size={32} />
                         <h4 className="text-white font-black text-xl uppercase italic mb-2">Carga Instantânea</h4>
                         <p className="text-gray-500 text-xs font-bold leading-relaxed">Streaming otimizado via rede de borda NetPremium Core.</p>
                      </div>
                      <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 group hover:border-green-500/30 transition-all">
                         <Ghost className="text-green-500 mb-6" size={32} />
                         <h4 className="text-white font-black text-xl uppercase italic mb-2">Imersão Total</h4>
                         <p className="text-gray-500 text-xs font-bold leading-relaxed">Áudio espacial 360 e presets de cor originais da direção.</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="px-6 md:px-12 flex items-center gap-5">
                     <Calendar className="text-blue-400" size={32} />
                     <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic">Primeiros Passos</h3>
                  </div>
                  <Row 
                    title="" 
                    movies={categorizedMovies.chronological.slice(0, 8)} 
                    onSelectMovie={onSelectMovie} 
                    onToggleMyList={onToggleMyList} 
                    onToggleFavorite={onToggleFavorite} 
                    myListIds={myListIds} 
                    favoriteIds={favoriteIds} 
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'story' && (
              <motion.div 
                key="tab-story"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="px-6 md:px-12 max-w-5xl mx-auto space-y-24"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-8">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-1 bg-red-600"></div>
                        <span className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px]">A Gênese da Saga</span>
                     </div>
                     <h3 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-tight">
                        Uma História em <span className={franchise.accent}>Expansão Constante</span>
                     </h3>
                     <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed italic">
                        {franchise.description}
                     </p>
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <span className="text-gray-600 font-black text-[10px] uppercase tracking-widest text-[10px]">Primeiro Lançamento</span>
                           <p className="text-white font-bold text-xl uppercase italic">{categorizedMovies.chronological[0]?.release_year || '---'}</p>
                        </div>
                        <div className="space-y-2">
                           <span className="text-gray-600 font-black text-[10px] uppercase tracking-widest text-[10px]">Última Atualização</span>
                           <p className="text-white font-bold text-xl uppercase italic">{categorizedMovies.latest[0]?.release_year || '---'}</p>
                        </div>
                     </div>
                  </div>
                  <div className="relative group">
                     <div className="absolute -inset-4 bg-white/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                        <img 
                          src={franchise.backdrop || featuredMovie?.backdrop_path} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        <div className="absolute bottom-8 left-8 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
                           <Info size={16} className={franchise.accent} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Snapshot de Arquivo #01</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-3xl p-12 md:p-20 rounded-[4rem] border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full"></div>
                   <div className="relative z-10 space-y-12">
                      <div className="text-center max-w-3xl mx-auto space-y-4">
                         <h4 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter">O Impacto Cultural</h4>
                         <p className="text-gray-500 font-medium italic">A saga de {franchise.name} não é apenas cinema; é uma revolução visual que redefiniu o gênero e inspirou milhões ao redor do globo.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                         <div className="space-y-4">
                            <Hash className={franchise.accent} size={24} />
                            <h5 className="text-white font-black uppercase italic text-xl">Legado Visual</h5>
                            <p className="text-gray-600 text-sm leading-relaxed italic">Efeitos práticos e visuais que desafiaram as leis da física em sua época.</p>
                         </div>
                         <div className="space-y-4">
                            <Users className={franchise.accent} size={24} />
                            <h5 className="text-white font-black uppercase italic text-xl">Comunidade Global</h5>
                            <p className="text-gray-600 text-sm leading-relaxed italic">Uma "fanbase" dedicada que mantém a chama da saga viva através de gerações.</p>
                         </div>
                         <div className="space-y-4">
                            <Trophy className={franchise.accent} size={24} />
                            <h5 className="text-white font-black uppercase italic text-xl">Reconhecimento</h5>
                            <p className="text-gray-600 text-sm leading-relaxed italic">Inúmeros prêmios e recordes de bilheteria que atestam sua grandeza.</p>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div 
                key="tab-timeline"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-6 md:px-12 max-w-4xl mx-auto"
              >
                <div className="relative border-l-2 border-white/5 pl-12 space-y-24 py-10">
                  {categorizedMovies.chronological.map((movie, idx) => (
                    <motion.div 
                      key={movie.id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="relative group cursor-pointer"
                      onClick={() => onSelectMovie(movie)}
                    >
                      <div className="absolute -left-[58px] top-6 w-4 h-4 rounded-full bg-black border-2 border-red-600 z-10 group-hover:scale-150 transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                      
                      <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 p-8 md:p-12 flex flex-col md:flex-row gap-8 hover:bg-white/10 transition-all">
                         <div className="w-full md:w-48 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-2xl">
                           <img 
                            src={movie.poster_path ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`) : ""} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            referrerPolicy="no-referrer"
                            alt={movie.title}
                           />
                         </div>
                         <div className="flex-1 flex flex-col justify-center">
                            <span className="text-red-600 font-black italic tracking-widest text-[10px] uppercase mb-2">Evento #{idx + 1} • {movie.release_year}</span>
                            <h4 className="text-white font-black text-2xl md:text-3xl uppercase tracking-tighter mb-4 italic leading-tight group-hover:text-red-500 transition-colors">{movie.title}</h4>
                            <p className="text-gray-500 text-sm font-medium line-clamp-3 leading-relaxed mb-6 italic">{movie.overview}</p>
                            <div className="flex items-center gap-6">
                               <div className="flex items-center gap-2">
                                  <Star size={14} className="text-yellow-400" fill="currentColor" />
                                  <span className="text-xs font-black text-white">{movie.rating?.toFixed(1)}</span>
                               </div>
                               <div className="flex items-center gap-2">
                                  <Clock size={14} className="text-gray-400" />
                                  <span className="text-xs font-black text-gray-400">{movie.runtime}m</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  <div className="h-64 flex flex-col items-center justify-center border-t border-white/5 pt-20">
                     <span className="text-gray-600 font-black uppercase tracking-[0.5em] text-[10px]">Fim da Cronologia Atual</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div 
                key="tab-stats"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="px-6 md:px-12 max-w-7xl mx-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   <div className="bg-[#111] p-12 rounded-[3.5rem] border border-white/5 flex flex-col items-center text-center">
                      <LayoutGrid className="text-red-600 mb-8" size={48} />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Massa Total</span>
                      <h4 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">{stats.count}</h4>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Capítulos Catalogados</p>
                   </div>
                   <div className="bg-[#111] p-12 rounded-[3.5rem] border border-white/5 flex flex-col items-center text-center">
                      <Clock className="text-blue-600 mb-8" size={48} />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Imersão Temporal</span>
                      <h4 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">{stats.hours}h</h4>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Duração Agregada</p>
                   </div>
                   <div className="bg-[#111] p-12 rounded-[3.5rem] border border-white/5 flex flex-col items-center text-center">
                      <TrendingUp className="text-green-600 mb-8" size={48} />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Resonância Neural</span>
                      <h4 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">{stats.avgRating.toFixed(1)}</h4>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Qualidade Média</p>
                   </div>
                   
                   <div className="md:col-span-2 lg:col-span-3 bg-white/5 p-12 rounded-[3.5rem] border border-white/5 flex flex-col md:flex-row items-center gap-12">
                      <div className="flex-1 space-y-6">
                         <h4 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic">DDA: DNA do Universo</h4>
                         <p className="text-gray-500 text-lg font-medium leading-relaxed italic">
                            O universo de {franchise.name} abrange {stats.yearRange}. Analisamos trilhões de pontos de dados para garantir que a experiência de streaming seja 100% fiel à intenção dos criadores.
                         </p>
                         <div className="flex gap-4">
                            <div className="px-6 py-2 bg-red-600/20 text-red-600 rounded-full border border-red-600/30 text-[10px] font-black uppercase">Ficção Científica</div>
                            <div className="px-6 py-2 bg-blue-600/20 text-blue-600 rounded-full border border-blue-600/30 text-[10px] font-black uppercase">Ação Épica</div>
                         </div>
                      </div>
                      <div className="w-full md:w-64 aspect-square bg-black rounded-full border-8 border-white/5 flex items-center justify-center p-8 relative overflow-hidden group">
                         <div className="absolute inset-0 bg-red-600/20 animate-pulse blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <Cpu size={80} className="text-white relative z-10 animate-spin-slow" />
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Floating Actions */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[260] flex items-center gap-4 hidden lg:flex">
           <button className="px-8 py-3 bg-white text-black rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center gap-3">
              <Download size={14} /> Download Saga Offline
           </button>
           <button className="px-8 py-3 bg-black/80 backdrop-blur-3xl text-white border border-white/10 rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl flex items-center gap-3">
              <Heart size={14} className="text-red-500" /> Favoritar Universo
           </button>
        </div>

      </motion.div>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
});

export default UniverseView;
