import React, { useRef } from 'react';
import { Movie } from '../types';
import { ChevronLeft, ChevronRight, Zap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface NewReleasesRowProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

const NewCard = React.memo(({ movie, idx, onSelectMovie }: { movie: Movie, idx: number, onSelectMovie: (movie: Movie) => void }) => {
  return (
    <div 
      className="relative flex-none snap-start w-[160px] md:w-[320px] group/new animate-fade-in"
      style={{ animationDelay: `${idx * 0.03}s` }}
      onClick={() => onSelectMovie(movie)}
    >
      <div className="relative aspect-[2/3] rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border-4 border-white/5 group-hover/new:border-red-600 transition-colors duration-300 cursor-pointer">
        {/* The Card Background with intense zoom on hover */}
        <img 
          src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover/new:scale-105"
          alt={movie.title || movie.name}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        
        {/* Brutalist "NEW" Overlay */}
        <div className="absolute top-6 right-[-20px] rotate-[-15deg] z-20">
          <div className="bg-red-600 text-white font-black italic uppercase text-[10px] md:text-sm py-1 px-8 md:px-12 shadow-[0_4px_15px_rgba(220,38,38,0.6)] transform skew-x-[-10deg]">
             New Release
          </div>
        </div>

        {/* Dynamic Scan Line Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-600/10 to-transparent h-20 -top-20 group-hover/new:animate-scan z-10 pointer-events-none"></div>

        {/* Gradient Bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6 md:p-10 opacity-0 group-hover/new:opacity-100 transition-opacity duration-300">
           {movie.logo_path ? (
              <img 
                src={movie.logo_path.startsWith('http') ? movie.logo_path : `https://image.tmdb.org/t/p/original/${movie.logo_path}`} 
                className="h-10 md:h-16 object-contain mb-4"
                referrerPolicy="no-referrer"
              />
           ) : (
              <h3 className="text-white font-black italic uppercase text-lg md:text-3xl leading-none mb-4">{movie.title || movie.name}</h3>
           )}
           <div className="flex gap-2">
              <span className="text-[10px] font-bold px-3 py-1 bg-white text-black rounded-full uppercase tracking-widest">{movie.genres?.split(',')[0]}</span>
              <span className="text-[10px] font-bold px-3 py-1 bg-red-600 text-white rounded-full uppercase tracking-widest flex items-center gap-1">
                <Zap size={10} fill="currentColor" /> UHD
              </span>
           </div>
        </div>
      </div>
      
      {/* Decorative ID Number (Brutalist style) */}
      <div className="mt-4 flex items-center justify-between px-4">
        <span className="font-mono text-[10px] text-gray-500 font-bold tracking-widest">ID_{movie.id.toString().substring(0, 8)}</span>
        <div className="flex gap-1">
           {Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className={`w-1 h-1 rounded-full ${i < Math.floor(movie.rating || 0 / 2) ? 'bg-red-600' : 'bg-white/10'}`} />
           ))}
        </div>
      </div>
    </div>
  );
});

const NewReleasesRow = ({ title, movies, onSelectMovie }: NewReleasesRowProps) => {
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
    <div className="relative py-8 md:py-10 px-4 md:px-12 bg-gradient-to-r from-red-600/5 via-transparent to-transparent">
      <div className="flex flex-col md:flex-row items-end justify-between mb-4 md:mb-6 gap-6">
        <div>
           <div className="flex items-center gap-4 mb-4">
             <div className="h-[2px] w-12 bg-red-600"></div>
             <Sparkles className="text-red-600 animate-pulse" size={20} />
             <div className="h-[2px] w-12 bg-red-600"></div>
           </div>
           <h2 className="text-4xl md:text-[8rem] font-black italic uppercase tracking-tighter leading-[0.8] text-white/100">
             {title.split(' ')[0]} <br/>
             <span className="text-red-600 drop-shadow-[0_0_30px_rgba(220,38,38,0.3)]">{title.split(' ').slice(1).join(' ')}</span>
           </h2>
        </div>
        
        <div className="flex gap-4 mb-4">
           <button onClick={() => scroll('left')} className="w-16 h-16 flex items-center justify-center bg-white/5 hover:bg-black rounded-full border border-white/10 transition-all hover:border-red-600 group">
             <ChevronLeft size={32} className="group-hover:text-red-600" />
           </button>
           <button onClick={() => scroll('right')} className="w-16 h-16 flex items-center justify-center bg-white/5 hover:bg-black rounded-full border border-white/10 transition-all hover:border-red-600 group">
             <ChevronRight size={32} className="group-hover:text-red-600" />
           </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-hide gap-6 md:gap-10 snap-x pb-6 pt-4"
      >
        {movies.map((movie, idx) => (
          <NewCard key={movie.id} movie={movie} idx={idx} onSelectMovie={onSelectMovie} />
        ))}
      </div>
    </div>
  );
};

export default NewReleasesRow;
