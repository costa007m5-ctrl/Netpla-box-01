import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CollectionsCarouselProps {
  franchises: any[];
}

const CollectionsCarousel: React.FC<CollectionsCarouselProps> = ({ franchises }) => {
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
    <section className="px-5 md:px-20 max-w-[2000px] mx-auto relative group">
      <div className="flex items-center justify-between mb-10 md:mb-16">
        <div className="flex items-center gap-4">
          <div className="w-10 md:w-16 h-[2px] bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
          <h3 className="text-3xl md:text-6xl font-black text-white tracking-widest uppercase italic font-space">
            The <span className="text-red-600">Premium</span> Collections
          </h3>
        </div>
        
        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => scroll('left')}
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <ChevronLeft size={24} />
          </button>
          <button 
            onClick={() => scroll('right')}
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto no-scrollbar gap-6 md:gap-10 pb-10 snap-x snap-mandatory"
      >
        {franchises?.map((f: any, idx: number) => (
          <motion.div 
            key={f.id} 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -10 }}
            className="relative flex-none w-[300px] md:w-[600px] h-[250px] md:h-[400px] rounded-[2rem] md:rounded-[4rem] overflow-hidden group/card cursor-pointer border border-white/5 snap-center shadow-2xl"
            onClick={() => navigate(`/universe/${f.id}`)}
          >
            <img 
               src={f.backdrop} 
               className="w-full h-full object-cover grayscale opacity-40 group-hover/card:grayscale-0 group-hover/card:opacity-100 transition-all duration-1000 scale-110 group-hover/card:scale-100" 
               referrerPolicy="no-referrer"
               alt={f.name}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 md:p-16">
               <div className="flex items-center gap-3 mb-4 translate-y-4 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all duration-500">
                  <Sparkles size={14} className="text-red-500" />
                  <span className="text-red-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em]">Official Vault</span>
               </div>
               
               {f.logo ? (
                 <img 
                   src={f.logo} 
                   className="h-12 md:h-24 object-contain max-w-full drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover/card:scale-105 transition-transform origin-left duration-700 franchise-logo-glow" 
                   referrerPolicy="no-referrer"
                   alt={f.name}
                 />
               ) : (
                 <h4 className="text-white font-black text-3xl md:text-7xl uppercase tracking-tighter italic leading-none group-hover/card:scale-105 transition-transform origin-left duration-700">
                   {f.name}
                 </h4>
               )}
               
               <div className="mt-4 flex items-center gap-6 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 delay-100">
                  <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                    Explore {f.movies?.length || 0} Original Files
                  </p>
                  <div className="h-1 w-12 bg-red-600 rounded-full" />
               </div>
            </div>

            {/* Glass decoration */}
            <div className="absolute top-8 right-8 w-16 h-16 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-500 rotate-12 group-hover/card:rotate-0">
               <f.icon className="text-white/40" size={32} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default CollectionsCarousel;
