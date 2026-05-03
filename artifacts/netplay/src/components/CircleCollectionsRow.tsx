import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CircleCollectionsRowProps {
  franchises: any[];
}

const CircleCollectionsRow: React.FC<CircleCollectionsRowProps> = ({ franchises }) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="py-8 md:py-12 relative group overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="px-4 md:px-12 flex items-center justify-between mb-8 md:mb-10">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Sparkles className="text-red-600 animate-pulse" size={20} />
              Universos <span className="text-red-600">Circle</span>
            </h2>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">Conectando Histórias Epicas</span>
          </div>
        </div>

        <div className="flex gap-2 min-opacity-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={() => scroll('left')}
             className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
           >
             <ChevronLeft size={16} />
           </button>
           <button 
             onClick={() => scroll('right')}
             className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
           >
             <ChevronRight size={16} />
           </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar gap-8 md:gap-14 px-4 md:px-12 pb-4"
      >
        {franchises?.map((f: any, idx: number) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="relative flex-none cursor-pointer group/circle"
            onClick={() => navigate(`/universe/${f.id}`)}
          >
            {/* Circle Container */}
            <div className="relative w-24 h-24 md:w-40 md:h-40">
               {/* Animated Rings - Simplified for Performance */}
               <div className="absolute -inset-1 rounded-full border border-white/5 transition-colors duration-500" />
               <div className="absolute -inset-2 rounded-full border border-white/5 transition-colors duration-700" />
               
               {/* Main Circle */}
               <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 group-hover/circle:border-red-600 transition-all duration-500 shadow-xl relative">
                  <img 
                    src={f.backdrop || f.poster || 'https://images.unsplash.com/photo-1542204111-970c9220bd5d?auto=format&fit=crop&q=80&w=1000'} 
                    className="w-full h-full object-cover grayscale-0 opacity-80 group-hover/circle:opacity-100 group-hover/circle:scale-105 transition-all duration-700 active:grayscale"
                    alt={f.name}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70 group-hover/circle:from-transparent transition-all duration-500" />
                  
                  {/* Logo Center */}
                  <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
                     {f.logo ? (
                       <img 
                         src={f.logo} 
                         className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] group-hover/circle:scale-110 transition-all duration-500"
                         referrerPolicy="no-referrer"
                         alt={f.name}
                       />
                     ) : (
                       <span className="text-white font-black text-sm md:text-xl uppercase italic text-center leading-none tracking-tighter">
                         {f.name}
                       </span>
                     )}
                  </div>
               </div>
            </div>

            {/* Title & Stats */}
            <div className="mt-4 text-center space-y-1">
               {f.logo ? (
                 <img 
                   src={f.logo} 
                   className="h-4 md:h-7 object-contain mx-auto opacity-80 group-hover/circle:opacity-100 transition-all duration-500" 
                   alt={f.name}
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <h4 className="text-white font-black uppercase italic tracking-tighter text-xs md:text-base group-hover/circle:text-red-600 transition-colors">
                   {f.name}
                 </h4>
               )}
               
               <div className="flex items-center justify-center gap-1.5">
                  <div className="h-0.5 w-3 bg-red-600 rounded-full group-hover/circle:w-5 transition-all" />
                  <span className="text-gray-500 font-black text-[6px] md:text-[8px] uppercase tracking-[0.2em]">
                    {f.movies?.length || 0} ARCHIVES
                  </span>
                  <div className="h-0.5 w-3 bg-red-600 rounded-full group-hover/circle:w-5 transition-all" />
               </div>
            </div>

            {/* Hover Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-600/0 group-hover/circle:bg-red-600/10 blur-[60px] rounded-full transition-all duration-700" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CircleCollectionsRow;
