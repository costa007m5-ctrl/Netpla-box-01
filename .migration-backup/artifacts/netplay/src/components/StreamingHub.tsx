import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface StreamingHubProps {
  onSelectProvider: (provider: string) => void;
  streamingProviders?: any[];
}

const defaultProviders = [
  { 
    name: 'Netflix', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', 
    color: 'from-[#E50914] to-[#B20710]',
    bg: 'bg-black',
    accent: '#E50914',
    font: 'netflix-font'
  },
  { 
    name: 'Disney+', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', 
    color: 'from-[#020d18] via-[#0063e5] to-[#011424]',
    bg: 'bg-[#00143c]',
    accent: '#0063e5',
    glow: 'rgba(0,110,255,0.4)',
    border: 'border-[#0063e5]/30'
  },
  { 
    name: 'Max', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', 
    color: 'from-[#002be7] via-[#0047ff] to-[#001489]',
    bg: 'bg-[#002be7]',
    accent: '#002be7',
    glow: 'rgba(0,71,255,0.4)'
  },
  { 
    name: 'Prime Video', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', 
    color: 'from-[#1a242f] via-[#00a8e1] to-[#1a242f]',
    bg: 'bg-[#00a8e1]',
    accent: '#00a8e1',
    glow: 'rgba(0,168,225,0.4)'
  },
  { 
    name: 'Apple TV+', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', 
    color: 'from-[#111] via-[#111] to-[#000]',
    bg: 'bg-black',
    accent: '#ffffff',
    glow: 'rgba(255,255,255,0.15)',
    style: 'glass'
  },
  { 
    name: 'Paramount+', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', 
    color: 'from-[#0064ff] via-[#0037a5] to-[#000033]',
    bg: 'bg-[#000033]',
    accent: '#0064ff',
    glow: 'rgba(0,100,255,0.4)'
  },
  { 
    name: 'Globoplay', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Globoplay_logo.svg', 
    color: 'from-[#ff4b00] via-[#fb132b] to-[#1a1a1a]',
    bg: 'bg-[#1a1a1a]',
    accent: '#fb132b',
    glow: 'rgba(251,13,27,0.4)'
  }
];

const StreamingHub = React.memo(({ onSelectProvider, streamingProviders }: StreamingHubProps) => {
  const displayProviders = (streamingProviders && streamingProviders.length > 0)
    ? streamingProviders.reduce((acc: any[], current: any) => {
        const x = acc.find(item => item.name === current.name);
        if (!x) {
          return acc.concat([{
            name: current.name,
            logo: current.logo_url,
            color: 'from-gray-800 to-black',
            bg: 'bg-black',
            accent: '#ffffff',
            glow: 'rgba(255,255,255,0.1)'
          }]);
        } else {
          return acc;
        }
      }, [])
    : defaultProviders;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    show: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="ml-2 md:ml-12 mb-8 md:mb-12 overflow-x-hidden w-[calc(100%-0.5rem)] md:w-[calc(100%-3rem)]">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="flex flex-col md:flex-row md:items-end justify-between mb-4 md:mb-6 gap-6 scale-95 md:scale-100 origin-left"
      >
        <div>
          <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
             <div className="w-1 md:w-1.5 h-8 md:h-12 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]"></div>
             <h2 className="text-2xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none italic">
                Canais <span className="text-red-600">Premium</span>
             </h2>
          </div>
          <p className="text-gray-500 font-bold tracking-[0.1em] md:tracking-[0.2em] uppercase text-[8px] md:text-xs ml-4 md:ml-6 italic opacity-80">
            Fidelidade absoluta: todos os catálogos unificados em uma experiência imersiva
          </p>
        </div>
        <div className="hidden md:flex gap-1">
          {[1,2,3,4].map(i => <div key={i} className={`w-${i} h-1 rounded-full ${i === 4 ? 'bg-red-600' : 'bg-white/10'}`} />)}
        </div>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="flex overflow-x-auto scrollbar-hide gap-6 md:gap-14 pb-6 md:pb-8 pr-12 snap-x snap-mandatory perspective-2000"
      >
        {displayProviders.map((provider) => (
          <motion.button
            key={provider.name}
            variants={itemVariants}
            whileHover={{ 
              scale: 1.1, 
              rotateY: 8,
              y: -10,
              boxShadow: `0 30px 60px -15px ${provider.glow || 'rgba(0,0,0,0.5)'}`
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectProvider(provider.name)}
            className={`flex-none w-48 md:w-96 aspect-[16/10] rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-br ${provider.color} p-8 md:p-14 flex items-center justify-center border-2 border-white/5 relative group overflow-hidden snap-center transition-all duration-300 shadow-xl`}
          >
            {/* dynamic noise/texture */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none"></div>
            
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            
            <motion.img 
              src={provider.logo} 
              alt={provider.name} 
              className="w-full h-full object-contain relative z-10 filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-125 group-hover:-translate-y-4"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => {
                const domain = provider.name.toLowerCase()
                  .replace(/\s+/g, '')
                  .replace(/[+]/g, 'plus')
                  .replace(/exclusive/i, '');
                (e.target as HTMLImageElement).src = `https://logo.clearbit.com/${domain}.com?size=512`;
                
                // second fallback if clearbit fails
                (e.target as HTMLImageElement).onerror = () => {
                  (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${domain}.com&sz=128`;
                };
              }}
            />
            
            {/* Branding details */}
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-full group-hover:translate-y-0 flex flex-col items-center">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] italic text-white/90">Official Stream</span>
               </div>
               <div 
                 className={`px-8 md:px-12 py-3 md:py-4 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] italic shadow-2xl ${provider.accent === 'bg-white' ? 'bg-white text-black' : 'bg-red-600 text-white'}`}
               >
                 Assistir Agora
               </div>
            </div>

            <div className="absolute bottom-8 right-10 opacity-0 group-hover:opacity-100 transition-all translate-x-10 group-hover:translate-x-0 flex items-center gap-3">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
                <ChevronRight className="text-white" size={24} />
              </div>
            </div>
            
            {/* Highlighting sheen */}
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-[35deg] pointer-events-none -translate-x-full group-hover:animate-sheen"></div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
});

export default StreamingHub;
