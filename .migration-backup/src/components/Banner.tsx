import React, { useEffect, useState } from 'react';
import { Play, Info, Sparkles, Star, Loader2 } from 'lucide-react';
import tmdb, { requests, getMovieLogo } from '../services/tmdb';
import { Movie } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface BannerProps {
  onPlay: (movie: Movie, episodeUrl?: string) => void;
  onInfo: (movie: Movie) => void;
  movieOverride?: Movie | null;
  movies?: Movie[];
}

const Banner = React.memo(({ onPlay, onInfo, movieOverride, movies = [] }: BannerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [movie, setMovie] = useState<Movie | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initial load and rotation setup
  useEffect(() => {
    if (movieOverride) {
      setMovie(movieOverride);
      return;
    }

    if (movies && movies.length > 0) {
      setMovie(movies[currentIndex]);
    } else {
      async function fetchData() {
        try {
          const request = await tmdb.get(requests.fetchNetflixOriginals);
          const randomItems = request.data.results;
          setMovie(randomItems[0]);
        } catch (error) {
          console.error("Erro ao buscar banner:", error);
        }
      }
      fetchData();
    }
  }, [movieOverride, movies, currentIndex]);

  // Auto-rotation logic
  useEffect(() => {
    if (movieOverride || isPaused || !movies || movies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(movies.length, 5)); // Rotate top 5
    }, 8000); // 8 seconds per slide

    return () => clearInterval(interval);
  }, [movieOverride, isPaused, movies]);

  useEffect(() => {
    if (movie?.id) {
      setIsLoaded(false);
      setLogoUrl(null);
      async function fetchLogo() {
        const logo = await getMovieLogo(movie!.id, (movie as any).name ? 'tv' : 'movie');
        setLogoUrl(logo);
      }
      fetchLogo();
    }
  }, [movie]);

  function truncate(str: string, n: number) {
    return str?.length > n ? str.substr(0, n - 1) + "..." : str;
  }

  if (!movie) return (
    <div className="h-[80vh] md:h-[95vh] bg-[#111] animate-pulse flex items-center justify-center">
      <Loader2 className="text-white/10 animate-spin" size={48} />
    </div>
  );

  const backgroundUrl = movie.backdrop_path?.startsWith('http') 
    ? movie.backdrop_path 
    : `https://image.tmdb.org/t/p/original/${movie.backdrop_path}`;

  // Add saved state getters
  const savedProgress = parseFloat(localStorage.getItem(`netplay_progress_${movie.id}`) || '0');
  const savedUrl = localStorage.getItem(`netplay_progress_url_${movie.id}`);
  
  const savedEpisodeInfo = (() => {
    if (movie.type !== 'series' || !movie.episodes || !savedUrl) return null;
    const ep = movie.episodes.find((e: any) => e.videoUrl === savedUrl || e.videoUrl2 === savedUrl);
    if (ep) {
       return `T${ep.season} E${ep.episode}`;
    }
    return null;
  })();

  const handlePlayClick = () => {
    const isYouTube = movie.type === 'link';
    const defaultUrl = movie.type === 'series' && movie.episodes && movie.episodes.length > 0 ? movie.episodes[0].videoUrl : movie.videoUrl;
    onPlay(movie, savedUrl || defaultUrl);
  };

  return (
    <header
      className="relative h-[80vh] md:h-[95vh] text-white flex flex-col justify-center overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div 
          key={movie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={backgroundUrl}
            alt={movie.title || movie.name}
            className="w-full h-full object-cover object-[center_20%]"
            onLoad={() => setIsLoaded(true)}
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Slide Indicators */}
      {movies.length > 1 && !movieOverride && (
        <div className="absolute bottom-32 md:bottom-40 right-4 md:right-20 z-30 flex items-center gap-3">
          {movies.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 md:h-1.5 transition-all duration-500 rounded-full ${
                i === currentIndex ? 'w-8 md:w-16 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 'w-2 md:w-4 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Skeleton for Banner Image */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#111] animate-pulse z-0" />
      )}

      {/* Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent z-10" />
      <div className="absolute inset-0 bg-black/20 z-10" />

      <div className="ml-4 md:ml-20 pt-20 md:pt-32 z-20 w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3 md:space-y-10"
        >
          <div className="flex flex-wrap items-center gap-3 md:gap-5">
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 bg-[#e50914] px-4 md:px-8 py-2 md:py-3.5 rounded-lg shadow-[0_0_30px_rgba(229,9,20,0.5)] border border-red-400/20"
            >
              <Sparkles size={14} className="text-white animate-pulse md:w-5 md:h-5" />
              <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] md:tracking-[0.4em] italic">Catálogo Premium</span>
            </motion.div>
            
            <div className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-4 md:px-8 py-2 md:py-3.5 rounded-lg border border-white/20 shadow-xl">
              <Star size={14} className="text-yellow-500 fill-yellow-500 md:w-5 md:h-5" />
              <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.15em] italic text-white/90">Score: {movie.vote_average?.toFixed(1) || '5.8'} ★</span>
            </div>

            <div className="hidden sm:flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-2.5 rounded-lg border border-white/10">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
               <span className="text-[10px] font-black uppercase tracking-widest italic text-gray-400">4K Ultra HD</span>
            </div>
          </div>

          {logoUrl ? (
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4 }}
               className="h-32 md:h-64 lg:h-80 w-fit max-w-[90%] mb-10"
             >
              <img 
                src={logoUrl} 
                alt={movie?.title || movie?.name} 
                className="h-full object-contain filter drop-shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ) : (
            <h1 
              className="text-3xl md:text-9xl lg:text-[11rem] font-black pb-2 drop-shadow-2xl uppercase tracking-tighter italic leading-[0.9] text-white font-display select-none pr-4"
            >
              {movie?.title || movie?.name || movie?.original_name}
            </h1>
          )}

          <div className="flex items-center gap-4 md:gap-8 max-w-3xl border-l-[3px] md:border-l-[6px] border-[#e50914] pl-5 md:pl-10 ml-1 md:ml-3">
            <p className="w-full leading-relaxed text-[11px] md:text-2xl drop-shadow-2xl text-gray-200 font-medium italic opacity-90 tracking-tight line-clamp-3 md:line-clamp-none">
              {movie?.overview || "Explore agora este conteúdo exclusivo em altíssima definição no seu streaming premium preferido."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-12 mt-8 md:mt-24">
            <motion.button 
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: '#ff141e', 
                boxShadow: '0 25px 90px rgba(229,9,20,0.6)',
                rotate: -0.5
              }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayClick}
              className="cursor-pointer text-white font-black rounded-xl md:rounded-2xl px-8 md:px-24 py-4 md:py-10 bg-[#e50914] transition-all shadow-2xl flex items-center gap-3 md:gap-8 text-[11px] md:text-3xl uppercase tracking-[0.25em] italic group border-b-4 border-red-800"
            >
              <Play fill="white" size={20} className="md:w-12 md:h-12 group-hover:scale-110 transition-transform" /> 
              {savedProgress > 5 ? (savedEpisodeInfo ? `Continuar (${savedEpisodeInfo})` : 'Continuar') : (movie.type === 'series' ? 'Série' : 'Assistir')}
            </motion.button>
            
            <motion.button 
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: 'rgba(255,255,255,0.12)', 
                borderColor: 'rgba(255,255,255,0.4)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onInfo(movie)}
              className="cursor-pointer text-white font-black rounded-xl md:rounded-2xl px-8 md:px-20 py-4 md:py-10 bg-white/5 border border-white/20 flex items-center gap-3 md:gap-8 text-[11px] md:text-3xl backdrop-blur-xl uppercase tracking-[0.25em] italic shadow-2xl group"
            >
              <Info size={20} className="md:w-12 md:h-12 text-white group-hover:text-white transition-colors" /> Detalhes
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Decorative side accent */}
      <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-red-600 via-red-600 to-transparent z-30 hidden lg:block opacity-50 shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>

      {/* Bottom fade */}
      <div className="h-64 absolute bottom-0 w-full bg-gradient-to-t from-[#111] to-transparent z-10" />
    </header>
  );
});

export default Banner;
