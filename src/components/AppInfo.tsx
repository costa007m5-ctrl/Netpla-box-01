import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Play, ShieldCheck, ChevronRight, Star, Users, Zap, Globe, Smartphone } from 'lucide-react';
import { Movie } from '../types';

interface AppInfoProps {
  onContinue: (mode?: 'login' | 'signup') => void;
  movies: Movie[];
}

const DEFAULT_POSTERS = [
  'https://image.tmdb.org/t/p/w500/8Gxv8ZiiQjLTVq9hlqU1Mv2U0qO.jpg',
  'https://image.tmdb.org/t/p/w500/q719jsmZvqb6tUFiBbqB8p6mw1m.jpg',
  'https://image.tmdb.org/t/p/w500/6oom5QYdwZ71TCWbkvMvS0n0Dby.jpg',
  'https://image.tmdb.org/t/p/w500/r2J0VzYnUEsIbiSSTSksvUo7mo1.jpg',
  'https://image.tmdb.org/t/p/w500/uY7URv89yS6Om9j32oOM4STU68B.jpg',
  'https://image.tmdb.org/t/p/w500/h8mzmDcYmCcy1ar9Mdh9ofjH7s8.jpg',
  'https://image.tmdb.org/t/p/w500/6WpY9i9at6L89lR7p5vA7Dq0S2p.jpg',
  'https://image.tmdb.org/t/p/w500/A7uByuyGKE69uYv7SFF9vI9Ym96.jpg',
];

const AppInfo: React.FC<AppInfoProps> = ({ onContinue, movies }) => {
  const [displayMovies, setDisplayMovies] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=pt-BR`);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          // Shuffle and get enough movies for the wall
          const trending = data.results.filter((m: any) => m.poster_path);
          let extendedList = [...trending];
          while (extendedList.length < 40) {
            extendedList = [...extendedList, ...trending];
          }
          setDisplayMovies(extendedList.sort(() => 0.5 - Math.random()).slice(0, 40));
          return;
        }
      } catch (err) {
        console.error("Failed to fetch trending for AppInfo", err);
      }
      
      // Fallback
      if (movies && movies.length > 5) {
        setDisplayMovies([...movies].sort(() => 0.5 - Math.random()).slice(0, 40));
      } else {
        setDisplayMovies(DEFAULT_POSTERS.map(url => ({ poster_path: url })));
      }
    };

    fetchTrending();
  }, [movies]);

  return (
    <div className="relative min-h-screen w-full bg-[#050505] overflow-hidden flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Cinematic Background: scrolling poster wall */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none">
        <div className="flex flex-col gap-4 -rotate-6 scale-125 origin-center">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex gap-4">
              <motion.div
                animate={{ 
                  x: row % 2 === 0 ? [0, -1920] : [-1920, 0] 
                }}
                transition={{ 
                  duration: 60 + (row * 10), 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex gap-4 shrink-0"
              >
                {[...displayMovies, ...displayMovies, ...displayMovies, ...displayMovies].slice(row * 10, (row * 10) + 20).map((movie, i) => (
                  <div 
                    key={`${row}-${i}`} 
                    className="w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                  >
                    <img 
                      src={movie.poster_path ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w342/${movie.poster_path}`) : "https://via.placeholder.com/342x513?text=PopCorn"}
                      className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-300"
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-black" />
        <div className="absolute inset-0 bg-radial-at-center from-transparent via-black/60 to-black" />
      </div>

      {/* Modern Fixed Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-8 bg-gradient-to-b from-black via-black/40 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)]">
            <Play size={24} className="text-white fill-white ml-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-3xl italic tracking-tighter uppercase leading-none">NetPremium</span>
            <span className="text-red-600 font-bold text-[8px] uppercase tracking-[0.4em] italic mt-1 ml-0.5">Premium Hub</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onContinue('login')}
            className="text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all px-4 py-2 hover:text-red-500 italic"
          >
            Entrar
          </button>
          <button 
            onClick={() => onContinue('signup')}
            className="bg-red-600/90 hover:bg-white hover:text-black hover:scale-105 text-white font-black uppercase tracking-widest text-[11px] px-8 py-3 rounded-2xl shadow-xl shadow-red-600/20 transition-all italic border border-white/10 backdrop-blur-md"
          >
            Assinar Agora
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pt-12">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-5xl space-y-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-red-600/10 border border-red-600/20 backdrop-blur-3xl mb-8">
            <Sparkles className="text-red-500 fill-red-500/20" size={16} />
            <span className="text-red-500 font-black text-[10px] uppercase tracking-[0.3em] italic">A nova era do streaming chegou</span>
          </div>
          
          <h1 className="text-6xl md:text-[8rem] font-bold text-white italic uppercase tracking-tighter leading-[0.85] mb-8">
            Filmes e Séries <br />
            <span className="font-black text-red-600 text-premium-glow relative">
              <span className="absolute -inset-2 bg-red-600/10 blur-3xl rounded-full"></span>
              Ilimitados
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto italic font-medium leading-relaxed mb-12">
            Tecnologia, arte e curadoria por IA em um só lugar. <br className="hidden md:block" />
            Assista onde quiser, quando quiser.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onContinue('signup')}
              className="w-full md:w-auto bg-glass-premium text-white font-black uppercase tracking-[0.3em] px-16 py-7 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl transition-all italic text-sm group frost-border hover:bg-white hover:text-black"
            >
              Começar Agora
              <Sparkles size={20} className="text-red-500 group-hover:text-black transition-colors" />
            </motion.button>
            <div className="flex flex-col items-center md:items-start gap-1">
              <p className="text-white font-black italic text-sm uppercase tracking-widest leading-none">Plano Premium</p>
              <p className="text-gray-500 font-bold italic text-xs uppercase tracking-widest">A partir de R$ 19,90/mês</p>
            </div>
          </div>
        </motion.div>

        {/* Feature Bento Grid */}
        <div className="w-full max-w-7xl mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-10 rounded-[2.5rem] flex flex-col justify-between group hover:bg-white/5 transition-colors">
            <Zap className="text-blue-500 mb-8" size={32} />
            <div>
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Streaming 4K</h3>
              <p className="text-gray-500 text-sm italic font-medium">Qualidade Ultra HD com suporte a HDR10+ e Dolby Atmos.</p>
            </div>
          </div>
          
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 p-10 rounded-[2.5rem] flex flex-col justify-between group hover:bg-white/5 transition-colors sm:col-span-2">
            <Users className="text-green-500 mb-8" size={32} />
            <div>
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Watch Party</h3>
              <p className="text-gray-500 text-sm italic font-medium">Assista em sincronia e mande emotes para seus amigos de qualquer lugar do mundo.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Social Proof */}
      <footer className="relative z-10 border-t border-white/5 bg-black/80 backdrop-blur-md p-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center md:items-start">
             <div className="flex -space-x-4 mb-4">
                {[1,2,3,4,5].map(i => (
                  <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-2 border-black" alt="" />
                ))}
             </div>
             <p className="text-white font-black italic text-sm">+250k usuários ativos</p>
             <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-yellow-500 fill-yellow-500" />)}
             </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 opacity-40">
            {['Netflix', 'Disney+', 'Max', 'Prime'].map(brand => (
              <span key={brand} className="text-white font-black uppercase tracking-widest text-[10px] italic">{brand}</span>
            ))}
          </div>

          <div className="flex items-center gap-6">
             <ShieldCheck className="text-gray-600" size={24} />
             <Globe className="text-gray-600" size={24} />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppInfo;
