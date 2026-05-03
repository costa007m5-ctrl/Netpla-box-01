import React, { useRef } from 'react';
import { Movie } from '../types';
import { ChevronLeft, ChevronRight, Play, Info, Star, Ticket, Clapperboard } from 'lucide-react';
import { motion } from 'motion/react';

interface CinemaRowProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

const CinemaCard = React.memo(({ movie, onSelectMovie }: { movie: Movie, onSelectMovie: (movie: Movie) => void }) => {
  return (
    <div 
      className="relative flex-none snap-start w-[280px] md:w-[840px] aspect-[21/9] group/cinema cursor-pointer rounded-[0.8rem] md:rounded-[2rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/5 animate-fade-in hover:scale-[1.01] transition-transform"
      onClick={() => onSelectMovie(movie)}
    >
      {/* Cinematic Backdrop with dramatic depth */}
      <div className="absolute inset-0 bg-black">
        <img 
          src={movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/original/${movie.backdrop_path}`}
           className="w-full h-full object-cover opacity-60 group-hover/cinema:scale-[1.02] group-hover/cinema:opacity-100 transition-transform duration-300 ease-out shadow-inner"
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      {/* Film Strip Overlay (Side decoration) */}
      <div className="absolute inset-y-0 left-0 w-4 md:w-8 bg-black/40 z-20 flex flex-col justify-around items-center py-4 border-r border-white/10">
         {Array.from({ length: 4 }).map((_, i) => (
           <div key={i} className="w-2 h-2 md:w-3 md:h-3 rounded-sm bg-white/10" />
         ))}
      </div>

      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-transparent p-6 md:p-12 pl-12 md:pl-20 flex flex-col justify-end md:justify-center">
        <div className="max-w-2xl">
           <div className="flex items-center gap-3 mb-3">
              <div className="px-2.5 py-0.5 bg-red-600/20 border border-red-600/30 rounded-full flex items-center gap-1.5">
                <Clapperboard size={10} className="text-red-500" />
                <span className="text-[9px] font-black italic text-red-500 uppercase tracking-widest">Em Cartaz</span>
              </div>
              <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                <Star size={10} className="text-yellow-400" fill="#facc15" />
                <span className="text-[10px] font-black italic">{movie.rating?.toFixed(1)}</span>
              </div>
           </div>
           
           {movie.logo_path ? (
              <img 
                src={movie.logo_path.startsWith('http') ? movie.logo_path : `https://image.tmdb.org/t/p/original/${movie.logo_path}`} 
                className="h-8 md:h-14 object-contain mb-3 drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                referrerPolicy="no-referrer"
              />
           ) : (
              <h3 className="text-xl md:text-4xl font-black italic uppercase tracking-tighter text-white mb-3 leading-[0.9]">{movie.title || movie.name}</h3>
           )}

           <p className="hidden md:block text-gray-400 text-xs font-medium italic line-clamp-2 mb-6 max-w-xl">
             {movie.overview}
           </p>

           <div className="flex items-center gap-3">
              <button 
                className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 transition-transform"
              >
                <Play size={12} fill="black" /> Assistir
              </button>
              <button className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl border border-white/20 text-white transition-all">
                <Info size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Luxury Accents */}
      <div className="absolute top-8 right-8 writing-mode-vertical-rl rotate-180 flex items-center gap-4 opacity-40">
         <Ticket size={14} className="text-white mb-2" />
         <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white italic">PREMIERE_ROOM</span>
         <div className="w-[1px] h-12 bg-white/20" />
      </div>
    </div>
  );
});

const CinemaRow = ({ title, movies, onSelectMovie }: CinemaRowProps) => {
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
    <div className="relative py-4 md:py-6 overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="px-6 md:px-12 flex items-center justify-between mb-4 md:mb-6 relative z-10">
        <div className="flex flex-col">
           <div className="flex items-center gap-3 mb-2">
              <Ticket className="text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" size={20} />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 italic">Canais <span className="text-red-600">Premium</span></span>
           </div>
           <div className="flex items-baseline gap-4 md:gap-10">
              <h2 className="text-3xl md:text-8xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-2xl">
                {title}
              </h2>
              <span className="hidden lg:block font-sans text-xl md:text-3xl italic text-gray-700 font-black uppercase tracking-[0.3em] opacity-40">Cinema_VIP</span>
           </div>
        </div>
        
        <div className="flex gap-3">
           <button onClick={() => scroll('left')} className="p-3 bg-white/5 hover:bg-red-600 rounded-xl border border-white/10 text-white hover:border-red-600 transition-all">
             <ChevronLeft size={24} />
           </button>
           <button onClick={() => scroll('right')} className="p-3 bg-white/5 hover:bg-red-600 rounded-xl border border-white/10 text-white hover:border-red-600 transition-all">
             <ChevronRight size={24} />
           </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide gap-6 md:gap-10 px-6 md:px-12 snap-x pb-4"
      >
        {movies.map(movie => (
          <CinemaCard key={movie.id} movie={movie} onSelectMovie={onSelectMovie} />
        ))}
      </div>
    </div>
  );
};

export default CinemaRow;
