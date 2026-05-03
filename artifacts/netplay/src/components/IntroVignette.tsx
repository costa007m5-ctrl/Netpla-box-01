import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles } from 'lucide-react';

interface IntroVignetteProps {
  onComplete: () => void;
  isLoading?: boolean;
  movies?: any[];
}

const PHRASES = [
  "Preparando a pipoca...",
  "Buscando os melhores lançamentos...",
  "NetPremium: O cinema na palma da sua mão.",
  "Sabia que temos mais de 5.000 títulos?",
  "Novos episódios adicionados diariamente.",
  "Qualidade 4K Ultra HD disponível.",
  "Sincronizando sua lista de desejos...",
  "A inteligência artificial está escolhendo para você."
];

const DEFAULT_MOVIES = [
  { poster_path: 'https://image.tmdb.org/t/p/w500/8Gxv8ZiiQjLTVq9hlqU1Mv2U0qO.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/q719jsmZvqb6tUFiBbqB8p6mw1m.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/6oom5QYdwZ71TCWbkvMvS0n0Dby.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/r2J0VzYnUEsIbiSSTSksvUo7mo1.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/uY7URv89yS6Om9j32oOM4STU68B.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/h8mzmDcYmCcy1ar9Mdh9ofjH7s8.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/6WpY9i9at6L89lR7p5vA7Dq0S2p.jpg' },
  { poster_path: 'https://image.tmdb.org/t/p/w500/A7uByuyGKE69uYv7SFF9vI9Ym96.jpg' },
];

const IntroVignette: React.FC<IntroVignetteProps> = ({ onComplete, isLoading = false, movies = [] }) => {
  const [step, setStep] = useState(0); 
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);

  const displayMovies = movies.length > 10 ? movies : [...movies, ...DEFAULT_MOVIES, ...DEFAULT_MOVIES, ...DEFAULT_MOVIES];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 400),  // Logo Pulse
      setTimeout(() => setStep(2), 1000), // Text Reveal
      setTimeout(() => setStep(3), 2400), // Cinematic Zoom
      setTimeout(() => {
        setAnimationDone(true);
      }, 3200), // Ready to finish
    ];

    const phraseInterval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % PHRASES.length);
    }, 1200);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(phraseInterval);
    };
  }, []);

  useEffect(() => {
    if (animationDone && !isLoading) {
      setStep(4); // Start exit animation
      const finalizeTimer = setTimeout(onComplete, 800);
      return () => clearTimeout(finalizeTimer);
    }
  }, [animationDone, isLoading, onComplete]);

  return (
    <AnimatePresence>
      {step <= 4 && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: step === 4 ? 0 : 1 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[1000] bg-[#020202] flex items-center justify-center overflow-hidden"
        >
          {/* Cinematic Movie Poster Background */}
          {displayMovies && displayMovies.length > 0 && (
             <div className="absolute inset-0 opacity-[0.05] grayscale scale-110 pointer-events-none">
                <div className="flex flex-col gap-4">
                  {[0, 1, 2].map((row) => (
                    <motion.div 
                      key={row}
                      animate={{ 
                        x: row % 2 === 0 ? [0, -1000] : [-1000, 0] 
                      }}
                      transition={{ 
                        duration: 60 + (row * 20), 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                      className="flex gap-4 shrink-0"
                    >
                      {[...displayMovies, ...displayMovies].slice(row * 10, (row * 10) + 20).map((movie, i) => (
                        <div key={`${row}-${i}`} className="w-40 aspect-[2/3] rounded-xl overflow-hidden border border-white/5">
                           <img 
                            src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w185/${movie.poster_path}`} 
                            className="w-full h-full object-cover"
                            alt=""
                           />
                        </div>
                      ))}
                    </motion.div>
                  ))}
                </div>
             </div>
          )}

          {/* Cinematic Background Layers */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Ambient Glow */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0.2] }}
              transition={{ duration: 2 }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2)_0%,transparent_70%)]"
            />
            
            {/* Film Grain / Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.08] mix-blend-overlay" />
            
            {/* Vertical Light Streaks (Netflix style) */}
            <div className="absolute inset-0 flex justify-around opacity-10">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1, duration: 1 }}
                  className="w-px h-full bg-gradient-to-b from-transparent via-red-600 to-transparent"
                />
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-6 md:gap-10">
            {/* The "N" / Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
              animate={step >= 3 ? { 
                scale: 50, 
                opacity: 0,
                filter: 'blur(40px)',
                transition: { duration: 1.2, ease: [0.7, 0, 0.3, 1] }
              } : { 
                scale: 1, 
                opacity: 1, 
                filter: 'blur(0px)',
                transition: { duration: 0.6, ease: "easeOut" }
              }}
              className="relative z-10"
            >
              {/* Main Logo Box */}
              <motion.div 
                animate={step === 1 ? { 
                  scale: [1, 1.1, 1],
                  boxShadow: ['0 0 40px rgba(220,38,38,0.2)', '0 0 100px rgba(220,38,38,0.6)', '0 0 40px rgba(220,38,38,0.2)']
                } : {}}
                className="w-20 h-20 md:w-36 md:h-36 bg-red-600 rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.3)] border border-white/20 relative overflow-hidden"
              >
                {/* Internal light sweep */}
                <motion.div 
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                <Play fill="white" className="w-10 h-10 md:w-16 md:h-16 text-white ml-1 md:ml-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
              </motion.div>
              
              {/* Outer Glow */}
              <motion.div 
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -inset-10 bg-red-600/10 blur-[80px] rounded-full -z-10"
              />
            </motion.div>

            {/* Netplay Text Reveal with Letter Spacing Animation */}
            <AnimatePresence>
              {step >= 2 && step < 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -30, letterSpacing: '0.5em' }}
                  animate={{ opacity: 1, x: 0, letterSpacing: '-0.05em' }}
                  exit={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2"
                >
                  <span className="text-4xl md:text-8xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">NET</span>
                  <span className="text-4xl md:text-8xl font-black text-red-600 uppercase italic tracking-tighter drop-shadow-2xl">PREMIUM</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Loading Progress & Phrases */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={step >= 3 ? { opacity: 0 } : { opacity: 1 }}
            className="absolute bottom-24 flex flex-col items-center gap-8 w-full max-w-xs"
          >
            <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 3.5, ease: "linear" }}
                className="h-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,1)]"
              />
              {/* Progress Glow */}
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />
            </div>
            
            <div className="h-4 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phraseIndex}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="text-gray-400 text-[11px] font-black uppercase tracking-[0.5em] italic text-center"
                >
                  {PHRASES[phraseIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroVignette;
