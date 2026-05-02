import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, Plus, Info } from 'lucide-react';
import { Movie } from '../types';
import Row from './Row';
import { getMovieLogo } from '../services/tmdb';
import { useNavigate } from 'react-router-dom';

interface ProviderPageProps {
  provider: string;
  movies: Movie[];
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  onToggleMyList: (movie: Movie) => void;
  onToggleFavorite: (movie: Movie) => void;
  myListIds: Set<number>;
  favoriteIds: Set<number>;
}

const providerConfigs: Record<string, any> = {
  'Netflix': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
    accent: '#E50914',
    bg: 'bg-[#141414]',
    gradient: 'from-[#141414] via-[#141414]/95 to-transparent',
    overlay: 'bg-gradient-to-r from-[#141414] via-transparent to-transparent',
    buttonPrimary: 'bg-white text-black hover:bg-white/90 rounded-sm font-black uppercase text-[10px] md:text-sm tracking-widest',
    buttonSecondary: 'bg-[#6d6d6eb3] text-white hover:bg-[#6d6d6e66] rounded-sm font-black uppercase text-[10px] md:text-sm tracking-widest backdrop-blur-md',
    font: 'font-sans',
    cardStyle: 'rounded-sm hover:scale-105 transition-transform duration-300',
    heroLayout: 'bottom-0 left-0 p-6 md:p-20 pb-40 md:pb-60',
    titleStyle: 'text-3xl md:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] leading-[0.9] uppercase tracking-tighter italic',
    theme: 'netflix'
  },
  'Disney+': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    accent: '#f9f9f9',
    bg: 'bg-black',
    gradient: 'from-black/80 via-black/20 to-transparent',
    overlay: 'hidden',
    buttonPrimary: 'bg-[#f9f9f9] text-black hover:bg-white rounded font-bold tracking-[0.1em] text-xs md:text-sm uppercase shadow-lg',
    buttonSecondary: 'bg-black/60 text-white border border-white/80 hover:bg-white/20 rounded font-bold tracking-[0.1em] text-xs md:text-sm uppercase',
    font: 'font-sans',
    cardStyle: 'rounded-lg border-[3px] border-transparent hover:border-white/80 shadow-[0_26px_58px_-16px_rgba(0,0,0,0.8)] hover:shadow-[0_40px_58px_-16px_rgba(0,0,0,0.8)] hover:scale-105 transition-all duration-300',
    heroLayout: 'bottom-8 left-0 w-full p-6 md:p-24 pb-12 md:pb-24',
    titleStyle: 'text-3xl md:text-7xl font-bold text-[#f9f9f9] tracking-tight drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]',
    theme: 'disney'
  },
  'Max': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg',
    accent: '#002be7',
    bg: 'bg-[#000814]',
    gradient: 'from-[#000814] via-[#000814]/90 to-transparent',
    overlay: 'bg-gradient-to-b from-[#002be7]/10 to-transparent',
    buttonPrimary: 'bg-white text-black hover:bg-gray-100 rounded-full font-black px-12 py-5 text-sm uppercase italic',
    buttonSecondary: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded-full font-black px-12 py-5 text-sm uppercase italic',
    font: 'font-sans',
    cardStyle: 'rounded-none border-b-4 border-transparent hover:border-[#002be7] transition-colors group-hover:scale-105 duration-300',
    heroLayout: 'bottom-0 left-0 p-8 md:p-24 pb-48 md:pb-72',
    titleStyle: 'text-5xl md:text-[10rem] font-black text-white italic tracking-tighter uppercase leading-[0.8] drop-shadow-[0_0_40px_rgba(0,43,231,0.3)]',
    theme: 'max'
  },
  'Prime Video': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png',
    accent: '#00a8e1',
    bg: 'bg-[#0f171e]',
    gradient: 'from-[#0f171e] via-[#0f171e]/90 to-transparent',
    overlay: 'bg-gradient-to-r from-black/40 to-transparent',
    buttonPrimary: 'bg-[#00a8e1] text-white hover:bg-[#00c3ff] rounded-md font-black px-10 py-4 text-sm uppercase shadow-xl',
    buttonSecondary: 'bg-[#1a242f] text-white hover:bg-[#252e39] rounded-md font-black px-10 py-4 text-sm uppercase border border-white/5',
    font: 'font-sans',
    cardStyle: 'rounded-md shadow-2xl hover:ring-4 ring-[#00a8e1]/50 transition-shadow duration-300',
    heroLayout: 'bottom-0 left-0 p-8 md:p-32 pb-48 md:pb-72',
    titleStyle: 'text-4xl md:text-8xl font-black text-white tracking-tight uppercase leading-none drop-shadow-2xl',
    theme: 'prime'
  },
  'Apple TV+': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg',
    accent: '#ffffff',
    bg: 'bg-[#000000]',
    gradient: 'from-black via-black/50 to-transparent',
    overlay: 'bg-black/20',
    buttonPrimary: 'bg-white text-black hover:bg-white/80 rounded-2xl font-black px-12 py-5 text-sm uppercase italic',
    buttonSecondary: 'bg-white/10 text-white backdrop-blur-md hover:bg-white/20 rounded-2xl font-black px-12 py-5 text-sm uppercase italic border border-white/10',
    font: 'font-sans',
    cardStyle: 'rounded-[1.5rem] md:rounded-[2.5rem] hover:scale-105 transition-transform duration-300 ease-in-out z-10 border border-white/5 shadow-2xl',
    heroLayout: 'bottom-0 left-0 w-full flex flex-col items-center text-center p-6 md:p-24 pb-32 md:pb-64',
    titleStyle: 'text-4xl md:text-[8rem] font-black text-white tracking-tighter leading-[0.85] uppercase italic',
    theme: 'apple'
  },
  'Paramount+': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg',
    accent: '#0064ff',
    bg: 'bg-[#00001a]',
    gradient: 'from-[#00001a] via-[#00001a]/95 to-transparent',
    overlay: 'bg-[radial-gradient(circle_at_center,rgba(0,100,255,0.2)_0%,transparent_70%)]',
    buttonPrimary: 'bg-white text-[#0064ff] hover:bg-blue-50 rounded-full font-black uppercase text-xs italic tracking-widest px-12 py-5 shadow-2xl shadow-blue-600/20',
    buttonSecondary: 'bg-[#0064ff] text-white hover:bg-[#3385ff] rounded-full font-black uppercase text-xs italic tracking-widest px-12 py-5 border border-blue-400/30',
    font: 'font-sans',
    cardStyle: 'rounded-xl border-2 border-transparent hover:border-blue-500 transition-all overflow-hidden hover:scale-105 shadow-2xl',
    heroLayout: 'bottom-0 left-0 p-6 md:p-20 pb-32 md:pb-60',
    titleStyle: 'text-3xl md:text-[8rem] font-black text-white italic tracking-tighter uppercase leading-[0.8] drop-shadow-[0_0_30px_rgba(0,100,255,0.5)]',
    theme: 'paramount'
  },
  'Globoplay': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Globoplay_logo.svg',
    accent: '#ff4b00',
    bg: 'bg-[#121212]',
    gradient: 'from-[#121212] via-[#121212]/95 to-transparent',
    overlay: 'bg-gradient-to-t from-[#ff4b00]/5 to-transparent',
    buttonPrimary: 'bg-[#fb0d1b] text-white hover:bg-[#ff1a1a] rounded-sm font-black uppercase text-xs tracking-widest px-10 py-4 shadow-xl shadow-red-600/20',
    buttonSecondary: 'bg-white/5 text-white border border-white/10 hover:bg-white/10 rounded-sm font-black uppercase text-xs tracking-widest px-10 py-4',
    font: 'font-sans',
    cardStyle: 'rounded-xl hover:shadow-[0_0_30px_rgba(251,13,27,0.3)] transition-all hover:-translate-y-2',
    heroLayout: 'bottom-0 left-0 p-8 md:p-24 pb-48 md:pb-64',
    titleStyle: 'text-4xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-none',
    theme: 'globo'
  },
  'Hulu': {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg',
    accent: '#1ce783',
    bg: 'bg-black',
    gradient: 'from-black via-black/80 to-transparent',
    overlay: 'bg-[radial-gradient(circle_at_25%_25%,rgba(28,231,131,0.1),transparent_70%)]',
    buttonPrimary: 'bg-[#1ce783] text-black hover:bg-white rounded font-bold uppercase tracking-[0.1em] text-xs md:text-sm px-8 py-3 shadow-[0_0_20px_rgba(28,231,131,0.3)] transition-all',
    buttonSecondary: 'bg-white/10 text-white hover:bg-white/20 rounded font-bold uppercase tracking-[0.1em] text-xs md:text-sm px-8 py-3 transition-all',
    font: 'font-sans',
    cardStyle: 'rounded-lg border-[3px] border-transparent hover:border-[#1ce783]/50 shadow-[rgba(0,0,0,0.5)_0px_20px_30px_-10px] hover:scale-105 transition-all duration-300',
    heroLayout: 'bottom-0 left-0 w-full p-6 md:p-24 pb-12 md:pb-24',
    titleStyle: 'text-3xl md:text-7xl font-bold text-white tracking-tight drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]',
    theme: 'hulu'
  }
};

const DISNEY_BRANDS = [
  { id: 'disney', name: 'Disney', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Disney_wordmark.svg', video: 'https://raw.githubusercontent.com/sonusindhu/disney-clone/main/public/videos/1564674844-disney.mp4', keywords: ['encanto', 'moana', 'frozen', 'rei leão', 'lion king', 'mickey', 'disney'], backdrop: 'https://image.tmdb.org/t/p/original/7Ry9S0SSTIyuQq9S8fXG8gC.jpg' },
  { id: 'pixar', name: 'Pixar', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Pixar_logo.svg', video: 'https://raw.githubusercontent.com/sonusindhu/disney-clone/main/public/videos/1564676714-pixar.mp4', keywords: ['toy story', 'nemo', 'up', 'divertida mente', 'inside out', 'incredibles', 'monstros', 'cars'], backdrop: 'https://image.tmdb.org/t/p/original/hY6vshsh0rIn4766u63NBSmToIdp.jpg' },
  { id: 'marvel', name: 'Marvel', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Marvel_Logo.svg', video: 'https://raw.githubusercontent.com/sonusindhu/disney-clone/main/public/videos/1564676115-marvel.mp4', keywords: ['marvel', 'avengers', 'vingadores', 'iron man', 'homem de ferro', 'spider-man', 'spiderman', 'thor'], backdrop: 'https://image.tmdb.org/t/p/original/mDf935S7qbZOSo9u3YmBAzY6nU2.jpg' },
  { id: 'star-wars', name: 'Star Wars', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Star_wars2.svg', video: 'https://raw.githubusercontent.com/sonusindhu/disney-clone/main/public/videos/1608229455-star-wars.mp4', keywords: ['star wars', 'mandalorian', 'jedi', 'darth', 'skywalker', 'andor'], backdrop: 'https://image.tmdb.org/t/p/original/9v8X8tB8bS19K6G2w6N8fXG8gC.jpg' },
  { id: 'national', name: 'National Geographic', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/National_Geographic_logo_text.svg', video: 'https://raw.githubusercontent.com/sonusindhu/disney-clone/main/public/videos/1564676296-national-geographic.mp4', keywords: ['cosmos', 'natureza', 'terra', 'vida', 'ocean', 'planeta'], backdrop: 'https://image.tmdb.org/t/p/original/aInel5k9AetCg2Vf3hR1Iq6n2eD.jpg' },
];

const ProviderPage: React.FC<ProviderPageProps> = ({ 
  provider, 
  movies, 
  onClose, 
  onSelectMovie, 
  onToggleMyList, 
  onToggleFavorite,
  myListIds,
  favoriteIds
}) => {
  const navigate = useNavigate();
  const config = providerConfigs[provider] || providerConfigs['Netflix'];
  const featuredMovie = movies[0];
  const [featuredLogo, setFeaturedLogo] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);

  useEffect(() => {
    if (featuredMovie) {
      getMovieLogo(featuredMovie.id, featuredMovie.type as 'movie' | 'tv').then(logo => {
        setFeaturedLogo(logo);
      }).catch(() => setFeaturedLogo(null));
    }
  }, [featuredMovie]);

  const displayedMovies = React.useMemo(() => {
    let filteredMovies = movies;
    if (brandFilter) {
      const brand = DISNEY_BRANDS.find(b => b.id === brandFilter);
      if (brand) {
        filteredMovies = movies.filter(m => brand.keywords.some(k => (m.title || m.name || '').toLowerCase().includes(k)));
      }
    }
    return filteredMovies;
  }, [movies, brandFilter]);

  const moviesByGenre = React.useMemo(() => {
    return displayedMovies.reduce((acc, movie) => {
      const genres = movie.genres?.split(',') || ['Geral'];
      genres.forEach(g => {
        const genre = g.trim();
        if (!acc[genre]) acc[genre] = [];
        acc[genre].push(movie);
      });
      return acc;
    }, {} as Record<string, Movie[]>);
  }, [displayedMovies]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`fixed inset-0 z-[200] ${config.bg} overflow-y-auto overflow-x-hidden custom-scrollbar`}
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-[210] p-4 md:p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={onClose}
          className="p-2 md:p-3 bg-black/40 rounded-full text-white hover:bg-red-600 transition-colors"
        >
          <ChevronLeft size={24} className="md:w-8 md:h-8" />
        </button>
        <img src={config.logo} alt={provider} className="h-6 md:h-12 object-contain" referrerPolicy="no-referrer" />
        <div className="w-8 md:w-12"></div> {/* Spacer */}
      </div>

      {/* Hero */}
      {featuredMovie && (
        <div className="relative h-[60vh] md:h-[90vh] w-full overflow-hidden">
          <img 
            src={featuredMovie.backdrop_path?.startsWith('http') ? featuredMovie.backdrop_path : `https://image.tmdb.org/t/p/original/${featuredMovie.backdrop_path}`}
            alt={featuredMovie.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${config.gradient}`}></div>
          <div className={`absolute inset-0 ${config.overlay}`}></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>
          
          <div className={`absolute ${config.heroLayout} space-y-3 md:space-y-6 max-w-3xl z-20`}>
            {featuredLogo ? (
              <img 
                src={`https://image.tmdb.org/t/p/w500${featuredLogo}`} 
                alt={featuredMovie.title || featuredMovie.name} 
                className="w-[70%] md:w-[80%] max-w-[400px] md:max-w-[600px] object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] pb-2" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <h1 className={`${config.titleStyle} text-2xl md:text-8xl`}>
                {featuredMovie.title || featuredMovie.name}
              </h1>
            )}
            <p className={`text-gray-200 text-xs md:text-2xl line-clamp-2 md:line-clamp-3 font-medium italic drop-shadow-lg ${config.font}`}>
              {featuredMovie.overview}
            </p>
            <div className="flex items-center gap-2 md:gap-4 pt-2 md:pt-4">
              <button 
                onClick={() => onSelectMovie(featuredMovie)}
                className={`${config.buttonPrimary} px-4 md:px-12 py-2 md:py-4 font-black uppercase tracking-widest flex items-center gap-2 md:gap-3 transition-transform shadow-2xl hover:scale-105 active:scale-95 text-[10px] md:text-base`}
              >
                <Play fill="currentColor" size={16} className="md:w-6 md:h-6" /> Assistir
              </button>
              <button 
                onClick={() => onSelectMovie(featuredMovie)}
                className={`${config.buttonSecondary} px-4 md:px-12 py-2 md:py-4 font-black uppercase tracking-widest flex items-center gap-2 md:gap-3 transition-transform hover:scale-105 active:scale-95 text-[10px] md:text-base`}
              >
                <Info size={16} className="md:w-6 md:h-6" /> Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Rows */}
      <div className={`relative z-30 pb-20 space-y-8 md:space-y-12 px-2 md:px-0 ${provider === 'Disney+' ? '' : '-mt-20 md:-mt-48'}`}>
        
        {provider === 'Disney+' && (
          <div className="flex overflow-x-auto no-scrollbar gap-4 md:gap-6 px-4 md:px-12 mb-12 relative z-40 py-4 mt-4">
            {DISNEY_BRANDS.map((brand) => {
              const backdropUrl = brand.backdrop;

              return (
                <div 
                  key={brand.id}
                  onClick={() => navigate(`/universe/${brand.id}`)}
                  className={`relative aspect-video min-w-[140px] md:min-w-[200px] flex-none rounded-lg shadow-[rgba(0,0,0,0.69)_0px_26px_30px_-10px,rgba(0,0,0,0.73)_0px_16px_10px_-10px] cursor-pointer overflow-hidden transition-all duration-300 border-[3px] group bg-[linear-gradient(rgb(48,50,62),rgb(30,31,42))] border-white/10 hover:border-white/80 hover:scale-105 hover:shadow-[rgba(0,0,0,0.8)_0px_40px_58px_-16px,rgba(0,0,0,0.72)_0px_30px_22px_-10px]`}
                >
                  <video 
                    autoPlay 
                    loop 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover transition-opacity duration-500 rounded-lg absolute inset-0 z-0 opacity-0 group-hover:opacity-100`}
                  >
                    <source src={brand.video} type="video/mp4" />
                  </video>
                  {backdropUrl && (
                    <img 
                      src={backdropUrl} 
                      alt="" 
                      className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 scale-110 opacity-100 group-hover:opacity-0`} 
                      referrerPolicy="no-referrer" 
                    />
                  )}
                  <div className="absolute inset-0 bg-transparent group-hover:bg-black/40 transition-colors z-10" />
                  {/* For Marvel and StarWars, remove the invert filter since their original colors look better against the dark background */}
                  <img src={brand.logo} alt={brand.name} className={`absolute inset-0 w-full h-full object-contain z-20 p-4 md:p-8 opacity-100 drop-shadow-2xl transition-transform group-hover:scale-110 ${['marvel', 'star-wars', 'national'].includes(brand.id) ? '' : 'brightness-0 invert'}`} style={{ filter: ['marvel', 'star-wars', 'national'].includes(brand.id) ? 'drop-shadow(0px 5px 10px rgba(0,0,0,0.5))' : 'brightness(0) invert(1) drop-shadow(0px 5px 10px rgba(0,0,0,0.5))' }} referrerPolicy="no-referrer" />
                </div>
              );
            })}
          </div>
        )}

        {/* Top 10 Section */}
        <Row 
          title={`Top 10 ${provider} Hoje`}
          movies={movies.slice(0, 10)}
          isLargeRow={true}
          onSelectMovie={onSelectMovie}
          onToggleMyList={onToggleMyList}
          onToggleFavorite={onToggleFavorite}
          myListIds={myListIds}
          favoriteIds={favoriteIds}
          cardStyle={config.cardStyle}
        />

        {Object.entries(moviesByGenre).map(([genre, genreMovies]) => (
          <Row 
            key={genre}
            title={genre}
            movies={genreMovies}
            onSelectMovie={onSelectMovie}
            onToggleMyList={onToggleMyList}
            onToggleFavorite={onToggleFavorite}
            myListIds={myListIds}
            favoriteIds={favoriteIds}
            cardStyle={config.cardStyle}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default ProviderPage;
