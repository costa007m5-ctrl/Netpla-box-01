import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Movie } from '../types';

interface Top10RowProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
}

const Top10Row: React.FC<Top10RowProps> = ({ title, movies, onSelectMovie }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="space-y-3 md:space-y-4 group/row relative py-4 md:py-6 overflow-hidden">
      <div className="px-4 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 md:h-8 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
              <TrendingUp className="text-red-600" size={18} />
              {title}
            </h2>
            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-500">Mundial Hoje</span>
          </div>
        </div>

        <div className="flex gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
           <button 
             onClick={() => scroll('left')}
             className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-600 transition-all active:scale-90"
           >
             <ChevronLeft size={16} />
           </button>
           <button 
             onClick={() => scroll('right')}
             className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-600 transition-all active:scale-90"
           >
             <ChevronRight size={16} />
           </button>
        </div>
      </div>

      <div 
        ref={rowRef}
        className="flex overflow-x-auto no-scrollbar gap-12 md:gap-16 px-8 md:px-16 pb-6"
      >
        {movies.slice(0, 10).map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="relative flex-none w-[130px] md:w-[200px] aspect-[2/3] cursor-pointer group/card"
            onClick={() => onSelectMovie(movie)}
          >
            {/* 3D Elegant Number Background */}
            <div className="absolute -left-8 md:-left-12 bottom-0 z-0 pointer-events-none">
               <span className="text-[8rem] md:text-[14rem] font-black leading-none italic select-none
                 bg-gradient-to-t from-gray-800 to-white/20 bg-clip-text text-transparent
                 transition-all duration-700 group-hover/card:from-red-900 group-hover/card:to-red-500
                 [filter:drop-shadow(3px_3px_0px_rgba(0,0,0,0.8))_drop-shadow(0_0_15px_rgba(0,0,0,0.5))]
                 group-hover/card:[filter:drop-shadow(5px_5px_0px_rgba(0,0,0,0.9))_drop-shadow(0_0_20px_rgba(220,38,38,0.3))]
                 inline-block"
               >
                 {index + 1}
               </span>
            </div>

            {/* Poster Card */}
            <div className="relative z-10 w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 group-hover/card:border-red-600 transition-all duration-500 shadow-xl">
              <img
                src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                alt={movie.title || movie.name}
                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
              
              {/* Top Seal Badge */}
              <div className="absolute top-3 right-3 z-20">
                 <div className="bg-red-600 text-white font-black italic text-[8px] md:text-[10px] px-2 py-0.5 rounded shadow-lg border border-red-400/30 transform -rotate-12">
                   TOP {index + 1}
                 </div>
              </div>

              {/* Card Meta */}
              <div className="absolute bottom-4 left-4 right-4 translate-y-2 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all duration-500">
                 <p className="text-white font-black text-xs md:text-sm uppercase italic truncate">{movie.title || movie.name}</p>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 text-[8px] md:text-[10px] font-bold italic tracking-wider">PLATINUM CHOICE</span>
                 </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Top10Row;
