import React, { useRef } from 'react';
import { Movie } from '../types';
import { ChevronLeft, ChevronRight, Play, Clock, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface ContinueWatchingRowProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie, episodeUrl?: string, startTime?: number) => void;
  profileName: string;
}

const ContinueCard = React.memo(({ movie, onSelectMovie, onPlayMovie }: { movie: Movie, onSelectMovie: (movie: Movie) => void, onPlayMovie: (movie: Movie, episodeUrl?: string, startTime?: number) => void }) => {
  // Mocking duration if not present (assuming 2h average if movie.runtime is missing)
  const duration = movie.runtime ? movie.runtime * 60 : 7200;
  const position = movie.last_position || 0;
  const progress = (position / duration) * 100;
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const handleClick = (e: React.MouseEvent) => {
    // Para resolver o bug de "Falha contínua na conexão" por causa de links que expiram no Continuar Assistindo:
    // Se for filme (links em geral mais longos ou fixos), tenta tocar direto com a URL fresca (movie.videoUrl).
    // Se for série, abrimos o Modal onde as URLs dos episódios são buscadas em tempo real do banco.
    if (movie.type === 'series') {
       onSelectMovie(movie);
    } else {
       onPlayMovie(movie, movie.videoUrl, position);
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectMovie(movie);
  };

  return (
    <div 
      className="relative flex-none snap-start w-[280px] md:w-[450px] aspect-video rounded-2xl overflow-hidden group/cw cursor-pointer border border-white/5 bg-[#151619] hover:-translate-y-2 hover:scale-[1.02] transition-transform duration-300"
      onClick={handleClick}
    >
      {/* Background Image with sophisticated filter */}
      <img 
        src={movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/w780/${movie.backdrop_path}`}
        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/cw:opacity-80 transition-transform duration-300 group-hover/cw:scale-105"
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
      />
      
      {/* Glass Morphism Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent">
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1">
            {movie.logo_path ? (
               <img 
                 src={movie.logo_path.startsWith('http') ? movie.logo_path : `https://image.tmdb.org/t/p/original/${movie.logo_path}`} 
                 className="h-6 md:h-12 object-contain mb-2 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
                 referrerPolicy="no-referrer"
               />
            ) : (
               <h3 className="text-white font-black uppercase tracking-tighter italic text-sm md:text-2xl mb-1">{movie.title || movie.name}</h3>
            )}
            <div className="flex items-center gap-3 text-gray-400 font-mono text-[9px] md:text-[10px] tracking-widest uppercase">
              <Clock size={10} className="text-red-500" />
              <span>Restam {formatTime(duration - position)}</span>
            </div>
          </div>
          
          <div className="relative group/play">
            <div className="absolute -inset-3 bg-red-600/20 rounded-full blur-xl opacity-0 group-hover/play:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white flex items-center justify-center text-black shadow-2xl relative z-10 transition-transform group-hover/play:scale-110">
              <Play fill="currentColor" size={24} className="ml-1" />
            </div>
          </div>
        </div>

        {/* Technical Progress Bar (Hardware Recipe) */}
        <div className="mt-4 md:mt-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Progressum_Track</span>
            <span className="text-[8px] font-mono text-red-600 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-gradient-to-r from-red-800 to-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      
        {/* Progress Bar and Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-30 opacity-0 group-hover/cw:opacity-100 transition-opacity">
           <button 
             onClick={handleInfoClick}
             className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full border border-white/20 text-white transition-all shadow-2xl"
           >
             <Info size={18} />
           </button>
        </div>
    </div>
  );
});

const ContinueWatchingRow = ({ title, movies, onSelectMovie, onPlayMovie, profileName }: ContinueWatchingRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const amount = clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: dir === 'left' ? scrollLeft - amount : scrollLeft + amount, behavior: 'smooth' });
    }
  };

  if (!movies.length) return null;

  return (
    <div className="relative py-4 md:py-6 group">
      <div className="px-6 md:px-12 flex items-center justify-between mb-4 md:mb-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-600" />
                <div className="w-2 h-2 rounded-full bg-red-600/30" />
                <div className="w-2 h-2 rounded-full bg-red-600/10" />
              </div>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.4em] italic">Transmissão Ativa</span>
           </div>
           <h2 className="text-2xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none group-hover:translate-x-2 transition-transform duration-300">
             {title}
           </h2>
        </div>
        
        <div className="flex gap-4">
           <button onClick={() => scroll('left')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-all">
             <ChevronLeft size={24} />
           </button>
           <button onClick={() => scroll('right')} className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-all">
             <ChevronRight size={24} />
           </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide gap-4 md:gap-8 px-6 md:px-12 snap-x pb-4"
      >
        {movies.map(movie => (
          <ContinueCard key={movie.id} movie={movie} onSelectMovie={onSelectMovie} onPlayMovie={onPlayMovie} />
        ))}
      </div>
    </div>
  );
};

export default ContinueWatchingRow;
