import React, { useState, useEffect, useMemo, useCallback, createContext, useContext, useRef, Suspense } from 'react';
import OneSignal from 'react-onesignal';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import Banner from './components/Banner';
import Row from './components/Row';
import NetflixPlayer from './components/NetflixPlayer';
import VideoPlayer from './components/VideoPlayer';
import CustomUrlModal from './components/CustomUrlModal';
import MovieDetailsModal from './components/MovieDetailsModal';
import WatchPartyModal from './components/WatchPartyModal';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import ProfileSelection from './components/ProfileSelection';
import IntroVignette from './components/IntroVignette';
import StreamingHub from './components/StreamingHub';
import CollectionsCarousel from './components/CollectionsCarousel';
import { CATEGORIES } from './constants';
import tmdb, { requests, getMovieLogo } from './services/tmdb';
import { notificationService } from './services/notificationService';
import { Movie, Profile, WatchHistory, ScannerState, ReScannerState, CollectionScannerState, MyList, AppSettings, Episode, StreamingProvider } from './types';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'motion/react';
import ContinueWatchingRow from './components/ContinueWatchingRow';
import NewReleasesRow from './components/NewReleasesRow';
import CinemaRow from './components/CinemaRow';
import Top10Row from './components/Top10Row';
import AppInfo from './components/AppInfo';
import UniverseView from './components/UniverseView';

const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const ProfileDashboard = React.lazy(() => import('./components/ProfileDashboard'));
const ProviderPage = React.lazy(() => import('./components/ProviderPage'));
const AdvancedSearch = React.lazy(() => import('./components/AdvancedSearch'));

import { Loader2, Play, Pause, Square, RefreshCcw, Sparkles, ChevronLeft, Plus, Search, Calendar, Heart, Settings, Cloud, TrendingUp, Home, User as UserIcon, List, ThumbsUp, Send, Bookmark, Shield, ArrowLeft, History, Zap, Ghost, CheckCircle2, ShieldCheck, LogOut, X, Star, Clock, Check, LayoutGrid, Activity, ArrowRight, UserCircle, Map, ListPlus, Shuffle } from 'lucide-react';

// Basic title cleaner to replace AI cleaning
const cleanTitle = (fileName: string) => {
  let name = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
  name = name.replace(/[._]/g, ' '); // Replace dots and underscores with spaces
  name = name.replace(/S\d+E\d+/gi, ''); // Remove S01E01 etc
  name = name.replace(/1080p|720p|4k|2160p|h264|h265|x264|x265|web-dl|bluray|dual|audio|dublado/gi, ''); // Remove common torrent tags
  name = name.replace(/\(\d{4}\)/g, ''); // Remove year in parenthesis
  name = name.replace(/\[.*?\]/g, ''); // Remove everything in brackets
  return name.trim();
};

const PROVIDER_COLORS: Record<string, string> = {
  'Netflix': '#e50914',
  'Disney+': '#006e99',
  'Max': '#0047ff',
  'Prime Video': '#00a8e1',
  'Apple TV+': '#ffffff',
  'Globoplay': '#fb0d1b',
  'Paramount+': '#0064ff'
};

const FRANCHISES: { 
  id: string, 
  name: string, 
  keywords: string[], 
  color: string, 
  bg: string, 
  accent: string, 
  icon: any, 
  description: string, 
  poster?: string, 
  backdrop?: string,
  logo?: string 
}[] = [
  { id: 'marvel', name: 'Marvel', keywords: ['marvel', 'avengers', 'vingadores', 'spider-man', 'spiderman', 'iron man', 'thor', 'captain america', 'capitão américa', 'black panther', 'pantera negra', 'guardians of the galaxy', 'guardiões da galáxia', 'x-men'], color: '#e62429', bg: 'bg-[#0f0f0f]', accent: 'text-red-600', icon: Zap, description: 'O Universo Cinematográfico mais épico da história. Uma saga interligada de heróis lutando pela sobrevivência da humanidade contra ameaças universais.', backdrop: 'https://image.tmdb.org/t/p/original/mDf935S7qbZOSo9u3YmBAzY6nU2.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Marvel_Logo.svg' },
  { id: 'star-wars', name: 'Star Wars', keywords: ['star wars', 'mandalorian', 'obi-wan', 'skywalker', 'jedi', 'sith', 'andor'], color: '#ffe81f', bg: 'bg-black', accent: 'text-yellow-400', icon: Ghost, description: 'Uma galáxia muito, muito distante... Acompanhe a eterna luta entre a Luz e o Lado Sombrio pela liberdade de todos os sistemas estelares.', backdrop: 'https://image.tmdb.org/t/p/original/9v8X8tB8bS19K6G2w6N8fXG8gC.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Star_Wars_Logo.svg' },
  { id: 'dc', name: 'DC Comics', keywords: ['dc comics', 'batman', 'superman', 'wonder woman', 'mulher maravilha', 'justice league', 'liga da justiça', 'aquaman', 'the flash', 'joker', 'coringa'], color: '#0476f2', bg: 'bg-[#000d1a]', accent: 'text-blue-500', icon: Shield, description: 'Onde nascem as lendas e os deuses caminham. De Gotham a Metrópolis, os maiores vigilantes do multiverso protegem a justiça.', backdrop: 'https://image.tmdb.org/t/p/original/8Y736u7S99K3NBSmToIdpY2S8uF.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/DC_Comics_logo.svg' },
  { id: 'harry-potter', name: 'Harry Potter', keywords: ['harry potter', 'pedra filosofal', 'câmara secreta', 'prisioneiro de azkaban', 'cálice de fogo', 'ordem da fênix', 'enigma do príncipe', 'relíquias da morte', 'animais fantásticos'], color: '#ffd700', bg: 'bg-[#0a0a0c]', accent: 'text-yellow-500', icon: Sparkles, description: 'A magia vive aqui. Entre no mundo bruxo e descubra os segredos de Hogwarts na batalha definitiva contra o Lorde das Trevas.', backdrop: 'https://image.tmdb.org/t/p/original/ve9P65Tf0JAs1GgM2Y8V4v5N5Wb.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Harry_Potter_wordmark.svg' },
  { id: 'lord-of-the-rings', name: 'Terra Média', keywords: ['senhor dos anéis', 'lord of the rings', 'hobbit', 'sociedade do anel', 'duas torres', 'retorno do rei'], color: '#9d7b3c', bg: 'bg-[#0f0e0d]', accent: 'text-[#d4af37]', icon: History, description: 'A jornada épica de Tolkien pela Terra Média. Três anéis para os Reis-Elfos... e um para o Senhor do Escuro.', backdrop: 'https://image.tmdb.org/t/p/original/lX999O9rKpsS0S6A1d1K3kF9fWb.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/22/The_Lord_of_the_Rings_logo.svg' },
  { id: 'fast-furious', name: 'Fast & Furious', keywords: ['velozes e furiosos', 'fast & furious', 'toretto'], color: '#d00', bg: 'bg-[#0a0a0a]', accent: 'text-red-700', icon: Zap, description: 'Velocidade, família e adrenalina pura. Acompanhe Dominic Toretto e sua equipe em missões impossíveis ao redor do mundo.', backdrop: 'https://image.tmdb.org/t/p/original/9n2tLpS0STIyuQq9S8fXG8gC.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Fast_%26_Furious_logo.png' },
  { id: 'disney', name: 'Disney Classics', keywords: ['rei leão', 'lion king', 'aladdin', 'pequena sereia', 'bela e a fera', 'cinderela', 'branca de neve', 'pinóquio', 'frozen'], color: '#009dff', bg: 'bg-[#000a1a]', accent: 'text-blue-300', icon: Sparkles, description: 'Onde os sonhos se tornam realidade. Clássicos atemporais que moldaram gerações em contos de fadas e aventuras mágicas.', backdrop: 'https://image.tmdb.org/t/p/original/7Ry9S0SSTIyuQq9S8fXG8gC.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg' },
  { id: 'pixar', name: 'Pixar', keywords: ['toy story', 'procurando nemo', 'finding nemo', 'monstros s.a', 'carro', 'cars', 'divertida mente', 'inside out', 'coco', 'viva a vida'], color: '#00aae4', bg: 'bg-[#00121a]', accent: 'text-blue-400', icon: Sparkles, description: 'Imaginação sem limites em cada frame. Pioneiros na animação digital, contando histórias que tocam o coração de jovens e adultos.', backdrop: 'https://image.tmdb.org/t/p/original/hY6vshsh0rIn4766u63NBSmToIdp.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Pixar_logo.svg' },
  { id: 'national', name: 'National Geographic', keywords: ['cosmos', 'natureza', 'terra', 'vida', 'ocean', 'planeta', 'national geographic'], color: '#ffcc00', bg: 'bg-[#1a1600]', accent: 'text-yellow-500', icon: Sparkles, description: 'Explorando nosso mundo misterioso e as maravilhas da natureza.', backdrop: 'https://image.tmdb.org/t/p/original/aInel5k9AetCg2Vf3hR1Iq6n2eD.jpg', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/National_Geographic_logo_text.svg' },
  { id: 'horror', name: 'Terror & Horror', keywords: ['halloween', 'pânico', 'scream', 'invocação do mal', 'conjuring', 'it a coisa', 'sexta-feira 13', 'friday the 13th', 'terror', 'horror', 'sobrenatural'], color: '#ff0000', bg: 'bg-[#050000]', accent: 'text-red-600', icon: Ghost, description: 'Enfrente seus maiores medos.', backdrop: 'https://image.tmdb.org/t/p/original/5mUV0SRAAnT0UuLpAbfHshf6YmF.jpg' },
  { id: 'adventure', name: 'Aventura', keywords: ['aventura', 'adventure', 'exploração', 'journey', 'indiana jones', 'jumanji', 'piratas do caribe'], color: '#22c55e', bg: 'bg-[#061a0f]', accent: 'text-green-500', icon: Map, description: 'Grandes jornadas em terras desconhecidas.', backdrop: 'https://image.tmdb.org/t/p/original/620hn0I9pmS3v0YAs9XvSAnR039.jpg' },
  { id: 'fantasy', name: 'Fantasia', keywords: ['fantasia', 'fantasy', 'magia', 'magic', 'bruxo', 'wizard', 'dragão', 'dragon'], color: '#a855f7', bg: 'bg-[#150a1f]', accent: 'text-purple-500', icon: Sparkles, description: 'Onde o impossível ganha vida.', backdrop: 'https://image.tmdb.org/t/p/original/69Sns8WoETA0q6Zp3p6Wp5hr6In.jpg' },
  { id: 'action', name: 'Ação', keywords: ['ação', 'action', 'combate', 'explosão', 'tiro', 'gun', 'fight', 'luta'], color: '#ef4444', bg: 'bg-[#1a0505]', accent: 'text-red-500', icon: Zap, description: 'Pura adrenalina e combates épicos.', backdrop: 'https://image.tmdb.org/t/p/original/mDf935S7qbZOSo9u3YmBAzY6nU2.jpg' },
  { id: 'anime', name: 'Mundo Anime', keywords: ['dragon ball', 'naruto', 'one piece', 'gibi', 'anime', 'mangá', 'manga'], color: '#ff6600', bg: 'bg-[#1a0f00]', accent: 'text-orange-500', icon: Zap, description: 'A arte e a cultura japonesa em sua forma mais vibrante.', backdrop: 'https://image.tmdb.org/t/p/original/3O6Yp7YlU6p4uN3m5Y6p4uN3m5Y.jpg' },
];

// Theme Context for immersive provider experience
const ThemeContext = createContext<{ 
  theme: string; 
  setTheme: (t: string) => void; 
  providerData: any;
}>({ 
  theme: 'default', 
  setTheme: () => {}, 
  providerData: null 
});

export const useAppTheme = () => useContext(ThemeContext);

const HomeView = React.memo(({ 
  myMovies, 
  streamingProviders, 
  continueWatching, 
  newMovies, 
  top10Movies, 
  top10Series, 
  caraNovaMovies, 
  moviesByGenre, 
  handleSelectMovie, 
  handlePlayMovie,
  toggleMyList, 
  toggleFavorite, 
  myListIds, 
  favoriteIds, 
  setViewAllGenre, 
  setIsModalOpen, 
  profile,
  cinemaMovies,
  searchQuery,
  searchResults,
  categories,
  franchises
}: any) => {
  const navigate = useNavigate();
  
  const bannerMovies = useMemo(() => {
    if (myMovies.length === 0) return [];
    // Combine some new releases, top movies and random ones for the rotating banner
    const pool = [...newMovies, ...top10Movies, ...myMovies.slice(0, 20)];
    return [...new Set(pool)].sort(() => 0.5 - Math.random()).slice(0, 10);
  }, [myMovies, newMovies, top10Movies]);

  const franchiseToMovie = (f: any) => ({
    ...f,
    title: f.name,
    poster_path: f.poster || f.backdrop || f.logo,
    backdrop_path: f.backdrop || f.poster,
    logo_path: f.logo,
    overview: f.description,
    type: 'franchise',
    isFranchise: true
  });

  const franchiseMovies = useMemo(() => {
    return franchises.map(franchiseToMovie);
  }, [franchises]);

  const top10Franchises = useMemo(() => {
    return franchiseMovies.slice(0, 10);
  }, [franchiseMovies]);

  const animationFranchises = useMemo(() => {
    return franchiseMovies.filter(f => 
      f.id === 'disney' || f.id === 'pixar' || f.name.toLowerCase().includes('anime')
    );
  }, [franchiseMovies]);

  // Optimize and randomize movies per user per session to speed up rendering
  const optimizedGenreMovies = useMemo(() => {
    const optimized: Record<string, any[]> = {};
    for (const [genre, movies] of Object.entries(moviesByGenre as Record<string, any[]>)) {
      // Randomize and slice to 10 for massive performance boost
      optimized[genre] = [...movies].sort(() => 0.5 - Math.random()).slice(0, 10);
    }
    return optimized;
  }, [moviesByGenre, profile?.id]);

  if (searchQuery) {
    return (
      <div
        key="search-mode"
        className="pt-24 px-4 md:px-12 min-h-screen animate-fade-in"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter">Resultados para: <span className="text-red-600">"{searchQuery}"</span></h2>
          <div className="flex items-center gap-4">
             <span className="bg-white/5 border border-white/10 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 italic">
               {searchResults.length} Títulos Encontrados
             </span>
          </div>
        </div>

        {searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] rounded-[4rem] border-2 border-dashed border-white/5">
            <Search className="text-gray-800 mb-8 animate-float" size={80} />
            <h3 className="text-3xl font-black text-white italic uppercase mb-2">Sem resultados na biblioteca</h3>
            <p className="text-gray-500 font-bold max-w-sm text-center">Tente buscar por termos mais genéricos ou use a Busca Premium.</p>
            <button 
              onClick={() => navigate('/search')}
              className="mt-10 px-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest italic hover:scale-105 transition-all shadow-xl"
            >
              Ir para Busca Premium
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10 pb-40">
            {searchResults.map((movie: any) => (
              <div
                key={movie.id}
                className="relative cursor-pointer group hover:-translate-y-2 transition-transform animate-fade-in"
                onClick={() => handleSelectMovie(movie)}
              >
                <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/10 group-hover:border-red-600 transition-colors duration-300 shadow-xl relative">
                   <img 
                    src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={movie.title || movie.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                   <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-black text-sm uppercase italic truncate leading-none">{movie.title || movie.name}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      key="home"
      className="animate-fade-in relative"
    >
      {/* 🚀 PARTICLES AMBIENCE RED */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-screen opacity-20">
         {[...Array(15)].map((_, i) => (
            <motion.div
               key={i}
               initial={{ y: '100vh', x: Math.random() * window.innerWidth, opacity: 0 }}
               animate={{ 
                  y: '-10vh', 
                  x: Math.random() * window.innerWidth, 
                  opacity: [0, 1, 0] 
               }}
               transition={{ 
                  duration: 10 + Math.random() * 20, 
                  repeat: Infinity, 
                  ease: 'linear',
                  delay: Math.random() * 10
               }}
               className="absolute w-1 h-1 bg-red-500 rounded-full shadow-[0_0_10px_rgba(220,38,38,1)]"
            />
         ))}
      </div>

      <div className="relative z-10">
      {bannerMovies.length > 0 ? (
        <Banner 
          movies={bannerMovies}
          onPlay={(m, url) => handlePlayMovie(m, url)} 
          onInfo={handleSelectMovie}
        />
      ) : (
        <Banner 
          onPlay={(m, url) => handlePlayMovie(m, url)} 
          onInfo={handleSelectMovie}
        />
      )}

      <div className="pb-4 mt-[-40px] md:mt-[-100px] relative z-20 space-y-6 md:space-y-8">
        {/* NOVO HERO DASHBOARD INTERATIVO */}
        <section className="px-4 md:px-12 flex flex-col md:flex-row gap-4 md:gap-6 items-stretch mb-8 md:mb-16 -mt-8 relative z-30">
          {/* Quick Resume Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="flex-1 bg-gradient-to-br from-black/80 to-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] group cursor-pointer relative overflow-hidden"
            onClick={() => {
               if(continueWatching.length > 0) {
                 handleSelectMovie(continueWatching[0]);
               }
            }}
          >
            <div className="absolute inset-0 bg-red-600/5 group-hover:bg-red-600/10 transition-colors duration-500" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,1)]" />
                <span className="text-[10px] md:text-xs font-black text-red-500 uppercase tracking-[0.3em]">{profile ? `Bem-vindo volta, ${profile.name}` : 'Bem-vindo ao NetPlay'}</span>
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-white italic tracking-tighter uppercase leading-[0.9]">
                {continueWatching.length > 0 ? continueWatching[0].title || continueWatching[0].name : 'O Radar de Hoje'}
              </h3>
              <p className="text-gray-400 font-bold text-xs mt-2 uppercase tracking-widest">{continueWatching.length > 0 ? "Continue de onde parou" : "Descubra novos títulos incríveis"}</p>
            </div>
            
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:border-red-500 transition-all shadow-xl relative z-10 shrink-0">
               <Play size={28} className="text-white ml-2" fill="white" />
            </div>
            
            {continueWatching.length > 0 && (
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen pointer-events-none fade-mask-left">
                <img src={continueWatching[0].backdrop_path?.startsWith('http') ? continueWatching[0].backdrop_path : `https://image.tmdb.org/t/p/w1280/${continueWatching[0].backdrop_path}`} className="w-full h-full object-cover" alt="" />
              </div>
            )}
          </motion.div>
          
          {/* Action Stats / Shortcuts */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 flex-none md:w-[400px]">
            <motion.div 
               whileHover={{ scale: 1.05 }}
               onClick={() => navigate('/trending')}
               className="bg-black/60 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-all shadow-xl relative overflow-hidden"
             >
               <TrendingUp size={24} className="text-yellow-500 mb-2 group-hover:scale-110 transition-transform" />
               <span className="text-white font-black text-sm md:text-base italic uppercase tracking-tighter">Em Alta</span>
            </motion.div>
            
            <motion.div 
               whileHover={{ scale: 1.05 }}
               onClick={() => navigate('/universe')}
               className="bg-black/60 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-all shadow-xl relative overflow-hidden"
             >
               <Sparkles size={24} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
               <span className="text-white font-black text-sm md:text-base italic uppercase tracking-tighter">Universos</span>
            </motion.div>

            <motion.div 
               whileHover={{ scale: 1.05 }}
               onClick={() => navigate('/mylist')}
               className="bg-black/60 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-all shadow-xl relative overflow-hidden"
             >
               <ListPlus size={24} className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
               <span className="text-white font-black text-sm md:text-base italic uppercase tracking-tighter">Minha Lista</span>
            </motion.div>

            <motion.div 
               initial={{ backgroundPosition: '0% 50%' }}
               animate={{ backgroundPosition: '100% 50%' }}
               transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
               whileHover={{ scale: 1.05 }}
               onClick={() => {
                  if(myMovies.length > 0) {
                     const random = myMovies[Math.floor(Math.random() * myMovies.length)];
                     handleSelectMovie(random);
                  }
               }}
               className="bg-gradient-to-br from-red-900/40 via-purple-900/40 to-blue-900/40 bg-[length:200%_200%] backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-center justify-center cursor-pointer group shadow-xl relative overflow-hidden"
             >
               <Shuffle size={24} className="text-white mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
               <span className="text-white font-black text-sm md:text-base italic uppercase tracking-tighter drop-shadow-md">Surpreenda</span>
            </motion.div>
          </div>
        </section>

        {/* RADAR DE TENDÊNCIAS MARQUEE */}
        <div className="w-full overflow-hidden bg-red-600/10 border-y border-red-500/20 py-2 mb-8 md:mb-12 relative flex items-center">
           <div className="absolute left-0 w-20 h-full bg-gradient-to-r from-black to-transparent z-10" />
           <div className="absolute right-0 w-20 h-full bg-gradient-to-l from-black to-transparent z-10" />
           
           <motion.div 
             animate={{ x: [0, -1035] }}
             transition={{ duration: 20, ease: 'linear', repeat: Infinity }}
             className="flex gap-8 items-center whitespace-nowrap"
           >
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-8 items-center">
                  {['TENDÊNCIA GLOBAL', 'MAIS ASSISTIDOS', 'TOP BILHETERIA', 'CRÍTICA ACLAMADA', 'LOUCURA MULTIVERSO', 'AÇÃO EXPLOSIVA'].map((text, j) => (
                     <div key={j} className="flex items-center gap-4">
                        <span className="text-red-500 font-bold">⚡</span>
                        <span className="text-[10px] md:text-sm font-black text-white/50 uppercase tracking-[0.3em]">{text}</span>
                     </div>
                  ))}
                </div>
              ))}
           </motion.div>
        </div>

        <StreamingHub 
          onSelectProvider={(p: any) => navigate(`/provider/${p}`)} 
          streamingProviders={streamingProviders}
        />

        {/* CYBER SHORTCUTS */}
        <section className="px-4 md:px-12 flex flex-wrap gap-2 md:gap-3 mb-8 md:mb-12 relative z-20">
           {['Filmes', 'Séries', 'Documentários', 'Anime', 'Infantil', 'Ação', 'Terror'].map((tag, idx) => (
             <motion.button 
               key={tag} 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: idx * 0.05 }}
               onClick={() => navigate(`/genre/${tag}`)} 
               className="relative px-5 py-2 overflow-hidden bg-[#0f0f0f] border border-white/10 rounded-full group hover:border-red-500/50 transition-colors shadow-lg"
             >
               <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/10 to-red-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
               <span className="relative z-10 text-[10px] md:text-xs font-black text-white/60 group-hover:text-white uppercase tracking-widest italic transition-colors">
                 {tag}
               </span>
             </motion.button>
           ))}
        </section>

        {/* 🌟 MEGA UI: AI HYPE STATS */}
        <section className="px-4 md:px-12 mb-8 md:mb-12">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/60 border border-white/5 rounded-[2rem] p-6 relative overflow-hidden backdrop-blur-3xl group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[50px] -mr-10 -mt-10 group-hover:bg-red-600/20 transition-colors" />
                 <Activity size={24} className="text-red-500 mb-4" />
                 <h4 className="text-white font-black text-3xl md:text-4xl italic uppercase tracking-tighter leading-none mb-1">98% Hype</h4>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Nível de Energia da Comunidade</p>
                 <div className="w-full bg-white/5 h-1 mt-4 rounded-full overflow-hidden">
                    <div className="bg-red-600 w-[98%] h-full rounded-full animate-pulse" />
                 </div>
              </div>
              <div className="bg-black/60 border border-white/5 rounded-[2rem] p-6 relative overflow-hidden backdrop-blur-3xl group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[50px] -mr-10 -mt-10 group-hover:bg-blue-600/20 transition-colors" />
                 <Star size={24} className="text-blue-500 mb-4" />
                 <h4 className="text-white font-black text-3xl md:text-4xl italic uppercase tracking-tighter leading-none mb-1">Top 10</h4>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Listas Atualizadas a cada 10m</p>
                 <div className="flex -space-x-4 mt-3">
                    {top10Movies.slice(0,4).map((m: any, i: number) => (
                      <div key={m.id} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden relative z-[4-i]">
                        <img src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                 </div>
              </div>
              <div className="bg-black/60 border border-white/5 rounded-[2rem] p-6 relative overflow-hidden backdrop-blur-3xl group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[50px] -mr-10 -mt-10 group-hover:bg-purple-600/20 transition-colors" />
                 <Zap size={24} className="text-purple-500 mb-4" />
                 <h4 className="text-white font-black text-3xl md:text-4xl italic uppercase tracking-tighter leading-none mb-1">Radar.AI</h4>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Seu Motor Neural Ativo</p>
                 <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-white/50 uppercase">
                    <div className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-ping" />
                    Buscando novas joias...
                 </div>
              </div>
           </div>
        </section>

        {franchises && franchises.length > 0 && (
          <Row 
            title="Sagas & Coleções"
            movies={franchiseMovies}
            onSelectMovie={(f: any) => navigate(`/universe/${f.id}`)}
            type="circle"
          />
        )}

        {/* 🌟 MEGA UI: LIVE CHANNELS / TRAILER HUB */}
        {newMovies.length > 0 && (
          <section className="px-4 md:px-12 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1 items-end h-5">
                <div className="w-1.5 h-3 bg-red-600 animate-pulse delay-75" />
                <div className="w-1.5 h-5 bg-red-600 animate-pulse delay-150" />
                <div className="w-1.5 h-4 bg-red-600 animate-pulse delay-300" />
              </div>
              <h3 className="text-xl md:text-3xl font-black text-white italic uppercase tracking-tighter">Live Trailers Hub</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
               {newMovies.slice(0, 3).map((movie: any) => (
                  <motion.div 
                    key={`live-${movie.id}`}
                    whileHover={{ scale: 1.02 }}
                    className="aspect-video bg-black rounded-3xl overflow-hidden relative cursor-pointer group border border-white/10"
                    onClick={() => handleSelectMovie(movie)}
                  >
                     <img src={movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/w780/${movie.backdrop_path}`} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-all duration-700" alt="" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                     
                     <div className="absolute top-4 left-4 bg-red-600 text-white text-[8px] font-black italic uppercase px-2 py-1 rounded shadow-lg flex items-center gap-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-ping" />
                        ESTREIA
                     </div>

                     <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div>
                           <h4 className="text-white font-black italic uppercase text-lg md:text-xl tracking-tighter leading-none mb-1">{movie.title || movie.name}</h4>
                           <p className="text-gray-400 font-bold text-[10px] uppercase">{movie.genres || 'Ação'}</p>
                        </div>
                        <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 group-hover:bg-red-600 transition-colors shrink-0">
                           <Play size={16} className="text-white ml-0.5" fill="white" />
                        </div>
                     </div>
                  </motion.div>
               ))}
            </div>
          </section>
        )}

        {top10Franchises.length > 0 && (
          <Top10Row 
            title="Top 10 Sagas Populares"
            movies={top10Franchises as any}
            onSelectMovie={(f: any) => navigate(`/universe/${f.id}`)}
          />
        )}

        {animationFranchises.length > 0 && (
          <Row 
            title="Animações & Universos Mágicos"
            movies={animationFranchises}
            onSelectMovie={(f: any) => navigate(`/universe/${f.id}`)}
            type="standard"
          />
        )}

        {top10Movies.length > 0 && (
          <Top10Row 
            title="TOP 10 Filmes de Hoje"
            movies={top10Movies}
            onSelectMovie={handleSelectMovie}
          />
        )}

        {top10Series.length > 0 && (
          <Top10Row 
            title="TOP 10 Séries de Hoje"
            movies={top10Series}
            onSelectMovie={handleSelectMovie}
          />
        )}

        {/* 🚀 ONDA NEURAL COMPACTA */}
        <section className="space-y-4 md:space-y-6 group py-6 md:py-8 px-4 md:px-12 bg-gradient-to-b from-black/80 via-[#0a0a0a] to-transparent relative border-t border-white/5">
          
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-4 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse" />
                <h3 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-white leading-none">Onda Neural</h3>
              </div>
            </div>
            
            <button 
              className="flex items-center gap-1 md:gap-2 px-4 md:px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group scale-90 md:scale-100"
              onClick={() => navigate('/search')}
            >
              <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">Global</span>
              <ChevronLeft className="rotate-180 text-red-500 group-hover:translate-x-1 transition-transform" size={14} />
            </button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-3 md:gap-4 pb-4 snap-x -mx-4 px-4 md:mx-0 md:px-0">
            {categories.map((cat, idx) => (
              <motion.div 
                key={cat.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/genre/${cat.name}`)}
                className="relative flex items-center gap-3 min-w-[140px] md:min-w-[180px] h-14 md:h-16 rounded-2xl overflow-hidden group/card cursor-pointer bg-white/5 border border-white/10 snap-center shrink-0 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 md:w-16 h-full relative shrink-0">
                   <img 
                     src={cat.backdrop} 
                     className="w-full h-full object-cover opacity-50 group-hover/card:opacity-80 transition-opacity mix-blend-luminosity group-hover/card:mix-blend-normal" 
                     referrerPolicy="no-referrer" 
                     alt={cat.name}
                   />
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/80 group-hover/card:to-transparent transition-colors" />
                </div>
                
                <div className="flex-1 pr-3 flex items-center justify-between">
                   <h4 className="text-white font-black uppercase text-[10px] md:text-xs tracking-tighter italic whitespace-nowrap">
                     {cat.name}
                   </h4>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {profile && continueWatching.length > 0 && (
          <ContinueWatchingRow 
            title={`Continuar Assistindo como ${profile.name}`}
            movies={continueWatching}
            onSelectMovie={handleSelectMovie}
            onPlayMovie={handlePlayMovie}
            profileName={profile.name}
          />
        )}

        {myMovies.length > 0 && (
          <>
            {cinemaMovies.length > 0 && (
              <CinemaRow 
                title="Fresquinho do Cinema"
                movies={cinemaMovies}
                onSelectMovie={handleSelectMovie}
              />
            )}

            <Row 
              title="Adicionados Recentemente"
              movies={myMovies}
              type="wide"
              onSelectMovie={handleSelectMovie}
              onToggleMyList={toggleMyList}
              onToggleFavorite={toggleFavorite}
              myListIds={myListIds}
              favoriteIds={favoriteIds}
              onViewAll={setViewAllGenre}
              streamingProviders={streamingProviders}
            />

            {newMovies.length > 0 && (
              <NewReleasesRow 
                title="Lançamentos Exclusivos"
                movies={newMovies}
                onSelectMovie={handleSelectMovie}
              />
            )}

            {Object.entries(optimizedGenreMovies).map(([genre, genreMovies]: [string, any]) => (
              <Row 
                key={genre}
                title={genre}
                movies={genreMovies}
                onSelectMovie={handleSelectMovie}
                onToggleMyList={toggleMyList}
                onToggleFavorite={toggleFavorite}
                myListIds={myListIds}
                favoriteIds={favoriteIds}
                onViewAll={setViewAllGenre}
                streamingProviders={streamingProviders}
              />
            ))}
          </>
        )}
      </div>
      </div>
    </div>
  );
});

const UniverseTabView = React.memo(({ 
  franchises,
  handleSelectMovie, 
  toggleMyList, 
  toggleFavorite, 
  myListIds, 
  favoriteIds 
}: any) => {
  const { franchiseId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const activeFranchise = useMemo(() => {
    if (!franchiseId) return null;
    return franchises.find((f: any) => f.id.toString() === franchiseId);
  }, [franchiseId, franchises]);

  const filteredFranchises = useMemo(() => {
    return franchises.filter((f: any) => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'All' || f.keywords?.some((k: string) => k.toLowerCase().includes(activeFilter.toLowerCase()));
      return matchesSearch && matchesFilter;
    });
  }, [franchises, searchTerm, activeFilter]);

  const promotedFranchises = useMemo(() => franchises.slice(0, 3), [franchises]);

  return (
    <motion.div
      key="universe-mega"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen relative bg-[#050505] overflow-x-hidden"
    >
      {/* Fast Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-black">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black" />
      </div>

      <AnimatePresence mode="wait">
        {!activeFranchise ? (
          <motion.div
            key="universe-catalog"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="pt-24 md:pt-40 pb-40"
          >
            {/* Cinematic Header */}
            <div className="px-6 md:px-12 max-w-7xl mx-auto mb-12 md:mb-32">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-3 mb-6"
              >
                <div className="h-px w-8 bg-red-600" />
                <span className="text-red-500 font-black uppercase tracking-[0.4em] text-[8px] md:text-[10px] italic">Nexus Multiverso</span>
              </motion.div>
              
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 md:gap-12">
                <div>
                  <h2 className="text-4xl md:text-[10rem] font-black text-white uppercase tracking-tighter leading-[0.8] italic mb-6">Universos</h2>
                  <p className="text-gray-500 font-bold text-xs md:text-2xl italic max-w-2xl border-l-2 md:border-l-4 border-red-600/30 pl-4 md:pl-8">
                    Explore dimensões infinitas. Navegue por sagas completas com curadoria de alta fidelidade.
                  </p>
                </div>
                
                <div className="flex flex-col gap-4 md:gap-6">
                   <div className="flex items-center bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] md:rounded-[2rem] px-6 md:px-8 py-3 md:py-4 focus-within:border-red-600 transition-all shadow-2xl">
                      <Search size={18} className="text-gray-500 mr-3 md:mr-4" />
                      <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar..." 
                        className="bg-transparent text-[10px] md:text-sm font-black italic text-white outline-none w-full md:w-64 placeholder-gray-700 uppercase"
                      />
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {['All', 'Marvel', 'DC', 'Star Wars', 'Animation'].map(f => (
                        <button 
                          key={f}
                          onClick={() => setActiveFilter(f)}
                          className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
                        >
                          {f}
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            </div>

            {searchTerm === '' && (
              <div className="px-6 md:px-12 max-w-7xl mx-auto mb-12">
                 <p className="text-gray-500 font-bold italic tracking-widest text-[10px] uppercase">Selecione uma saga para explorar</p>
              </div>
            )}

            {/* Featured Universe Carousel */}
            {promotedFranchises.length > 0 && searchTerm === '' && (
               <div className="px-4 mb-12 md:mb-24 group">
                  <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8 px-4 md:px-8">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-yellow-500" size={16} />
                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[9px] md:text-xs italic">Destaques do Multiverso</h3>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 md:gap-5 overflow-x-auto pb-4 px-4 md:px-8 no-scrollbar snap-x">
                        {promotedFranchises.map((franchise: any) => (
                          <motion.div 
                            key={`promoted-${franchise.id}`}
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative flex-none w-[90px] md:w-[140px] aspect-[2/3] rounded-[1rem] md:rounded-[1.5rem] overflow-hidden border border-white/5 cursor-pointer snap-center shadow-2xl group/card bg-[#0a0a0a]"
                            onClick={() => navigate(`/universe/${franchise.id}`)}
                          >
                             <img src={franchise.poster || franchise.backdrop} className="w-full h-full object-cover opacity-60 group-hover/card:opacity-100 transition-all duration-700 group-hover/card:scale-110" referrerPolicy="no-referrer" />
                             <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
                             
                             <div className="absolute inset-0 flex flex-col justify-end p-2 md:p-3">
                                {franchise.logo ? (
                                  <img src={franchise.logo} className="h-4 md:h-8 object-contain mb-1 md:mb-2 drop-shadow-2xl mx-auto" referrerPolicy="no-referrer" />
                                ) : (
                                  <h4 className="text-[8px] md:text-xs font-black text-white italic uppercase tracking-tighter mb-1 md:mb-2 text-center leading-tight">{franchise.name}</h4>
                                )}
                                <div className="flex items-center justify-center">
                                   <div className="px-1.5 py-0.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full">
                                      <span className="text-[5px] md:text-[6px] font-black text-white/40 uppercase tracking-widest leading-none">{franchise.movies.length} Títulos</span>
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                        ))}
                    </div>
                  </div>
               </div>
            )}

            {/* Category Carousels */}
            <div className="space-y-16 pb-20">
              {/* TOP 10 SAGAS (Portrait Row) */}
              {searchTerm === '' && activeFilter === 'All' && (
                <div className="pl-6 md:pl-12">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                      <h3 className="text-xl md:text-3xl font-black text-white italic tracking-widest uppercase">Top 10 Sagas do Momento</h3>
                   </div>
                   <div className="flex overflow-x-auto no-scrollbar gap-12 md:gap-16 pb-8 snap-x px-8">
                     {promotedFranchises.slice(0, 10).map((franchise: any, idx: number) => (
                       <motion.div
                         key={`top10-saga-${franchise.id}`}
                         whileHover={{ y: -8 }}
                         className="relative flex-none w-[110px] md:w-[160px] aspect-[2/3] cursor-pointer group/card snap-center"
                         onClick={() => navigate(`/universe/${franchise.id}`)}
                       >
                          <div className="absolute -left-8 md:-left-12 bottom-0 z-0 pointer-events-none">
                            <span className="text-[8rem] md:text-[14rem] font-black leading-none italic select-none
                              bg-gradient-to-t from-gray-800 to-white/20 bg-clip-text text-transparent
                              transition-all duration-700 group-hover/card:from-red-900 group-hover/card:to-red-500
                              inline-block"
                            >
                              {idx + 1}
                            </span>
                          </div>
                          
                          <div className="w-full h-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 group-hover/card:border-red-600 transition-all duration-500 shadow-2xl relative z-10 bg-black">
                            <img 
                              src={franchise.poster || franchise.backdrop} 
                              className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 group-hover/card:scale-105 transition-all duration-700"
                              alt={franchise.name}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            {franchise.logo && (
                              <img src={franchise.logo} className="absolute bottom-6 left-4 right-4 h-6 md:h-10 mx-auto object-contain z-20 drop-shadow-2xl" referrerPolicy="no-referrer" />
                            )}
                          </div>
                       </motion.div>
                     ))}
                   </div>
                </div>
              )}

              {/* ACTION & ANIMATION SPECIALS */}
              {searchTerm === '' && activeFilter === 'All' && (
                <div className="pl-6 md:pl-12">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
                      <h3 className="text-xl md:text-3xl font-black text-white italic tracking-widest uppercase">Animações & Infantis</h3>
                   </div>
                   <div className="flex overflow-x-auto no-scrollbar gap-6 pb-8 snap-x">
                     {franchises.filter((f: any) => 
                        f.id === 'disney' || f.id === 'pixar' || f.name.toLowerCase().includes('anime') || f.name.toLowerCase().includes('animation')
                     ).map((franchise: any) => (
                        <motion.div
                          key={`anim-${franchise.id}`}
                          whileHover={{ scale: 1.05 }}
                          className="relative group cursor-pointer flex-none w-[110px] md:w-[160px] snap-center"
                          onClick={() => navigate(`/universe/${franchise.id}`)}
                        >
                          <div className="aspect-[2/3] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 relative bg-[#0a0a0a] transition-all group-hover:border-red-600/50 shadow-2xl">
                            <img src={franchise.poster || franchise.backdrop} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                            <div className="absolute bottom-6 left-4 right-4 text-center">
                              {franchise.logo ? (
                                <img src={franchise.logo} className="h-6 md:h-10 mx-auto object-contain mb-2" referrerPolicy="no-referrer" />
                              ) : (
                                <h4 className="text-white font-black italic uppercase text-sm md:text-lg leading-none mb-2">{franchise.name}</h4>
                              )}
                              <span className="text-white/40 font-bold text-[8px] md:text-[10px] uppercase tracking-widest leading-none">{franchise.movies.length} Filmes</span>
                            </div>
                          </div>
                        </motion.div>
                     ))}
                   </div>
                </div>
              )}

              {Object.entries(
                filteredFranchises.reduce((acc: Record<string, any[]>, f: any) => {
                  let mainCategory = 'Outros';
                  if (f.movies?.length > 0) {
                    const genres = f.movies.flatMap((m: any) => m.genres?.split(',').map((g: string) => g.trim()) || []);
                    if (genres.length > 0) {
                      const counts = genres.reduce((c: any, g: string) => { c[g] = (c[g] || 0) + 1; return c; }, {});
                      mainCategory = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
                    }
                  }
                  // Override specific hardcoded clusters if necessary, but this dynamic inference works well.
                  if (!acc[mainCategory]) acc[mainCategory] = [];
                  acc[mainCategory].push(f);
                  return acc;
                }, {})
              ).sort((a: any, b: any) => b[1].length - a[1].length).map(([category, categoryFranchises]: [string, any]) => (
                <div key={category} className="pl-6 md:pl-12">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                    <h3 className="text-xl md:text-3xl font-black text-white italic tracking-widest uppercase">{category}</h3>
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar gap-6 pb-8 snap-x">
                    {categoryFranchises.map((franchise: any, idx: number) => (
                      <motion.div
                        key={franchise.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        className="relative group cursor-pointer flex-none w-[110px] md:w-[160px] snap-center"
                        onClick={() => navigate(`/universe/${franchise.id}`)}
                      >
                        <div className="aspect-[2/3] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 relative bg-[#0a0a0a] transition-all group-hover:border-red-600/50 shadow-2xl">
                          <img 
                            src={franchise.poster || franchise.backdrop} 
                            alt={franchise.name} 
                            className="w-full h-full object-cover transition-all duration-1000 opacity-60 group-hover:opacity-100 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />
                          
                          <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/5 opacity-0 group-hover:opacity-100 transition-all z-10">
                             {franchise.icon && <franchise.icon size={16} className={franchise.accent} />}
                          </div>
   
                          <div className="absolute bottom-6 left-4 right-4 text-center">
                            {franchise.logo ? (
                              <img 
                                src={franchise.logo} 
                                alt={franchise.name} 
                                className="h-6 md:h-10 mx-auto object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] mb-2 group-hover:scale-105 transition-transform" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <h4 className="text-white font-black italic uppercase text-sm md:text-lg leading-none mb-2 drop-shadow-2xl">{franchise.name}</h4>
                            )}
                            <div className="flex items-center justify-center gap-4">
                               <span className="text-white/60 font-bold text-[8px] md:text-[10px] uppercase tracking-widest">{franchise.movies.length} Títulos</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredFranchises.length === 0 && (
                <div className="py-40 text-center flex flex-col items-center">
                  <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mb-10 border border-white/10 relative overflow-hidden">
                     <div className="absolute inset-0 bg-red-600/10 blur-2xl animate-pulse"></div>
                    <Search size={48} className="text-gray-500 relative z-10" />
                  </div>
                  <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-6">Frequência Desconhecida</h3>
                  <p className="text-gray-500 max-w-md mx-auto font-bold italic text-lg opacity-60">
                    Não encontramos este universo no banco de dados. Tente outra busca.
                  </p>
                  <button 
                    onClick={() => { setSearchTerm(''); setActiveFilter('All'); }}
                    className="mt-10 text-red-600 font-black uppercase tracking-[0.3em] text-[10px] italic hover:text-white transition-colors flex items-center gap-4"
                  >
                    Reiniciar Matriz <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <UniverseView
            franchise={activeFranchise}
            onSelectMovie={handleSelectMovie}
            onBack={() => navigate('/universe')}
            onToggleMyList={toggleMyList}
            onToggleFavorite={toggleFavorite}
            myListIds={myListIds}
            favoriteIds={favoriteIds}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const TrendingView = React.memo(({ top10Movies, top10Series, handleSelectMovie, toggleMyList, toggleFavorite, myListIds, favoriteIds, continueWatching, myMovies, franchises }: any) => {
  const [activeRange, setActiveRange] = useState<'daily' | 'weekly' | 'vital'>('daily');
  const [filter, setFilter] = useState('All Genres');
  const navigate = useNavigate();

  const filteredMovies = useMemo(() => {
    let list = [...top10Movies];
    
    if (activeRange === 'vital') {
      list = [...continueWatching].slice(0, 15);
      if (list.length < 5) {
         list = [...myMovies].sort((a,b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 15);
      }
    } else if (activeRange === 'weekly') {
      const now = new Date().getTime();
      list = [...myMovies]
        .filter(m => m.created_at && (now - new Date(m.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000))
        .sort((a,b) => (b.vote_average || 0) - (a.vote_average || 0))
        .slice(0, 15);
    } else {
      const now = new Date().getTime();
      const daily = [...myMovies]
        .filter(m => m.created_at && (now - new Date(m.created_at).getTime()) < (24 * 60 * 60 * 1000));
      list = daily.length >= 5 ? daily.slice(0, 15) : [...top10Movies];
    }

    if (filter !== 'All Genres') {
       list = list.filter(m => m.genres?.toLowerCase().includes(filter.toLowerCase()));
    }

    return list;
  }, [activeRange, top10Movies, myMovies, continueWatching, filter]);

  const featured = filteredMovies[0] || top10Movies[0];
  const genres = ['Ação', 'Drama', 'Comédia', 'Ficção', 'Terror'];

  return (
    <motion.div
      key="trending"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#050505] pb-40 overflow-x-hidden font-space"
    >
      {/* MAGAZINE STYLE HERO BANNER */}
      {featured && (
        <div className="relative h-[85vh] md:h-[95vh] w-full overflow-hidden bg-black">
           <div className="absolute inset-0">
              <motion.img 
                key={featured.id}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.6 }}
                transition={{ duration: 1.5 }}
                src={featured.backdrop_path?.startsWith('http') ? featured.backdrop_path : `https://image.tmdb.org/t/p/original/${featured.backdrop_path}`}
                className="w-full h-full object-cover"
                alt="Featured"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-transparent to-transparent" />
              <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent" />
           </div>

           <div className="relative h-full flex flex-col justify-end px-5 md:px-20 pb-32 max-w-[1920px] mx-auto z-10">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-4xl"
              >
                 <div className="flex items-center gap-2 md:gap-4 mb-6 md:mb-10">
                    <span className="bg-red-600 text-[8px] md:text-[10px] font-black text-white px-3 py-1 md:py-1.5 uppercase tracking-widest rounded-sm">Hot Release</span>
                    <span className="text-white/40 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em]">Issue 24.04</span>
                 </div>

                 <h2 className="text-5xl md:text-[12rem] font-bold text-white uppercase tracking-tighter leading-[0.8] mb-8 md:mb-12 italic border-l-4 md:border-l-8 border-red-600 pl-4 md:pl-10">
                    {featured.title || featured.name}
                 </h2>

                 <div className="flex flex-wrap items-center gap-4 md:gap-8 mb-10 md:mb-16">
                    <div className="flex flex-col">
                       <span className="text-gray-500 text-[8px] uppercase font-black tracking-widest mb-1">Score</span>
                       <span className="text-white font-bold text-xl md:text-3xl">{featured.vote_average?.toFixed(1)}/10</span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col">
                       <span className="text-gray-500 text-[8px] uppercase font-black tracking-widest mb-1">Duration</span>
                       <span className="text-white font-bold text-xl md:text-3xl">{featured.runtime || '98'}m</span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col">
                       <span className="text-gray-500 text-[8px] uppercase font-black tracking-widest mb-1">Year</span>
                       <span className="text-white font-bold text-xl md:text-3xl">{featured.release_date?.split('-')[0] || '2024'}</span>
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <button 
                      onClick={() => handleSelectMovie(featured)}
                      className="px-10 md:px-16 py-5 md:py-7 bg-white text-black font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-4 shadow-2xl"
                    >
                      <Play size={20} fill="currentColor" /> Play Production
                    </button>
                    <button 
                      onClick={() => toggleMyList(featured)}
                      className="px-8 md:px-12 py-5 md:py-7 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-4"
                    >
                      {myListIds.has(featured.id) ? <Check size={20} /> : <Plus size={20} />} Add to Queue
                    </button>
                 </div>
              </motion.div>
           </div>
           
           {/* DECORATIVE OFFSET TEXT */}
           <div className="absolute top-1/2 -right-20 -translate-y-1/2 rotate-90 hidden lg:block opacity-10 select-none pointer-events-none">
              <span className="text-[15rem] font-black text-white uppercase tracking-tighter whitespace-nowrap">PREMIUM GALLERY</span>
           </div>
        </div>
      )}

      {/* FLOATING NAVIGATION (CENTERED & COMPACT) */}
      <div className="sticky top-16 z-50 px-4 flex justify-center mt-[-30px] md:mt-[-50px]">
         <div className="bg-[#111]/80 backdrop-blur-2xl border border-white/5 p-2 rounded-2xl md:rounded-[2rem] shadow-2xl flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar">
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl md:rounded-2xl">
               {[
                 { id: 'daily', label: 'Hoje' },
                 { id: 'weekly', label: 'Semanal' },
                 { id: 'vital', label: 'Vital' },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveRange(tab.id as any)}
                   className={`px-5 md:px-10 py-3 md:py-4 rounded-lg md:rounded-xl font-bold uppercase tracking-widest text-[8px] md:text-[10px] transition-all whitespace-nowrap ${activeRange === tab.id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                 >
                   {tab.label}
                 </button>
               ))}
            </div>
            <div className="w-[1px] h-6 bg-white/10 mx-1 md:mx-3" />
            <div className="flex gap-2">
               {['All Genres', ...genres].map(g => (
                 <button 
                   key={g} 
                   className={`px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl font-bold text-[8px] md:text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border ${filter === g ? 'bg-white text-black border-white' : 'bg-transparent border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}
                   onClick={() => setFilter(g)}
                 >
                   {g}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* CONTENT FLOW */}
      <div className="mt-20 md:mt-40 space-y-32 md:space-y-48">
         {/* TOP 10 CAROUSEL - MODERN CARDS */}
         <section className="pl-5 md:pl-20 max-w-[2000px] mx-auto overflow-hidden">
            <div className="flex items-end justify-between pr-5 md:pr-20 mb-10 md:mb-16">
               <div>
                  <h3 className="text-4xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.8] font-space">The Global Top 10</h3>
                  <p className="text-gray-500 font-bold mt-4 uppercase tracking-[0.4em] text-[8px] md:text-xs font-space">Curated by our neural algorithms</p>
               </div>
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-6 md:gap-12 pb-10 scroll-smooth">
               {filteredMovies.slice(0, 10).map((movie: any, idx: number) => (
                 <motion.div 
                   key={movie.id}
                   whileHover={{ y: -15 }}
                   className="relative flex-none group cursor-pointer"
                   onClick={() => handleSelectMovie(movie)}
                 >
                   {/* CARD UNIQUE DESIGN */}
                   <div className="w-[200px] md:w-[320px] aspect-[2/3] relative rounded-2xl md:rounded-[3rem] overflow-hidden border border-white/5 transition-all duration-700 shadow-2xl flex flex-col grayscale group-hover:grayscale-0">
                      <img 
                        src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`} 
                        className="w-full h-full object-cover" 
                        alt={movie.title} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                      
                      {/* OVERLAY CONTENT */}
                      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/20 backdrop-blur-[2px]">
                         <div className="flex justify-between items-start">
                            <span className="text-3xl md:text-5xl font-black text-white italic leading-none">{idx + 1}</span>
                            <div className="w-10 h-10 md:w-16 h-16 bg-white rounded-full flex items-center justify-center text-black">
                               <Play size={20} fill="currentColor" />
                            </div>
                         </div>
                         <div>
                            <h4 className="text-white font-black text-xl md:text-3xl uppercase tracking-tighter italic leading-none mb-3 md:mb-5">{movie.title || movie.name}</h4>
                            <div className="flex flex-wrap gap-2">
                               {movie.genres?.split(',').slice(0, 2).map((g: string) => (
                                 <span key={g} className="px-3 py-1 bg-white/10 text-white font-bold text-[8px] uppercase tracking-widest rounded-sm">{g}</span>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                   
                   {/* BACKGROUND NUMBER (OFFSET STYLE) */}
                   <div className="absolute -left-5 -bottom-5 z-[-1] opacity-5 group-hover:opacity-10 transition-opacity">
                      <span className="text-[12rem] md:text-[20rem] font-black text-white italic leading-none">{idx + 1}</span>
                   </div>
                 </motion.div>
               ))}
            </div>
         </section>

         {/* GENRE PULSE CAROUSEL (NEW) */}
         <section className="pl-5 md:pl-20 max-w-[2000px] mx-auto overflow-hidden">
            <div className="mb-10 md:mb-16">
               <h3 className="text-3xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-[0.8] mb-4 font-space">Genre Pulse</h3>
               <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[8px] md:text-xs font-space">Global engagement spikes by category</p>
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-4 md:gap-8 pb-10">
               {genres.map((g) => {
                 const genreMovies = myMovies.filter((m: any) => m.genres?.includes(g)).slice(0, 8);
                 if (genreMovies.length === 0) return null;
                 return (
                   <div key={g} className="flex-none w-[280px] md:w-[450px] bg-white/5 rounded-3xl p-6 border border-white/5 group hover:bg-white/10 transition-all">
                      <div className="flex justify-between items-center mb-6">
                         <span className="text-white font-black uppercase text-xs md:text-lg tracking-widest">{g}</span>
                         <span className="text-red-500 font-black text-[8px] md:text-[10px] uppercase tracking-widest">+12% Trending</span>
                      </div>
                      <div className="flex -space-x-8 md:-space-x-12">
                         {genreMovies.slice(0, 4).map((m: any, i: number) => (
                           <div key={m.id} className="w-20 h-28 md:w-32 md:h-44 rounded-xl overflow-hidden border-4 border-[#050505] shadow-2xl relative" style={{ zIndex: 10 - i }}>
                              <img src={m.poster_path?.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w200/${m.poster_path}`} className="w-full h-full object-cover" />
                           </div>
                         ))}
                      </div>
                      <button 
                        onClick={() => navigate(`/genre/${g}`)}
                        className="mt-8 w-full py-4 border border-white/10 rounded-xl text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest group-hover:bg-white group-hover:text-black transition-all"
                      >
                        Explore Category
                      </button>
                   </div>
                 );
               })}
            </div>
         </section>

         {/* COLLECTIONS CAROUSEL */}
         <CollectionsCarousel franchises={franchises} />

         {/* SERIES CAROUSEL */}
         <section className="pl-5 md:pl-20 max-w-[2000px] mx-auto">
            <div className="mb-10 md:mb-16">
               <h3 className="text-4xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-[0.8] mb-4">Prime Series</h3>
               <p className="text-gray-500 font-bold uppercase tracking-widest text-[8px] md:text-xs">Award-winning binge-worthy productions</p>
            </div>

            <div className="flex overflow-x-auto no-scrollbar gap-6 md:gap-10 pb-10">
               {top10Series.map((s: any) => (
                 <div 
                   key={s.id} 
                   className="relative flex-none cursor-pointer group"
                   onClick={() => handleSelectMovie(s)}
                 >
                    <div className="w-[160px] md:w-[240px] aspect-[2/3] rounded-xl md:rounded-3xl overflow-hidden border border-white/5 grayscale group-hover:grayscale-0 transition-all group-hover:scale-105 duration-500">
                       <img src={s.poster_path?.startsWith('http') ? s.poster_path : `https://image.tmdb.org/t/p/w500/${s.poster_path}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-6">
                       <p className="text-white font-black uppercase text-[10px] md:text-xs tracking-tighter line-clamp-1">{s.name}</p>
                       <p className="text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-1 group-hover:text-red-500 transition-colors">Season 1 Active</p>
                    </div>
                 </div>
               ))}
            </div>
         </section>

         {/* STATISTICS BENTO (MOBILE OPTIMIZED) */}
         <section className="px-5 md:px-20 max-w-[2000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 pb-20">
            <div className="bg-white/5 p-8 md:p-16 rounded-[2rem] md:rounded-[4rem] border border-white/5 flex flex-col justify-between h-[300px] md:h-[500px]">
               <Activity className="text-red-600 mb-8" size={32} />
               <div>
                  <h4 className="text-white font-black text-4xl md:text-6xl uppercase italic tracking-tighter mb-4 leading-none">Global Pulse</h4>
                  <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs leading-relaxed">System-wide monitoring shows 98% engagement on new thriller releases today.</p>
               </div>
            </div>
            
            <div className="md:col-span-2 bg-gradient-to-br from-red-900/40 to-[#050505] p-8 md:p-16 rounded-[2rem] md:rounded-[4rem] border border-red-900/20 flex flex-col md:flex-row gap-10">
               <div className="flex-1 flex flex-col justify-center">
                  <h4 className="text-white font-black text-4xl md:text-7xl uppercase italic tracking-tighter mb-6 leading-[0.8]">Curadoria Premium</h4>
                  <p className="text-white/60 font-bold text-xs md:text-lg mb-10 max-w-md">Nossa equipe editorial selecionou os melhores títulos de suspense europeu para você este final de semana.</p>
                  <button className="w-fit px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-2xl">Ver Coleção</button>
               </div>
               <div className="shrink-0 flex items-center justify-center">
                  <div className="w-32 h-32 md:w-64 md:h-64 rounded-full border border-white/10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl">
                     <span className="text-white font-black text-2xl md:text-4xl uppercase italic tracking-tighter">PRIME</span>
                  </div>
               </div>
            </div>
         </section>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
});

const MyListView = React.memo(({ myList, handleSelectMovie, navigate }: any) => {
  return (
    <motion.div
      key="mylist"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.3 }}
      className="pt-24 px-4 md:px-12 min-h-screen"
    >
      <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter italic mb-12">Minha Lista</h2>
      
      {myList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-white/5 rounded-[4rem] bg-white/[0.02]">
          <div className="p-10 bg-white/5 rounded-[3rem] border border-white/10 mb-8 animate-pulse text-gray-600">
            <List size={64} />
          </div>
          <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic mb-4">Lista Vazia</h3>
          <p className="text-gray-500 font-bold mb-8">Nenhum título adicionado à sua lista pessoal ainda.</p>
          <button 
            onClick={() => navigate('/home')}
            className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase italic tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Explorar Catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {myList.map((movie: any) => (
            <motion.div 
              key={movie.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group cursor-pointer"
              onClick={() => handleSelectMovie(movie)}
            >
              <div className="aspect-[2/3] rounded-[2.5rem] overflow-hidden border border-white/10 group-hover:border-red-600 transition-all shadow-2xl">
                <img 
                  src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`} 
                  alt={movie.title || movie.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white font-black text-lg uppercase tracking-tighter truncate leading-none">{movie.title || movie.name}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
});


const MovieDetailRouteWrapper = ({ 
  myMovies, 
  handlePlayMovie, 
  closeMovieDetails, 
  toggleMyList, 
  toggleFavorite, 
  myListIds, 
  favoriteIds, 
  streamingProviders,
  onRequestMovie,
  watchHistory,
  onWatchParty,
  top10Movies = [],
  top10Series = [],
  appSettings
}: any) => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [tmdbMovie, setTmdbMovie] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const localMovie = useMemo(() => myMovies.find((m: any) => m.id.toString() === movieId), [movieId, myMovies]);
  
  useEffect(() => {
    if (!localMovie && movieId && !tmdbMovie && !notFound) {
      const fetchFromTmdb = async () => {
         try {
            const res = await tmdb.get(requests.movieDetails(Number(movieId)));
            setTmdbMovie({
              id: res.data.id,
              title: res.data.title,
              overview: res.data.overview,
              poster_path: res.data.poster_path,
              backdrop_path: res.data.backdrop_path,
              vote_average: res.data.vote_average,
              release_date: res.data.release_date,
              genres: res.data.genres?.map((g:any) => g.name).join(', ') || '',
              type: 'movie',
              videoUrl: '' 
            });
         } catch (e) {
            try {
               const res2 = await tmdb.get(requests.tvDetails(Number(movieId)));
               setTmdbMovie({
                  id: res2.data.id,
                  title: res2.data.name,
                  overview: res2.data.overview,
                  poster_path: res2.data.poster_path,
                  backdrop_path: res2.data.backdrop_path,
                  vote_average: res2.data.vote_average,
                  release_date: res2.data.first_air_date,
                  genres: res2.data.genres?.map((g:any) => g.name).join(', ') || '',
                  type: 'series',
                  episodes: [],
                  videoUrl: ''
               });
            } catch (e2) {
               setNotFound(true);
            }
         }
      };
      fetchFromTmdb();
    }
  }, [localMovie, movieId, tmdbMovie, notFound]);

  const movie = useMemo(() => {
    const base = localMovie || tmdbMovie;
    if (!base) return null;
    return {
      ...base,
      last_position: watchHistory[base.id] || base.last_position || 0
    };
  }, [localMovie, tmdbMovie, watchHistory]);

  const movieRank = useMemo(() => {
    if (!movie) return undefined;
    const movieIndex = top10Movies.findIndex((m: any) => m.id === movie.id);
    if (movieIndex !== -1) return movieIndex + 1;
    const seriesIndex = top10Series.findIndex((m: any) => m.id === movie.id);
    if (seriesIndex !== -1) return seriesIndex + 1;
    return undefined;
  }, [movie, top10Movies, top10Series]);
  
  if (notFound) {
    return (
       <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
          <p className="text-white text-xl font-bold uppercase tracking-widest">Conteúdo Não Localizado</p>
          <button onClick={closeMovieDetails} className="mt-8 px-8 py-3 bg-red-600 font-bold tracking-widest hover:bg-white hover:text-black uppercase text-white rounded-xl transition-all shadow-xl">Voltar</button>
       </div>
    );
  }

  if (!movie) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center animate-bounce shadow-[0_0_50px_rgba(220,38,38,0.5)]">
          <Play size={40} fill="white" className="text-white ml-2" />
        </div>
        <p className="mt-8 text-white font-black uppercase tracking-[0.3em] text-sm animate-pulse italic">Carregando detalhes...</p>
      </div>
    );
  }

  return (
    <MovieDetailsModal 
      movie={movie}
      onClose={closeMovieDetails}
      onPlay={(m, url, time) => handlePlayMovie(m, url, time)}
      onToggleMyList={() => toggleMyList(movie)}
      onToggleFavorite={() => toggleFavorite(movie)}
      similarMovies={myMovies.filter((m: any) => m.id?.toString() !== movie.id?.toString()).slice(0, 10)}
      onSelectSimilar={(similar) => navigate(`/movie/${similar.id}`, { state: location.state })}
      onWatchParty={() => onWatchParty(movie)}
      isAddedToMyList={myListIds.has(movie.id)}
      isFavorite={favoriteIds.has(movie.id)}
      streamingProviders={streamingProviders}
      onRequestMovie={onRequestMovie}
      rank={movieRank}
      appSettings={appSettings}
    />
  );
};

  const PlayerRouteWrapper = ({ myMovies, profile, closePlayer, handleSelectMovie, handlePlayMovie, onProgress, activeRoomId, isAppHost, appSettings }: any) => {
  const { movieId } = useParams();
  const location = useLocation();
  const movieFromState = location.state?.movie;
  const startTimeFromState = location.state?.startTime;
  const episodeUrlFromState = location.state?.episodeUrl;
  const playerStyleFromState = location.state?.playerStyle;
  
  const searchParams = new URLSearchParams(location.search);
  const urlRoomId = searchParams.get('room');
  
  const currentRoomId = activeRoomId || urlRoomId;
  const isHost = isAppHost || (activeRoomId ? true : false); // If activeRoomId is set in App.tsx state, they created it. Otherwise from URL, they are not host.

  const movie = useMemo(() => {
    if (movieFromState && movieFromState.id.toString() === movieId) return movieFromState;
    return myMovies.find((m: any) => m.id.toString() === movieId);
  }, [movieId, myMovies, movieFromState]);
  
  const videoUrl = useMemo(() => {
    if (!movie) return '';
    return episodeUrlFromState || movie.video_url || movie.videoUrl || '';
  }, [movie, episodeUrlFromState]);

  const savedProgress = useMemo(() => {
    if (!movieId) return 0;
    const progress = localStorage.getItem(`netplay_progress_${movieId}`);
    return progress ? parseFloat(progress) : 0;
  }, [movieId]);

  const recommendations = useMemo(() => {
    if (!movie || !myMovies) return [];
    
    const genres = [movie.genre, ...(movie.genres || [])].filter(Boolean);
    const similar = myMovies.filter((m: any) => 
      m.id?.toString() !== movie.id?.toString() && 
      (genres.includes(m.genre) || (Array.isArray(m.genres) && m.genres.some((g: string) => genres.includes(g))))
    );
    
    const shuffledSimilar = similar.sort(() => 0.5 - Math.random());
    
    if (shuffledSimilar.length < 10) {
      const others = myMovies
        .filter((m: any) => m.id?.toString() !== movie.id?.toString() && !similar.find((s: any) => s.id === m.id))
        .sort(() => 0.5 - Math.random());
      return [...shuffledSimilar, ...others].slice(0, 10);
    }
    return shuffledSimilar.slice(0, 10);
  }, [movie, myMovies]);

  if (!movie) {
    return (
      <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center animate-spin shadow-[0_0_50px_rgba(220,38,38,0.5)]">
          <Play size={40} fill="white" className="text-white ml-2" />
        </div>
        <p className="mt-8 text-white font-black uppercase tracking-[0.3em] text-sm animate-pulse italic">Iniciando reprodutor...</p>
      </div>
    );
  }

  return (
    <VideoPlayer 
      key={`${movie.id}-${videoUrl}`}
      movie={{...movie, videoUrl: videoUrl || movie.video_url || movie.videoUrl}} 
      onClose={closePlayer}
      profileId={profile?.id}
      profile={profile}
      recommendations={recommendations}
      onProgress={onProgress}
      onPlayNext={(m, url) => {
         if (handlePlayMovie) handlePlayMovie(m, url, 0);
      }}
      roomId={currentRoomId}
      isHost={isHost}
      appSettings={appSettings}
      initialTime={startTimeFromState !== undefined ? startTimeFromState : savedProgress}
      initialPlayerStyle={playerStyleFromState}
    />
  );
};
const ProviderViewWrapper = ({ myMovies, handleSelectMovie, toggleMyList, toggleFavorite, myListIds, favoriteIds }: any) => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  
  const providerMovies = useMemo(() => {
    if (!providerId) return [];
    
    // Normalização para busca robusta
    const pIdNormalized = providerId.toLowerCase().replace(/\s+/g, '').replace(/[+]/g, 'plus');
    const pIdDirect = providerId.toLowerCase();
    
    // Mapeamento de apelidos comuns ou variações
    const providerAliases: Record<string, string[]> = {
      'apple tv+': ['apple', 'atvp', 'apple tv', 'apple tv plus'],
      'paramount+': ['paramount', 'pmnt', 'paramount plus'],
      'disney+': ['disney', 'star+', 'star plus'],
      'max': ['hbo', 'warner'],
      'netflix': ['nflx']
    };

    const aliases = providerAliases[pIdDirect] || [];
    
    return myMovies.filter((m: any) => {
      if (!m.watch_providers) return false;
      const wp = m.watch_providers.toLowerCase();
      const wpNormalized = wp.replace(/\s+/g, '').replace(/[+]/g, 'plus');
      
      const containsDirect = wp.includes(pIdDirect) || wpNormalized.includes(pIdNormalized);
      const containsAlias = aliases.some(alias => wp.includes(alias));
      
      // Also check if provider Name is in the title for originals
      const title = (m.title || m.name || '').toLowerCase();
      const isOriginal = aliases.some(alias => title.includes(alias));

      return containsDirect || containsAlias || isOriginal;
    });
  }, [myMovies, providerId]);

  return (
    <ProviderPage 
      provider={providerId || ''}
      movies={providerMovies}
      onClose={() => navigate('/menu')}
      onSelectMovie={handleSelectMovie}
      onToggleMyList={toggleMyList}
      onToggleFavorite={toggleFavorite}
      myListIds={myListIds}
      favoriteIds={favoriteIds}
    />
  );
};

const GenreViewWrapper = ({ myMovies, moviesByGenre, handleSelectMovie, navigate, toggleMyList, myList }: any) => {
  const { genreName } = useParams();
  const genreMovies = useMemo(() => {
    if (!genreName) return [];
    if (genreName === 'Adicionados Recentemente') return myMovies;
    return moviesByGenre[genreName] || [];
  }, [genreName, myMovies, moviesByGenre]);

  const theme = useMemo(() => {
    return FRANCHISES.find(f => f.name.toLowerCase() === genreName?.toLowerCase() || f.id === genreName?.toLowerCase());
  }, [genreName]);

  const category = useMemo(() => {
    return CATEGORIES.find(c => c.name.toLowerCase() === genreName?.toLowerCase());
  }, [genreName]);

  const heroMovie = genreMovies[0];

  return (
    <div 
      key="genre-view"
      className="min-h-screen pb-40 relative overflow-hidden animate-fade-in"
    >
      {/* Dynamic Background Banner */}
      <div className="absolute top-0 left-0 w-full h-[60vh] md:h-screen transition-all duration-1000">
        <img 
          src={theme?.backdrop || heroMovie?.backdrop_path || 'https://picsum.photos/seed/genre/1920/1080'} 
          className="w-full h-full object-cover opacity-30 blur-sm scale-105"
          alt=""
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
      </div>

      <div className="relative z-10 pt-32 px-4 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-8 rounded-full ${theme?.accent || 'bg-red-600'} shadow-lg`}></div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Explorar Categoria</span>
            </div>
            <div className="flex items-center gap-6">
               {category && (
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
                    <category.icon size={48} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                 </div>
               )}
               <h2 className="text-5xl md:text-[10rem] font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-2xl">
                 {genreName}
               </h2>
            </div>
            {theme?.description && (
              <p className="text-gray-400 font-bold italic max-w-2xl text-xs md:text-sm uppercase tracking-widest leading-relaxed opacity-60">
                {theme.description}
              </p>
            )}
          </div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-white font-black uppercase tracking-widest text-[10px] italic bg-white/5 px-8 py-4 rounded-2xl border border-white/10 hover:bg-red-600 hover:border-red-600 transition-all shadow-2xl backdrop-blur-3xl group self-start md:self-auto">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar
          </button>
        </div>

        {genreMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] rounded-[4rem] border-2 border-dashed border-white/5 backdrop-blur-3xl">
            <Search className="text-gray-800 mb-8 animate-float" size={80} />
            <h3 className="text-3xl font-black text-white italic uppercase mb-2">Sem resultados</h3>
            <p className="text-gray-500 font-bold max-w-sm text-center italic text-xs uppercase tracking-widest">A biblioteca deste universo ainda está sendo mapeada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
            {genreMovies.map((movie: any, idx: number) => (
              <div 
                key={movie.id}
                className="relative cursor-pointer rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl group hover:ring-4 hover:ring-red-600 transition-all aspect-[2/3] animate-fade-in hover:-translate-y-2 hover:scale-[1.02]"
                style={{ animationDelay: `${idx * 0.05}s` }}
                onClick={() => handleSelectMovie(movie)}
              >
                <img
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                  alt={movie.title || movie.name}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 md:p-6">
                  <p className="text-white font-black text-sm md:text-lg uppercase tracking-tighter truncate italic leading-none">{movie.title || movie.name}</p>
                  <div className="flex items-center gap-3 mt-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMyList(movie);
                      }}
                      className={`p-2 md:p-3 rounded-xl transition-all ${myList.some((m: any) => m.id === movie.id) ? 'bg-red-600 text-white' : 'bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20'}`}
                    >
                      <Plus size={16} className={myList.some((m: any) => m.id === movie.id) ? 'rotate-45' : ''} />
                    </button>
                    <div className="text-[8px] md:text-[10px] font-black uppercase text-white/60 italic tracking-widest">{movie.release_date?.split('-')[0] || '2024'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import PlansScreen from './components/PlansScreen';

const ProfilePageView = React.memo(({ 
  profile, 
  favorites, 
  myList, 
  handleSwitchProfile, 
  setIsAdminModalOpen, 
  handleLogout, 
  navigate,
  continueWatching,
  setIsSettingsOpen,
  setIsPlansScreenOpen // injected
}: any) => {
  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="pt-20 px-2 md:px-12 min-h-screen pb-24"
    >
      <div className="flex flex-col md:flex-row items-center gap-5 md:gap-10 mb-8 bg-white/5 p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-[1.5rem] blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
          <img 
            src={profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"} 
            alt="Avatar" 
            className="relative w-20 h-20 md:w-48 md:h-48 rounded-[1rem] md:rounded-[1.5rem] object-cover border-4 border-white/5 shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-center md:text-left flex-1 relative z-10">
          <h2 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter italic mb-2">{profile?.name}</h2>
          <p className="text-gray-500 font-bold text-sm md:text-base mb-4 italic">Membro VIP</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4">
            <button 
              onClick={() => navigate('/admin')}
              className="bg-red-600 text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all border border-red-600/20 flex items-center gap-2 shadow-xl"
            >
              <Shield size={16} /> Administração
            </button>
            <button 
              onClick={handleSwitchProfile}
              className="bg-white text-black px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all flex items-center gap-2 shadow-xl"
            >
              <RefreshCcw size={16} /> Trocar Perfil
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white/10 text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2 backdrop-blur-md"
            >
              <Settings size={16} /> Configurações
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-12">
        <div className="lg:col-span-1 space-y-6 md:space-y-12">
          <div className="bg-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/10 backdrop-blur-2xl">
            <h3 className="text-white font-black text-xl md:text-2xl mb-6 md:mb-8 flex items-center gap-3 italic">
              <TrendingUp size={24} className="text-red-600" /> Dashboard
            </h3>
            <div className="space-y-4 md:space-y-6">
              <div className="p-4 md:p-6 bg-black/40 rounded-2xl md:rounded-3xl border border-white/5 flex justify-between items-center group">
                <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Assistidos</span>
                <span className="text-white font-black text-xl md:text-3xl italic">{continueWatching.length}</span>
              </div>
              <div className="p-4 md:p-6 bg-black/40 rounded-2xl md:rounded-3xl border border-white/5 flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <Bookmark size={18} className="text-red-600" />
                  <span className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Minha Lista</span>
                </div>
                <span className="text-white font-black text-xl md:text-3xl italic">{myList.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-12">
          <div className="bg-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/10 backdrop-blur-2xl">
            <h3 className="text-white font-black text-xl md:text-2xl mb-6 flex items-center gap-3 italic">
              <Bookmark size={24} className="text-red-600" /> Minha Lista
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {myList.slice(0, 8).map((movie: any) => (
                <div 
                  key={movie.id}
                  className="aspect-[2/3] relative rounded-xl overflow-hidden cursor-pointer group hover:ring-4 hover:ring-red-600 transition-all duration-300 shadow-2xl"
                >
                  <img 
                    src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="mt-20 flex items-center gap-4 text-red-600 font-black uppercase tracking-[0.3em] text-xs italic hover:text-red-500 transition-colors"
      >
        <LogOut size={20} /> Sair do NetPremium
      </button>
    </motion.div>
  );
});

function InviteRedirect() {
  const { inviteId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (inviteId) {
      localStorage.setItem('netplay_referral_code', inviteId);
    }
    navigate('/', { replace: true });
  }, [inviteId, navigate]);

  return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={48} /></div>;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const [currentTheme, setCurrentTheme] = useState('default');
  const [providerData, setProviderData] = useState<any>(null);

  useEffect(() => {
    try {
      OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID || "581f23c1-2b57-4646-8780-6cd2ccbba30e",
        allowLocalhostAsSecureOrigin: true,
      }).then(() => {
        OneSignal.Slidedown.promptPush();
      });
    } catch (e) {
      console.warn("OneSignal init error:", e);
    }
  }, []);

  const [showIntro, setShowIntro] = useState(true);
  const [showAppInfo, setShowAppInfo] = useState(true);
  const [initialLoginMode, setInitialLoginMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [viewingMovie, setViewingMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isPlansScreenOpen, setIsPlansScreenOpen] = useState(false);
  const [myMovies, setMyMovies] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [watchHistory, setWatchHistory] = useState<Record<number, number>>({});
  
  // Novos estados para Abas e Pesquisa
  const activeTab = useMemo(() => {
    const path = location.pathname.split('/')[1] || 'menu';
    if (path === 'menu') return 'home';
    if (path === 'perfil') return 'profile';
    if (path === 'provider') return 'home';
    return path as any;
  }, [location.pathname]);

  const [activeFranchise, setActiveFranchise] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('netplay_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => {
          const original = CATEGORIES.find(c => c.id === p.id);
          return { ...p, icon: original?.icon || CATEGORIES[0].icon };
        });
      } catch (e) {
        return CATEGORIES;
      }
    }
    return CATEGORIES;
  });
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [watchPartyMovie, setWatchPartyMovie] = useState<Movie | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myList, setMyList] = useState<Movie[]>([]);
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [streamingProviders, setStreamingProviders] = useState<StreamingProvider[]>([]);

  // Hoist isAdmin before its use in useMemo hooks
  const [isAdmin, setIsAdmin] = useState(false);

  const effectiveAppSettings = useMemo(() => {
    if (isAdmin) {
      if (appSettings) {
        return {
          ...appSettings,
          subscription_plan: 'max',
          subscription_status: 'active'
        } as AppSettings;
      } else {
        return {
          id: 'admin-mock',
          user_id: user?.id || 'admin',
          subscription_plan: 'max',
          subscription_status: 'active',
          theme: 'default',
          language: 'pt-BR',
          autoplay_next: true,
          show_logos: true,
          category_backdrops: {},
          updated_at: new Date().toISOString()
        } as unknown as AppSettings;
      }
    }
    return appSettings;
  }, [appSettings, isAdmin, user]);

  const [scannerState, setScannerState] = useState<ScannerState | null>(() => {
    const saved = localStorage.getItem('scanner_state');
    return saved ? JSON.parse(saved) : null;
  });

  const [reScannerState, setReScannerState] = useState<ReScannerState | null>(() => {
    const saved = localStorage.getItem('rescanner_state');
    return saved ? JSON.parse(saved) : null;
  });

  const [collectionAutomationState, setCollectionAutomationState] = useState<CollectionScannerState | null>(() => {
    const saved = localStorage.getItem('collection_automation_state');
    return saved ? JSON.parse(saved) : null;
  });

  const hasTmdbKey = !!import.meta.env.VITE_TMDB_API_KEY;
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  const handleLogoutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  const refreshCategoryImages = async (categoryId?: number) => {
    const newCategories = await Promise.all(categories.map(async (cat: any) => {
      if (categoryId && cat.id !== categoryId) return cat;
      
      try {
        const res = await tmdb.get(requests.fetchMoviesByGenre(cat.id));
        const movies = res.data.results;
        if (movies && movies.length > 0) {
          const validBackdrops = movies.filter((m: any) => m.backdrop_path).slice(0, 10);
          if (validBackdrops.length > 0) {
            const randomMovie = validBackdrops[Math.floor(Math.random() * validBackdrops.length)];
            return { ...cat, backdrop: `https://image.tmdb.org/t/p/original${randomMovie.backdrop_path}` };
          }
        }
      } catch (e) {
        console.error("Erro ao atualizar imagem da categoria:", e);
      }
      return cat;
    }));
    setCategories(newCategories);
    localStorage.setItem('netplay_categories', JSON.stringify(newCategories));
    
    // Save to settings in Supabase as well
    if (appSettings) {
      const backdrops: Record<number, string> = {};
      newCategories.forEach((c: any) => {
        backdrops[c.id] = c.backdrop;
      });
      updateAppSettings({ ...appSettings, category_backdrops: backdrops });
    }
  };

  const updateCategoryImage = async (categoryId: number, backdrop: string) => {
    const newCategories = categories.map((cat: any) => 
      cat.id === categoryId ? { ...cat, backdrop } : cat
    );
    setCategories(newCategories);
    localStorage.setItem('netplay_categories', JSON.stringify(newCategories));
    
    if (appSettings) {
      const backdrops = { ...(appSettings.category_backdrops || {}) };
      backdrops[categoryId] = backdrop;
      updateAppSettings({ ...appSettings, category_backdrops: backdrops });
    }
  };

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);
  const myListIds = useMemo(() => new Set(myList.map(m => m.id)), [myList]);

  const heroMovies = useMemo(() => {
    const heroKeywords = ['marvel', 'dc comics', 'batman', 'spider-man', 'spiderman', 'superman', 'avengers', 'vingadores', 'liga da justiça', 'justice league', 'x-men', 'herói', 'hero', 'super-herói'];
    return myMovies.filter(m => {
      const t = (m.title || '').toLowerCase();
      const o = (m.overview || '').toLowerCase();
      const g = (m.genres || '').toLowerCase();
      return heroKeywords.some(k => t.includes(k) || o.includes(k)) || g.includes('fantasia') || g.includes('ação');
    });
  }, [myMovies]);

  const collectionMovies = useMemo(() => {
    return myMovies.filter(m => {
      const t = (m.title || '').toLowerCase();
      const o = (m.overview || '').toLowerCase();
      return FRANCHISES.some(f => f.keywords.some(k => t.includes(k) || o.includes(k)));
    }).sort((a, b) => {
      const dateA = String(a.release_date || (a as any).release_year || '0');
      const dateB = String(b.release_date || (b as any).release_year || '0');
      return dateA.localeCompare(dateB);
    });
  }, [myMovies]);

  const dynamicFranchises = useMemo(() => {
    const list: any[] = [];
    
    // First, always add the defined FRANCHISES so their IDs ('marvel', 'star-wars', etc.) are guaranteed to exist
    FRANCHISES.forEach(f => {
      const movies = myMovies.filter(m => {
        const t = (m.title || '').toLowerCase();
        const o = (m.overview || '').toLowerCase();
        return f.keywords.some(k => t.includes(k) || o.includes(k));
      });
      
      if (movies.length > 0) {
        const logoFromMovie = movies.find(m => m.logo_path)?.logo_path;
        list.push({
          ...f,
          movies: movies.sort((a, b) => (a.release_year || 0) - (b.release_year || 0)),
          poster: f.poster || movies[0].poster_path,
          backdrop: f.backdrop || movies[0].backdrop_path,
          logo: f.logo || logoFromMovie
        });
      }
    });

    // Then, add specific TMDB collections if they aren't part of a major franchise
    const collectionsById: Record<number, Movie[]> = {};
    myMovies.forEach(m => {
      if (m.collection_id) {
        if (!collectionsById[m.collection_id]) collectionsById[m.collection_id] = [];
        collectionsById[m.collection_id].push(m);
      }
    });

    Object.entries(collectionsById).forEach(([id, movies]) => {
      const collectionName = movies[0].collection_name || 'Coleção';
      
      // Check if this collection is already covered by a major franchise
      const isCoveredByFranchise = FRANCHISES.some(f => 
        f.keywords.some(k => collectionName.toLowerCase().includes(k))
      );

      if (!isCoveredByFranchise) {
        list.push({
          id: `tmdb-${id}`,
          name: collectionName,
          keywords: [collectionName.toLowerCase()],
          color: '#ffffff',
          bg: 'bg-[#121212]',
          accent: 'text-gray-400',
          icon: List,
          description: `Coleção oficial do TMDb: ${collectionName}.`,
          movies: movies.sort((a, b) => (a.release_year || 0) - (b.release_year || 0)),
          poster: movies[0].collection_poster_path || movies[0].poster_path,
          backdrop: movies[0].collection_backdrop_path || movies[0].backdrop_path,
          logo: movies[0].collection_logo_path,
          tmdb_collection_id: parseInt(id)
        });
      }
    });

    return list;
  }, [myMovies]);

  const getTop10 = (movieList: Movie[]) => {
    return [...movieList]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  };

  const selectedProviderTop10 = useMemo(() => {
    if (!selectedProvider) return [];
    const providersMovies = myMovies.filter(m => {
      if (m.watch_providers) {
        return m.watch_providers.toLowerCase().includes(selectedProvider.toLowerCase());
      }
      return false;
    });
    return getTop10(providersMovies);
  }, [selectedProvider, myMovies]);

  // Memoize sets to prevent unnecessary re-renders of Row components

  const fetchStreamingProviders = async () => {
    const { data, error } = await supabase
      .from('streaming_providers')
      .select('*')
      .order('priority', { ascending: true });
    
    if (!error && data) {
      setStreamingProviders(data);
      // Se estiver vazio, podemos sugerir ou auto-popular com os padrões
      if (data.length === 0) {
        seedDefaultProviders();
      }
    }
  };

  const seedDefaultProviders = async () => {
    const defaults = [
      { name: 'Netflix', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', priority: 1 },
      { name: 'Disney+', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', priority: 2 },
      { name: 'Max', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', priority: 3 },
      { name: 'Prime Video', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', priority: 4 },
      { name: 'Apple TV+', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', priority: 5 },
      { name: 'Paramount+', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', priority: 6 },
      { name: 'Globoplay', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Globoplay_logo.svg', priority: 7 },
      { name: 'Hulu', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg', priority: 8 }
    ];

    const { error } = await supabase.from('streaming_providers').insert(defaults);
    if (!error) fetchStreamingProviders();
  };

  useEffect(() => {
    fetchStreamingProviders();
  }, []);

  const handleAddStreamingProvider = async (provider: Partial<StreamingProvider>) => {
    const { error } = await supabase.from('streaming_providers').insert([provider]);
    if (!error) fetchStreamingProviders();
  };

  const handleUpdateStreamingProvider = async (provider: StreamingProvider) => {
    const { error } = await supabase.from('streaming_providers').update(provider).eq('id', provider.id);
    if (!error) fetchStreamingProviders();
  };

  const handleDeleteStreamingProvider = async (id: string) => {
    const { error } = await supabase.from('streaming_providers').delete().eq('id', id);
    if (!error) fetchStreamingProviders();
  };

  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);

  const fetchDriveFiles = async () => {
    if (!appSettings?.google_drive_token) return;
    setIsFetchingDrive(true);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType+contains+'video/'&fields=files(id,name,mimeType,size)&access_token=${appSettings.google_drive_token}`);
      const data = await response.json();
      setDriveFiles(data.files || []);
    } catch (error) {
      console.error('Erro ao buscar arquivos do Drive:', error);
    } finally {
      setIsFetchingDrive(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile' && appSettings?.google_drive_token) {
      fetchDriveFiles();
    }
  }, [activeTab, appSettings?.google_drive_token]);

  const addDriveFileToLibrary = async (file: any) => {
    const videoUrl = `https://drive.google.com/file/d/${file.id}/view`;
    
    // Verificar se já existe
    if (myMovies.some(m => m.videoUrl === videoUrl)) {
      alert('Este vídeo já está na sua biblioteca!');
      return;
    }

    const cleanName = await cleanTitle(file.name);
    
    const movieData: Partial<Movie> = {
      title: cleanName,
      videoUrl: videoUrl,
      backdrop_path: 'https://picsum.photos/seed/drive/1920/1080',
      poster_path: 'https://picsum.photos/seed/drive/500/750',
      overview: `Vídeo adicionado do seu Google Drive: ${file.name}`,
      genres: 'Drive',
      type: 'movie'
    };

    const { error } = await supabase.from('movies').insert([movieData]);
    if (!error) {
      fetchMyMovies();
      notificationService.notifyNewMovie(movieData.title || 'Novo Filme', movieData.poster_path);
      alert('Vídeo adicionado com sucesso!');
    }
  };

  // Salvar estado do scanner
  useEffect(() => {
    if (scannerState) {
      localStorage.setItem('scanner_state', JSON.stringify(scannerState));
    } else {
      localStorage.removeItem('scanner_state');
    }
  }, [scannerState]);

  // Salvar estado do re-scanner
  useEffect(() => {
    if (reScannerState) {
      localStorage.setItem('rescanner_state', JSON.stringify(reScannerState));
    } else {
      localStorage.removeItem('rescanner_state');
    }
  }, [reScannerState]);

  useEffect(() => {
    // Only basic syncing, prevent annoying offline redirects entirely.
    const handlePopState = () => {};
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Salvar estado da automação de coleções
  useEffect(() => {
    const handleOpenCollection = (e: any) => {
      const { id, name } = e.detail;
      const franchise = dynamicFranchises.find(f => f.id === id || f.name.toLowerCase() === name.toLowerCase());
      if (franchise) {
        setActiveFranchise(franchise);
        navigate(`/universe/${franchise.id}`);
      }
    };

    window.addEventListener('open-collection', handleOpenCollection);

    const handleOpenProvider = (e: any) => {
      navigate(`/provider/${e.detail}`);
    };
    window.addEventListener('open-provider' as any, handleOpenProvider);

    return () => {
      window.removeEventListener('open-collection', handleOpenCollection);
      window.removeEventListener('open-provider' as any, handleOpenProvider);
    };
  }, [dynamicFranchises, navigate]);

  useEffect(() => {
    if (collectionAutomationState) {
      localStorage.setItem('collection_automation_state', JSON.stringify(collectionAutomationState));
    } else {
      localStorage.removeItem('collection_automation_state');
    }
  }, [collectionAutomationState]);

  const stopScanner = () => {
    setScannerState(null);
  };

  const stopReScanner = () => {
    setReScannerState(null);
  };

  const pauseScanner = () => {
    setScannerState(prev => prev ? { ...prev, isPaused: true, status: 'Pausado' } : null);
  };

  const pauseReScanner = () => {
    setReScannerState(prev => prev ? { ...prev, isPaused: true, status: 'Pausado' } : null);
  };

  const resumeScanner = () => {
    if (!scannerState) return;
    setScannerState(prev => prev ? { ...prev, isPaused: false, status: 'Retomando...' } : null);
    if (scannerState.pendingFiles) {
      processFiles(scannerState.pendingFiles, scannerState.current);
    }
  };

  const resumeReScanner = () => {
    if (!reScannerState) return;
    setReScannerState(prev => prev ? { ...prev, isPaused: false, status: 'Retomando...' } : null);
    if (reScannerState.pendingMovies) {
      processReScan(reScannerState.pendingMovies, reScannerState.current);
    }
  };

  const processFiles = async (files: any[], startIndex: number = 0, options?: { type?: 'movie' | 'series', folderName?: string }) => {
    const driveApiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
    if (!driveApiKey) return;

    const { data: existingMovies } = await supabase.from('movies').select('video_url');
    const existingUrls = new Set(existingMovies?.map(m => m.video_url) || []);

    // Se for série, vamos agrupar por pasta ou nome limpo
    if (options?.type === 'series' && files.length > 0) {
      setScannerState(prev => prev ? { ...prev, status: 'Organizando episódios...' } : null);
      
      // Usar o nome da pasta se disponível, senão o nome do primeiro arquivo
      const rawSeriesName = (options.folderName || files[0].name)
        .replace(/^\w+\s\(\d{4}\)\s?/, '')
        .replace(/\(\d{4}\)/g, '')
        .replace(/\[\d{4}\]/g, '')
        .trim();

      const seriesCleanName = await cleanTitle(rawSeriesName);
      
      // Buscar info da série no TMDB
      let searchRes = await tmdb.get(requests.searchTv, { params: { query: seriesCleanName } });
      
      if (searchRes.data.results.length === 0 && seriesCleanName !== rawSeriesName) {
        searchRes = await tmdb.get(requests.searchTv, { params: { query: rawSeriesName } });
      }

      const result = searchRes.data.results[0];
      
      let seriesData: any = null;
      if (result) {
        const detailsRes = await tmdb.get(requests.tvDetails(result.id));
        const providersRes = await tmdb.get(requests.tvWatchProviders(result.id)).catch(() => ({ data: { results: {} } }));
        const details = detailsRes.data;
        const providers = providersRes.data.results?.BR?.flatrate?.map((p: any) => p.provider_name).join(', ') || '';

        // Mapear arquivos para temporadas e episódios
        const mappedEpisodes = files.map((f) => {
          const name = f.name;
          // Tentar extrair temporada: S01, Season 1, 1x01, ou apenas o número da pasta pai
          const seMatch = name.match(/(\d+)x(\d+)/);
          const sMatch = seMatch ? { 1: seMatch[1] } : (name.match(/[Ss](\d+)/) || 
                         (f.parentFolderName?.match(/(?:Temporada|Season|T|S)\s*(\d+)/i)) ||
                         (f.parentFolderName?.match(/^(\d+)$/)));
          
          // Tentar extrair episódio: E01, Ep01, 1x01, ou número isolado
          const eMatch = seMatch ? { 1: seMatch[2] } : (name.match(/[Ee](\d+)/) || 
                         name.match(/[Ee]p(?:isódio)?\s*(\d+)/i));
          
          let episodeNum = 1;
          if (eMatch) {
            episodeNum = parseInt(eMatch[1]);
          } else {
            // Se não achou padrão E01, tenta pegar o primeiro número que aparece no nome
            // Mas evita pegar o mesmo número da temporada se ele aparecer no nome
            const seasonNum = sMatch ? parseInt(sMatch[1]) : 1;
            const numbers = name.match(/\d+/g);
            if (numbers) {
              const found = numbers.find(n => parseInt(n) !== seasonNum);
              episodeNum = found ? parseInt(found) : parseInt(numbers[0]);
            }
          }
          
          return {
            id: f.id,
            title: name.replace(/\.[^/.]+$/, ""),
            season: sMatch ? parseInt(sMatch[1]) : 1,
            episode: episodeNum,
            videoUrl: `https://drive.google.com/file/d/${f.id}/view`
          } as Episode;
        });

        // Resolver colisões de S/E (se aparecer S01E01 duas vezes, transforma o segundo em S02E01)
        const resolvedEpisodes: Episode[] = [];
        const seenSE = new Set<string>();

        // Ordenar por nome de arquivo para consistência
        const sortedMapped = [...mappedEpisodes].sort((a, b) => a.title.localeCompare(b.title));

        for (const ep of sortedMapped) {
          let currentS = ep.season;
          let key = `${currentS}-${ep.episode}`;
          
          while (seenSE.has(key)) {
            currentS++;
            key = `${currentS}-${ep.episode}`;
          }
          
          seenSE.add(key);
          resolvedEpisodes.push({
            ...ep,
            season: currentS
          });
        }

        // Buscar detalhes de cada temporada para pegar stills e overviews
        const uniqueSeasons = Array.from(new Set(resolvedEpisodes.map(e => e.season)));
        const seasonDetails: Record<number, any[]> = {};
        
        setScannerState(prev => prev ? { ...prev, status: 'Buscando detalhes dos episódios...' } : null);
        
        for (const s of uniqueSeasons) {
          try {
            const { fetchSeasonDetailsWithFallback } = await import('./services/tmdb');
            const res = await fetchSeasonDetailsWithFallback(result.id, s);
            let episodes = res.data.episodes;
            
            seasonDetails[s] = episodes;
          } catch (e) {
            console.error(`Erro ao buscar temporada ${s}:`, e);
          }
        }

        // Mesclar dados do TMDB com os arquivos do Drive
        const finalEpisodes = resolvedEpisodes.map(ep => {
          const tmdbEp = seasonDetails[ep.season]?.find(te => te.episode_number === ep.episode);
          return {
            ...ep,
            title: tmdbEp?.name || ep.title,
            overview: tmdbEp?.overview || '',
            still_path: tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w500/${tmdbEp.still_path}` : null
          };
        }).sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

        seriesData = {
          title: details.name,
          backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : 'https://picsum.photos/seed/series/1920/1080',
          poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : 'https://picsum.photos/seed/series/500/750',
          overview: details.overview || 'Série adicionada via pasta do Drive.',
          genres: details.genres?.map((g: any) => g.name).join(', ') || '',
          type: 'series',
          watch_providers: providers,
          episodes: finalEpisodes
        };
      } else {
        const mappedEpisodes = files.map((f) => {
          const name = f.name;
          const seMatch = name.match(/(\d+)x(\d+)/);
          const sMatch = seMatch ? { 1: seMatch[1] } : (name.match(/[Ss](\d+)/) || 
                         (f.parentFolderName?.match(/(?:Temporada|Season|T|S)\s*(\d+)/i)) ||
                         (f.parentFolderName?.match(/^(\d+)$/)));
          
          const eMatch = seMatch ? { 1: seMatch[2] } : (name.match(/[Ee](\d+)/) || 
                         name.match(/[Ee]p(?:isódio)?\s*(\d+)/i));
          
          let episodeNum = 1;
          if (eMatch) {
            episodeNum = parseInt(eMatch[1]);
          } else {
            const seasonNum = sMatch ? parseInt(sMatch[1]) : 1;
            const numbers = name.match(/\d+/g);
            if (numbers) {
              const found = numbers.find(n => parseInt(n) !== seasonNum);
              episodeNum = found ? parseInt(found) : parseInt(numbers[0]);
            }
          }
          
          return {
            id: f.id,
            title: name.replace(/\.[^/.]+$/, ""),
            season: sMatch ? parseInt(sMatch[1]) : 1,
            episode: episodeNum,
            videoUrl: `https://drive.google.com/file/d/${f.id}/view`
          } as Episode;
        });

        // Resolver colisões de S/E no fallback também
        const resolvedEpisodes: Episode[] = [];
        const seenSE = new Set<string>();
        const sortedMapped = [...mappedEpisodes].sort((a, b) => a.title.localeCompare(b.title));

        for (const ep of sortedMapped) {
          let currentS = ep.season;
          let key = `${currentS}-${ep.episode}`;
          while (seenSE.has(key)) {
            currentS++;
            key = `${currentS}-${ep.episode}`;
          }
          seenSE.add(key);
          resolvedEpisodes.push({ ...ep, season: currentS });
        }

        seriesData = {
          title: seriesCleanName,
          backdrop_path: 'https://picsum.photos/seed/series/1920/1080',
          poster_path: 'https://picsum.photos/seed/series/500/750',
          overview: 'Série adicionada via pasta do Drive (Informações não encontradas).',
          genres: 'Outros',
          type: 'series',
          episodes: resolvedEpisodes.sort((a, b) => (a.season - b.season) || (a.episode - b.episode))
        };
      }

      await supabase.from('movies').insert([seriesData]);
      notificationService.notifyNewMovie(seriesData.title || 'Nova Série', seriesData.poster_path);
      setScannerState(prev => prev ? { ...prev, added: 1, current: files.length, isScanning: false, status: 'Concluído' } : null);
      setTimeout(() => setScannerState(null), 5000);
      return;
    }

    for (let i = startIndex; i < files.length; i++) {
      const file = files[i];
      const videoUrl = `https://drive.google.com/file/d/${file.id}/view`;

      // Pular duplicados IMEDIATAMENTE
      if (existingUrls.has(videoUrl)) {
        setScannerState(prev => prev ? { 
          ...prev, 
          current: i + 1,
          skipped: prev.skipped + 1,
          status: `Pulando duplicado: ${file.name}`
        } : null);
        continue;
      }

      // Pequeno delay para permitir que o React atualize a UI
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verificar se foi pausado ou parado
      let isPaused = false;
      setScannerState(prev => {
        if (!prev || prev.isPaused) isPaused = true;
        return prev;
      });
      
      if (isPaused) return;

      setScannerState(prev => prev ? { 
        ...prev, 
        current: i + 1, 
        status: `Processando: ${file.name}`,
        pendingFiles: files 
      } : null);

      try {
        const rawFileName = file.name
          .replace(/^\w+\s\(\d{4}\)\s?/, '')
          .replace(/\(\d{4}\)/g, '')
          .replace(/\[\d{4}\]/g, '')
          .trim();

        const cleanName = await cleanTitle(rawFileName);
        let searchRes = await tmdb.get(requests.searchMulti, { params: { query: cleanName } });
        
        if (searchRes.data.results.length === 0 && cleanName !== rawFileName) {
          searchRes = await tmdb.get(requests.searchMulti, { params: { query: rawFileName } });
        }

        const result = searchRes.data.results[0];

        let movieData: any = null;
        if (result) {
          const detailsPath = result.media_type === 'tv' ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
          const providersPath = result.media_type === 'tv' ? requests.tvWatchProviders(result.id) : requests.movieWatchProviders(result.id);
          const imagesPath = result.media_type === 'tv' ? requests.tvImages(result.id) : requests.movieImages(result.id);
          
          const [detailsRes, providersRes, imagesRes] = await Promise.all([
            tmdb.get(detailsPath),
            tmdb.get(providersPath).catch(() => ({ data: { results: {} } })),
            tmdb.get(imagesPath, { params: { language: 'null', include_image_language: 'pt,en,null' } }).catch(() => ({ data: { logos: [] } }))
          ]);

          const details = detailsRes.data;
          const providers = providersRes.data.results?.BR?.flatrate?.map((p: any) => p.provider_name).join(', ') || '';
          const logos = imagesRes.data.logos || [];
          const logo = logos.find((l: any) => l.iso_639_1 === 'pt') || logos.find((l: any) => l.iso_639_1 === 'en') || logos[0];
          const logoPath = logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null;

          let collectionPoster = null;
          if (details.belongs_to_collection?.id) {
            try {
              const collRes = await tmdb.get(requests.fetchCollection(details.belongs_to_collection.id));
              if (collRes.data.poster_path) {
                collectionPoster = `https://image.tmdb.org/t/p/w500${collRes.data.poster_path}`;
              }
            } catch (err) {
              console.error('Erro ao buscar poster da coleção:', err);
            }
          }

          movieData = {
            title: details.title || details.name,
            video_url: videoUrl,
            backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : 'https://picsum.photos/seed/movie/1920/1080',
            poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : 'https://picsum.photos/seed/movie/500/750',
            logo_path: logoPath,
            overview: details.overview || 'Adicionado via pasta do Drive.',
            genres: details.genres?.map((g: any) => g.name).join(', ') || '',
            type: result.media_type === 'tv' ? 'series' : 'movie',
            runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
            rating: details.vote_average,
            release_year: details.release_date ? new Date(details.release_date).getFullYear() : (details.first_air_date ? new Date(details.first_air_date).getFullYear() : 0),
            watch_providers: providers,
            file_name: file.name,
            collection_id: details.belongs_to_collection?.id || null,
            collection_name: details.belongs_to_collection?.name || null,
            collection_poster_path: collectionPoster
          };
        } else {
          movieData = {
            title: cleanName,
            video_url: videoUrl,
            backdrop_path: 'https://picsum.photos/seed/movie/1920/1080',
            poster_path: 'https://picsum.photos/seed/movie/500/750',
            overview: 'Adicionado via pasta do Drive (Informações não encontradas).',
            genres: 'Outros',
            type: 'movie',
            file_name: file.name
          };
        }

        const { error: insertError } = await supabase.from('movies').insert([movieData]);
        if (!insertError) {
          setScannerState(prev => prev ? { ...prev, added: prev.added + 1 } : null);
          notificationService.notifyNewMovie(movieData.title || 'Novo Filme', movieData.poster_path);
        } else if (insertError.code === '23505') {
          setScannerState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
        }
      } catch (err) {
        console.error(`Erro ao processar arquivo ${file.name}:`, err);
      }
    }

    setScannerState(prev => prev ? { ...prev, isScanning: false, status: 'Concluído' } : null);
    setTimeout(() => setScannerState(null), 5000);
  };

  const processReScan = async (moviesToScan: Movie[], startIndex: number = 0) => {
    setReScannerState({
      isScanning: true,
      current: startIndex,
      total: moviesToScan.length,
      status: 'Iniciando Re-scan...',
      updated: 0,
      skipped: 0,
      pendingMovies: moviesToScan
    });

    for (let i = startIndex; i < moviesToScan.length; i++) {
      const movie = moviesToScan[i];

      // Pequeno delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se foi pausado ou parado
      let isPaused = false;
      setReScannerState(prev => {
        if (!prev || prev.isPaused) isPaused = true;
        return prev;
      });
      
      if (isPaused) return;

      setReScannerState(prev => prev ? { 
        ...prev, 
        current: i + 1, 
        status: `Corrigindo: ${movie.title}`,
        pendingMovies: moviesToScan 
      } : null);

      try {
        const rawTitle = (movie.title || "")
          .replace(/^\w+\s\(\d{4}\)\s?/, '')
          .replace(/\(\d{4}\)/g, '')
          .replace(/\[\d{4}\]/g, '')
          .trim();

        const cleanName = await cleanTitle(rawTitle);
        let searchRes = await tmdb.get(requests.searchMulti, { params: { query: cleanName } });
        
        if (searchRes.data.results.length === 0 && cleanName !== rawTitle) {
          searchRes = await tmdb.get(requests.searchMulti, { params: { query: rawTitle } });
        }

        const result = searchRes.data.results[0];

        if (result) {
          const detailsPath = result.media_type === 'tv' ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
          const providersPath = result.media_type === 'tv' ? requests.tvWatchProviders(result.id) : requests.movieWatchProviders(result.id);
          const imagesPath = result.media_type === 'tv' ? requests.tvImages(result.id) : requests.movieImages(result.id);
          const creditsPath = result.media_type === 'tv' ? requests.tvCredits(result.id) : requests.movieCredits(result.id);
          
          const [detailsRes, providersRes, imagesRes, creditsRes] = await Promise.all([
            tmdb.get(detailsPath),
            tmdb.get(providersPath).catch(() => ({ data: { results: {} } })),
            tmdb.get(imagesPath, { params: { language: 'null', include_image_language: 'pt,en,null' } }).catch(() => ({ data: { logos: [] } })),
            tmdb.get(creditsPath).catch(() => ({ data: { cast: [] } }))
          ]);

          const details = detailsRes.data;
          const providers = providersRes.data.results?.BR?.flatrate?.map((p: any) => p.provider_name).join(', ') || '';
          const logos = imagesRes.data.logos || [];
          const logo = logos.find((l: any) => l.iso_639_1 === 'pt') || logos.find((l: any) => l.iso_639_1 === 'en') || logos[0];
          const logoPath = logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : movie.logo_path;
          const actors = creditsRes.data.cast?.slice(0, 10).map((c: any) => c.name).join(', ');

          let collectionPoster = movie.collection_poster_path;
          if (details.belongs_to_collection?.id) {
            try {
              const collRes = await tmdb.get(requests.fetchCollection(details.belongs_to_collection.id));
              if (collRes.data.poster_path) {
                collectionPoster = `https://image.tmdb.org/t/p/w500${collRes.data.poster_path}`;
              }
            } catch (err) {
              console.error('Erro ao buscar poster da coleção no re-scan:', err);
            }
          }

          // Se for série, atualizar também os metadados dos episódios
          let updatedEpisodes = movie.episodes;
          if (result.media_type === 'tv' && movie.episodes) {
            const uniqueSeasons = Array.from(new Set(movie.episodes.map(e => e.season)));
            const seasonDetails: Record<number, any[]> = {};
            
            for (const s of uniqueSeasons) {
              try {
                const { fetchSeasonDetailsWithFallback } = await import('./services/tmdb');
                const res = await fetchSeasonDetailsWithFallback(result.id, s);
                let episodes = res.data.episodes;

                seasonDetails[s] = episodes;
              } catch (e) {
                console.error(`Erro ao buscar temporada ${s} no re-scan:`, e);
              }
            }

            updatedEpisodes = movie.episodes.map(ep => {
              const tmdbEp = seasonDetails[ep.season]?.find(te => te.episode_number === ep.episode);
              return {
                ...ep,
                title: tmdbEp?.name || ep.title,
                overview: tmdbEp?.overview || ep.overview || '',
                still_path: tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w500/${tmdbEp.still_path}` : ep.still_path
              };
            });
          }

          await supabase.from('movies').update({
            title: details.title || details.name,
            backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : movie.backdrop_path,
            poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : movie.poster_path,
            logo_path: logoPath,
            overview: details.overview || movie.overview,
            genres: details.genres?.map((g: any) => g.name).join(', ') || movie.genres,
            type: result.media_type === 'tv' ? 'series' : 'movie',
            runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
            actors: actors,
            rating: details.vote_average,
            release_date: details.release_date || details.first_air_date,
            release_year: details.release_date ? new Date(details.release_date).getFullYear() : (details.first_air_date ? new Date(details.first_air_date).getFullYear() : 0),
            watch_providers: providers,
            episodes: updatedEpisodes,
            file_name: movie.file_name || movie.title, 
            last_rescanned_at: new Date().toISOString(),
            collection_id: details.belongs_to_collection?.id || null,
            collection_name: details.belongs_to_collection?.name || null,
            collection_poster_path: collectionPoster,
            collection_logo_path: movie.collection_logo_path // Pre-initialize or keep existing if not fetched
          }).eq('id', movie.id);

          // If we have a collection but don't have its logo yet, we should try to fetch it
          if (details.belongs_to_collection?.id) {
            try {
              const imagesRes = await tmdb.get(`/collection/${details.belongs_to_collection.id}/images`, { params: { include_image_language: 'pt,en,null' } });
              const logos = imagesRes.data.logos || [];
              const bestLogo = logos.find((l: any) => l.iso_639_1 === 'pt') || 
                               logos.find((l: any) => l.iso_639_1 === 'en') || 
                               logos[0];
              
              if (bestLogo) {
                const collectionLogo = `https://image.tmdb.org/t/p/original${bestLogo.file_path}`;
                await supabase.from('movies').update({ collection_logo_path: collectionLogo }).eq('id', movie.id);
              }
            } catch (err) {
              console.error('Erro ao buscar logo da coleção no re-scan:', err);
            }
          }
          
          setReScannerState(prev => prev ? { ...prev, updated: prev.updated + 1 } : null);
        } else {
          setReScannerState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
        }
      } catch (err) {
        console.error(`Erro no re-scan de ${movie.title}:`, err);
      }
    }

    setReScannerState(prev => prev ? { ...prev, isScanning: false, status: 'Re-scan Concluído' } : null);
    setTimeout(() => setReScannerState(null), 5000);
  };

  const processCollectionAutomation = async (moviesToScan: Movie[], startIndex: number = 0) => {
    setCollectionAutomationState({
      isScanning: true,
      current: startIndex,
      total: moviesToScan.length,
      status: 'Iniciando Automação...',
      updated: 0,
      skipped: 0,
      pendingMovies: moviesToScan
    });

    for (let i = startIndex; i < moviesToScan.length; i++) {
      const movie = moviesToScan[i];

      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if paused
      let isPaused = false;
      setCollectionAutomationState(prev => {
        if (!prev || prev.isPaused) isPaused = true;
        return prev;
      });
      if (isPaused) return;

      setCollectionAutomationState(prev => prev ? { 
        ...prev, 
        current: i + 1, 
        status: `Analisando: ${movie.title}`,
        pendingMovies: moviesToScan 
      } : null);

      try {
        // 1. Search for specific details
        const searchRes = await tmdb.get(requests.searchMulti, { params: { query: movie.title || movie.name } });
        const firstResult = searchRes.data.results?.[0];
        
        if (firstResult) {
          const isTv = firstResult.media_type === 'tv' || !firstResult.title;
          const detailsPath = isTv ? requests.tvDetails(firstResult.id) : requests.movieDetails(firstResult.id);
          const detailsRes = await tmdb.get(detailsPath);
          const details = detailsRes.data;

          if (details.belongs_to_collection) {
            const collInfo = details.belongs_to_collection;
            
            // 2. Fetch the collection details and images
            let collectionPoster = null;
            let collectionLogo = null;
            try {
              const collRes = await tmdb.get(requests.fetchCollection(collInfo.id));
              const collData = collRes.data;
              
              if (collData.poster_path) {
                collectionPoster = `https://image.tmdb.org/t/p/original${collData.poster_path}`;
              }

              // Fetch logos for collection
              const imagesRes = await tmdb.get(`/collection/${collInfo.id}/images`, { params: { include_image_language: 'pt,en,null' } });
              const logos = imagesRes.data.logos || [];
              const bestLogo = logos.find((l: any) => l.iso_639_1 === 'pt') || 
                               logos.find((l: any) => l.iso_639_1 === 'en') || 
                               logos[0];
              
              if (bestLogo) {
                collectionLogo = `https://image.tmdb.org/t/p/original${bestLogo.file_path}`;
              }
            } catch (collErr) {
              console.error(`Erro ao buscar assets para coleção ${collInfo.name}:`, collErr);
            }

            // 3. Update movie with collection data
            await handleUpdateMovie({
              ...movie,
              collection_id: collInfo.id,
              collection_name: collInfo.name,
              collection_poster_path: collectionPoster,
              collection_logo_path: collectionLogo
            } as Movie);
            
            setCollectionAutomationState(prev => prev ? { ...prev, updated: prev.updated + 1 } : null);
          } else {
            setCollectionAutomationState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
          }
        } else {
          setCollectionAutomationState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
        }
      } catch (err) {
        console.error(`Erro ao automatizar coleção para ${movie.title}:`, err);
      }
    }

    setCollectionAutomationState(prev => prev ? { ...prev, isScanning: false, status: 'Automação Concluída' } : null);
    setTimeout(() => setCollectionAutomationState(null), 5000);
  };

  const startCollectionAutomation = (moviesToScan: Movie[]) => {
    processCollectionAutomation(moviesToScan);
  };

  const startReScanner = (moviesToScan: Movie[]) => {
    setReScannerState({
      isScanning: true,
      current: 0,
      total: moviesToScan.length,
      status: 'Iniciando Re-scan...',
      updated: 0,
      skipped: 0,
      pendingMovies: moviesToScan
    });
    processReScan(moviesToScan);
  };

  const listAllFilesRecursive = async (folderId: string, driveApiKey: string, parentName?: string): Promise<any[]> => {
    let allFiles: any[] = [];
    
    try {
      // 1. Listar vídeos nesta pasta com paginação completa
      let fileToken = '';
      do {
        const query = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${driveApiKey}&fields=nextPageToken,files(id,name,mimeType)&pageSize=100${fileToken ? `&pageToken=${fileToken}` : ''}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.files) {
          const videoFiles = data.files.filter((f: any) => 
            f.mimeType.includes('video/') || 
            /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(f.name)
          );
          allFiles = [...allFiles, ...videoFiles.map((f: any) => ({ ...f, parentFolderName: parentName }))];
        }
        fileToken = data.nextPageToken;
      } while (fileToken);

      // 2. Listar subpastas com paginação completa
      let folderToken = '';
      do {
        const query = `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&key=${driveApiKey}&fields=nextPageToken,files(id,name)&pageSize=100${folderToken ? `&pageToken=${folderToken}` : ''}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.files) {
          for (const subfolder of data.files) {
            const subfolderFiles = await listAllFilesRecursive(subfolder.id, driveApiKey, subfolder.name);
            allFiles = [...allFiles, ...subfolderFiles];
          }
        }
        folderToken = data.nextPageToken;
      } while (folderToken);
    } catch (error) {
      console.error('Erro na recursão do Drive:', error);
    }

    return allFiles;
  };

  const startScanner = async (folderId: string, folderUrl: string, options?: { type?: 'movie' | 'series' }) => {
    const driveApiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
    if (!driveApiKey) return;

    setScannerState({
      isScanning: true,
      current: 0,
      total: 0,
      status: 'Buscando informações da pasta...',
      added: 0,
      skipped: 0,
      folderUrl
    });

    try {
      // Buscar nome da pasta raiz
      const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?key=${driveApiKey}&fields=name`);
      const folderData = await folderRes.json();
      const folderName = folderData.name || '';

      setScannerState(prev => prev ? { ...prev, status: 'Listando arquivos (incluindo subpastas)...' } : null);
      const allFiles = await listAllFilesRecursive(folderId, driveApiKey);
      
      // Atualizar o total real após a recursão completa
      setScannerState(prev => prev ? { ...prev, total: allFiles.length } : null);

      if (allFiles.length === 0) {
        setScannerState(null);
        alert('Nenhum vídeo encontrado na pasta ou subpastas.');
        return;
      }

      processFiles(allFiles, 0, { ...options, folderName });
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
      setScannerState(null);
    }
  };

  // Retomar scanner ao carregar se necessário
  useEffect(() => {
    const savedScanner = localStorage.getItem('scanner_state');
    if (savedScanner) {
      const state = JSON.parse(savedScanner) as ScannerState;
      if (state.isScanning && !state.isPaused && state.pendingFiles) {
        processFiles(state.pendingFiles, state.current);
      }
    }

    const savedReScanner = localStorage.getItem('rescanner_state');
    if (savedReScanner) {
      const state = JSON.parse(savedReScanner) as ReScannerState;
      if (state.isScanning && !state.isPaused && state.pendingMovies) {
        processReScan(state.pendingMovies, state.current);
      }
    }

    const savedCollectionScanner = localStorage.getItem('collection_automation_state');
    if (savedCollectionScanner) {
      const state = JSON.parse(savedCollectionScanner) as CollectionScannerState;
      if (state.isScanning && !state.isPaused && state.pendingMovies) {
        processCollectionAutomation(state.pendingMovies, state.current);
      }
    }
  }, []);

  const handleUpdateCollectionLogos = async (specificCollectionId?: number) => {
    // Agrupar primeiro por ID de coleção para evitar requests repetidos para o mesmo multiverso
    const collectionsMap: Record<number, Movie[]> = {};
    myMovies.forEach(m => {
      if (m.collection_id) {
        if (!collectionsMap[m.collection_id]) collectionsMap[m.collection_id] = [];
        collectionsMap[m.collection_id].push(m);
      }
    });

    const collectionIds = specificCollectionId ? [specificCollectionId] : Object.keys(collectionsMap).map(Number);
    
    if (collectionIds.length === 0) {
      alert('Nenhuma coleção encontrada para atualizar.');
      return;
    }

    const msg = specificCollectionId 
      ? `Atualizar identidade visual da coleção "${collectionsMap[specificCollectionId]?.[0]?.collection_name || 'selecionada'}"?`
      : `Deseja fazer um Check-up Geral em ${collectionIds.length} Coleções? (Isso irá sobrescrever posters e logos pelos oficiais TMDB)`;

    if (!window.confirm(msg)) return;

    setCollectionAutomationState({
      isScanning: true,
      current: 0,
      total: collectionIds.length,
      status: 'Sincronizando Identidade de Coleções...',
      updated: 0,
      skipped: 0,
      pendingMovies: []
    });

    for (let i = 0; i < collectionIds.length; i++) {
      const collId = collectionIds[i];
      const moviesInColl = collectionsMap[collId] || [];
      const firstMovie = moviesInColl[0];
      
      setCollectionAutomationState(prev => prev ? { 
        ...prev, 
        current: i + 1, 
        status: `Processando Nexus: ${firstMovie?.collection_name || 'Coleção'}`
      } : null);

      try {
        const collRes = await tmdb.get(requests.fetchCollection(collId));
        const collection = collRes.data;

        // Procurar Logo Oficial da Coleção
        let logoPath = firstMovie.collection_logo_path;
        
        try {
          // 1. Tentar buscar logos da própria coleção (embora a API de coleção seja limitada, algumas retornam)
          const collImagesRes = await tmdb.get(`/collection/${collId}/images`, { params: { include_image_language: 'pt,en,null' } }).catch(() => null);
          const collLogos = collImagesRes?.data?.logos || [];
          
          let bestLogo = collLogos.find((l: any) => l.iso_639_1 === 'pt') || 
                         collLogos.find((l: any) => l.iso_639_1 === 'en') || 
                         collLogos[0];

          // 2. Se não achou na coleção, buscar nos filmes da coleção (geralmente trazem a logo da saga)
          if (!bestLogo) {
             const imagesPath = firstMovie.type === 'series' ? requests.tvImages(firstMovie.id) : requests.movieImages(firstMovie.id);
             const imagesRes = await tmdb.get(imagesPath, { params: { include_image_language: 'pt,en,null' } });
             const logos = imagesRes.data.logos || [];
             bestLogo = logos.find((l: any) => l.iso_639_1 === 'pt') || 
                        logos.find((l: any) => l.iso_639_1 === 'en') || 
                        logos[0];
          }
          
          if (bestLogo) {
            logoPath = `https://image.tmdb.org/t/p/original${bestLogo.file_path}`;
          } else if (firstMovie.logo_path) {
            logoPath = firstMovie.logo_path;
          }
        } catch (e) {
          console.error("Erro ao buscar logo para a coleção:", e);
        }

        const posterPath = collection.poster_path ? `https://image.tmdb.org/t/p/original${collection.poster_path}` : firstMovie.collection_poster_path;
        
        // Super fallback logic for backdrops: 
        // 1. Collection official backdrop
        // 2. Collection official poster (better than nothing/empty)
        // 3. First movie official backdrop
        // 4. First movie official poster
        const backdropPath = collection.backdrop_path 
          ? `https://image.tmdb.org/t/p/original${collection.backdrop_path}` 
          : (collection.poster_path 
              ? `https://image.tmdb.org/t/p/original${collection.poster_path}` 
              : (firstMovie.collection_backdrop_path || firstMovie.backdrop_path || firstMovie.poster_path)
            );

        // Atualizar todos os filmes desta coleção
        for (const movie of moviesInColl) {
          await handleUpdateMovie({
            ...movie,
            collection_name: collection.name || movie.collection_name,
            collection_logo_path: logoPath,
            collection_poster_path: posterPath,
            collection_backdrop_path: backdropPath
          } as Movie, true);
        }

        setCollectionAutomationState(prev => prev ? { ...prev, updated: prev.updated + 1 } : null);
      } catch (err) {
        console.error(`Erro ao atualizar coleção ID ${collId}:`, err);
        setCollectionAutomationState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setCollectionAutomationState(prev => prev ? { ...prev, isScanning: false, status: 'Identidades Sincronizadas!' } : null);
    setTimeout(() => setCollectionAutomationState(null), 3000);
  };

  const handleSyncMissingMovieLogos = async () => {
    const hasLogos = myMovies.filter(m => m.logo_path && !m.logo_path.includes('placeholder'));
    const missingLogos = myMovies.filter(m => !m.logo_path || m.logo_path === '' || m.logo_path.includes('placeholder'));
    
    let moviesToProcess = missingLogos;
    let mode: 'missing' | 'all' = 'missing';

    if (hasLogos.length > 0) {
      const confirmAll = window.confirm(`Você tem ${hasLogos.length} logos já configuradas e ${missingLogos.length} faltando. \n\nDeseja fazer um "Check-up Geral" (sobrescrever logos antigas pelas oficiais TMDB) ou apenas buscar as que faltam?\n\n[OK] = Check-up Geral (Sobrescrever)\n[Cancelar] = Apenas as que faltam`);
      if (confirmAll) {
        moviesToProcess = myMovies;
        mode = 'all';
      }
    }

    if (moviesToProcess.length === 0) {
      alert('Todos os filmes e séries já possuem logo!');
      return;
    }

    setReScannerState({
      isScanning: true,
      current: 0,
      total: moviesToProcess.length,
      status: mode === 'all' ? 'Iniciando Check-up Geral de Logos...' : 'Buscando logos na nuvem...',
      updated: 0,
      skipped: 0,
    });

    for (let i = 0; i < moviesToProcess.length; i++) {
      const movie = moviesToProcess[i];
      
      setReScannerState(prev => prev ? { 
        ...prev, 
        current: i + 1, 
        status: `Analisando: ${movie.title || movie.name}`
      } : null);

      try {
        const logo = await getMovieLogo(movie.id, (movie as any).name ? 'tv' : 'movie');
        
        if (logo) {
          await handleUpdateMovie({
            ...movie,
            logo_path: logo
          } as Movie, true);
          setReScannerState(prev => prev ? { ...prev, updated: prev.updated + 1 } : null);
        } else {
          setReScannerState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
        }
      } catch (err) {
        console.error(`Erro ao sincronizar logo de ${movie.title}:`, err);
        setReScannerState(prev => prev ? { ...prev, skipped: prev.skipped + 1 } : null);
      }

      // Pequeno delay para evitar rate limit do TMDB
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setReScannerState(prev => prev ? { ...prev, isScanning: false, status: 'Check-up de Logos Concluído!' } : null);
    setTimeout(() => setReScannerState(null), 3000);
  };

  const handleUpdateMovie = async (movie: Movie, silent: boolean = false) => {
    try {
      const updateData = {
        title: movie.title || movie.name,
        video_url: movie.videoUrl || (movie as any).video_url,
        video_url_2: movie.videoUrl2 || (movie as any).video_url_2,
        release_date: movie.release_date,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : movie.release_year,
        runtime: movie.runtime,
        rating: movie.rating || movie.vote_average,
        actors: movie.actors,
        is_hidden: movie.is_hidden,
        watch_providers: movie.watch_providers,
        overview: movie.overview,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        logo_path: movie.logo_path,
        genres: movie.genres,
        type: movie.type,
        episodes: movie.episodes,
        file_name: movie.file_name,
        collection_id: movie.collection_id,
        collection_name: movie.collection_name,
        collection_poster_path: movie.collection_poster_path,
        collection_logo_path: movie.collection_logo_path
      };

      const { error } = await supabase.from('movies').update(updateData).eq('id', movie.id);
      
      if (error) {
        console.error('Erro detalhado do Supabase na atualização:', error);
        if (!silent) alert(`Erro ao salvar alterações: ${error.message}`);
        throw error;
      }

      fetchMyMovies();
    } catch (err) {
      console.error('Erro ao atualizar filme:', err);
      if (!silent) alert('Ocorreu um erro ao atualizar o conteúdo.');
      throw err;
    }
  };

  const handleRequestMovie = async (movie: Partial<Movie>) => {
    try {
      const titleLower = (movie.title || movie.name || '').toLowerCase();
      
      const alreadyInLibrary = myMovies.some(m => 
        m.videoUrl !== 'REQUESTED' && 
        (m.title?.toLowerCase() === titleLower || (m as any).name?.toLowerCase() === titleLower)
      );

      if (alreadyInLibrary) {
        alert('Este título já está disponível na plataforma! Procure na busca ou navegue pelas categorias.');
        return;
      }

      const isAlreadyRequested = myMovies.some(m => 
        m.videoUrl === 'REQUESTED' && 
        (m.title?.toLowerCase() === titleLower || (m as any).name?.toLowerCase() === titleLower)
      );

      if (isAlreadyRequested) {
        alert('Paciência, Jovem Padawan! Este título já foi solicitado e nossa equipe está trabalhando para trazê-lo.');
        return;
      }

      await handleCreateMovie({
        ...movie,
        videoUrl: 'REQUESTED',
        is_hidden: true
      });
      alert('Entendido! Sua indicação foi enviada aos comandantes. Fique de olho nas novidades!');
    } catch (err) {
      console.error('Erro ao indicar:', err);
    }
  };

  const handleCreateMovie = async (movie: Partial<Movie>) => {
    try {
      const movieData = {
        created_at: new Date().toISOString(),
        title: movie.title || movie.name,
        video_url: movie.videoUrl || (movie as any).video_url,
        video_url_2: movie.videoUrl2 || (movie as any).video_url_2,
        release_date: movie.release_date,
        release_year: movie.release_date ? new Date(movie.release_date).getFullYear() : movie.release_year,
        runtime: movie.runtime,
        rating: movie.rating || movie.vote_average,
        actors: movie.actors,
        is_hidden: movie.is_hidden,
        watch_providers: movie.watch_providers,
        overview: movie.overview,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        logo_path: movie.logo_path,
        genres: movie.genres,
        type: movie.type,
        episodes: movie.episodes,
        file_name: movie.file_name,
        collection_id: movie.collection_id,
        collection_name: movie.collection_name,
        collection_poster_path: movie.collection_poster_path,
        collection_logo_path: movie.collection_logo_path
      };

      const { error } = await supabase.from('movies').insert([movieData]);
      
      if (error) {
        console.error('Erro detalhado do Supabase na criação:', error);
        alert(`Erro ao cadastrar novo conteúdo: ${error.message}`);
        throw error;
      }

      fetchMyMovies();
    } catch (err) {
      console.error('Erro ao criar filme:', err);
      throw err;
    }
  };

  const handleDeleteMovies = async (ids: number[]) => {
    const { error } = await supabase.from('movies').delete().in('id', ids);
    if (!error) {
      fetchMyMovies();
    }
  };

  const handleToggleHideMovies = async (ids: number[], hide: boolean) => {
    const { error } = await supabase.from('movies').update({ is_hidden: hide }).in('id', ids);
    if (!error) {
      fetchMyMovies();
    }
  };

  // Verificação de chaves de API

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Tentar recuperar perfil salvo no localStorage
      const savedProfile = localStorage.getItem('active_profile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      
      setLoading(false);

      // Verificar se há uma sala no URL
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('room');
      const movieId = params.get('movie');

      if (roomId && movieId) {
        // O filme será carregado quando o usuário selecionar o perfil
      }
    }).catch(err => {
      console.error('Erro ao verificar sessão Supabase:', err);
      setLoading(false);
    });

    // Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        localStorage.removeItem('active_profile');
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [hasSupabase]);

  useEffect(() => {
    const checkAdmin = async () => {
       if (user) {
          // Hardlock para o email principal caso a tabela ainda não exista
          if (user.email === 'costachristopher31@gmail.com') {
             setIsAdmin(true);
             return;
          }
          
          // Verificação na tabela SQL
          try {
            console.log('Verificando status de admin para:', user.email);
            const { data, error } = await supabase.from('admin_users').select('email').eq('email', user.email).single();
            if (data) {
               console.log('Status de Admin CONFIRMADO');
               setIsAdmin(true);
            } else {
               console.log('Usuário não é admin na base SQL');
               setIsAdmin(false);
            }
          } catch (e) {
            console.error('Erro na verificação de admin:', e);
            setIsAdmin(false);
          }
       } else {
          setIsAdmin(false);
       }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (profile && activeRoomId && myMovies.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const movieId = params.get('movie');
      
      if (movieId) {
        // Buscar o filme para entrar na sala
        const movie = myMovies.find(m => m.id.toString() === movieId);
        if (movie) {
          setSelectedMovie(movie);
          setViewingMovie(null);
        }
      }
    }
  }, [profile, activeRoomId, myMovies]);

  const fetchMyMovies = async () => {
    // Tentar carregar do cache primeiro
    const cached = localStorage.getItem('cached_my_movies');
    if (cached) {
      setMyMovies(JSON.parse(cached));
    }

    if (!hasSupabase || !user) {
      console.log('fetchMyMovies: Sem Supabase ou Usuário', { hasSupabase, user: !!user });
      return;
    }
    
    try {
      console.log('Buscando filmes do Supabase...');
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log(`Filmes encontrados: ${data?.length || 0}`);

      if (data) {
        const formattedMovies: Movie[] = data.map(m => ({
          ...m,
          id: m.id,
          videoUrl: m.video_url,
          videoUrl2: m.video_url_2,
          vote_average: m.vote_average || m.rating || 0,
          rating: m.rating || m.vote_average || 0,
          release_date: m.release_date || '',
          release_year: m.release_year || (m.release_date ? new Date(m.release_date).getFullYear() : 0),
          runtime: m.runtime || 0,
          actors: m.actors || '',
          is_hidden: m.is_hidden || false,
          watch_providers: m.watch_providers || ''
        }));

        setMyMovies(formattedMovies);
        localStorage.setItem('cached_my_movies', JSON.stringify(formattedMovies));
      }
    } catch (error) {
      console.error('Erro ao buscar filmes do Supabase:', error);
    }
  };

  const fetchContinueWatching = async () => {
    if (!profile) return;

    // Tentar carregar do cache primeiro
    const cached = localStorage.getItem(`cached_continue_${profile.id}`);
    if (cached) {
      setContinueWatching(JSON.parse(cached));
    }

    try {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*, movie:movies(*)')
        .eq('profile_id', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const historyMap: Record<number, number> = {};
        const formatted: Movie[] = data
          .filter(h => h.movie)
          .map(h => {
            historyMap[h.movie_id] = h.last_position;
            return {
              ...h.movie,
              id: h.movie.id,
              title: h.movie.title,
              backdrop_path: h.movie.backdrop_path,
              poster_path: h.movie.poster_path,
              logo_path: h.movie.logo_path,
              videoUrl: h.movie.video_url,
              videoUrl2: h.movie.video_url_2,
              last_position: h.last_position,
              release_date: h.movie.release_date,
              runtime: h.movie.runtime,
              rating: h.movie.rating || h.movie.vote_average,
              actors: h.movie.actors
            };
          });
        setWatchHistory(historyMap);
        setContinueWatching(formatted);
        localStorage.setItem(`cached_continue_${profile.id}`, JSON.stringify(formatted));
      }
    } catch (error) {
      console.error('Erro ao buscar continuar assistindo:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyMovies();
      fetchContinueWatching();

      // Adicionar listener em tempo real para a tabela de filmes
      const channel = supabase
        .channel('public:movies')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => {
          fetchMyMovies();
        })
        .subscribe();

      // Adicionar listener em tempo real para a tabela de minha lista
      const listChannel = supabase
        .channel('public:my_list')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'my_list' }, () => {
          fetchMyList();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(listChannel);
      };
    } else {
      setMyMovies([]);
    }
  }, [user]);

  const fetchMyList = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('my_list')
        .select('*, movie:movies(*)')
        .eq('profile_id', profile.id);
      
      if (error) throw error;
      if (data) {
        setMyList(data.map((item: any) => ({
          ...item.movie,
          id: item.movie.id,
          videoUrl: item.movie.video_url,
          videoUrl2: item.movie.video_url_2
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar minha lista:', error);
    }
  };

  const fetchAppSettings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAppSettings(data);
        if (data.category_backdrops) {
          setCategories(prev => prev.map(c => data.category_backdrops[c.id] ? { ...c, backdrop: data.category_backdrops[c.id] } : c));
        }
      } else {
        // Criar configurações padrão se não existirem
        const { data: newData, error: createError } = await supabase
          .from('app_settings')
          .insert([{ user_id: user.id, subscription_status: 'inactive' }])
          .select()
          .single();
        if (!createError) setAppSettings(newData);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const fetchFavorites = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('movie_data')
        .eq('profile_id', profile.id);
      
      if (error) throw error;
      setFavorites(data?.map(d => d.movie_data) || []);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
    }
  };

  const toggleFavorite = async (movie: Movie) => {
    if (!profile?.id) return;

    const isFavorite = favorites.some(m => m.id === movie.id);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('profile_id', profile.id)
          .eq('movie_id', movie.id);
        
        if (error) throw error;
        setFavorites(prev => prev.filter(m => m.id !== movie.id));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            profile_id: profile.id,
            movie_id: movie.id,
            movie_data: movie
          });
        
        if (error) throw error;
        setFavorites(prev => [...prev, movie]);
      }
    } catch (error) {
      console.error('Erro ao alternar favorito:', error);
      alert('Tivemos um problema ao atualizar os Favoritos. Verifique a conexão e tente novamente.');
    }
  };

  const toggleMyList = async (movie: Movie) => {
    if (!profile) return;
    const isInList = myList.some(m => m.id === movie.id);
    
    try {
      if (isInList) {
        const { error } = await supabase
          .from('my_list')
          .delete()
          .eq('profile_id', profile.id)
          .eq('movie_id', movie.id);
          
        if (error) throw error;
        setMyList(prev => prev.filter(m => m.id !== movie.id));
      } else {
        const { error } = await supabase
          .from('my_list')
          .insert([{ profile_id: profile.id, movie_id: movie.id }]);
          
        if (error) throw error;
        setMyList(prev => [...prev, movie]);
      }
    } catch (error) {
      console.error('Erro ao alternar minha lista:', error);
      alert('Tivemos um problema ao atualizar a Minha Lista. Verifique a conexão e tente novamente.');
    }
  };

  useEffect(() => {
    if (profile) {
      fetchContinueWatching();
      fetchMyList();
      fetchFavorites();
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchAppSettings();
    }
  }, [user]);

  const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .update(newSettings)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      if (data) setAppSettings(data);
    } catch (error) {
      console.error('Error updating app settings:', error);
    }
  };

  const visibleMovies = useMemo(() => {
    return myMovies.filter(m => !m.is_hidden);
  }, [myMovies]);

  // Filtrar filmes para Lançamentos (2025-2026)
  const newMovies = useMemo(() => {
    return visibleMovies.filter(movie => {
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 
                   (movie.release_year ? parseInt(String(movie.release_year)) : 0);
      return year === 2025 || year === 2026;
    });
  }, [visibleMovies]);

  // Filtrar filmes para Fresquinho do Cinema (2026 e <= 5 meses)
  const cinemaMovies = useMemo(() => {
    const now = new Date();
    return visibleMovies.filter(movie => {
      if (!movie.release_date) return false;
      const releaseDate = new Date(movie.release_date);
      const year = releaseDate.getFullYear();
      
      if (year !== 2026) return false;

      const diffMonths = (now.getFullYear() - releaseDate.getFullYear()) * 12 + (now.getMonth() - releaseDate.getMonth());
      return diffMonths <= 5 && diffMonths >= 0;
    });
  }, [visibleMovies]);

  // Top 10 Filmes
  const top10Movies = useMemo(() => {
    return visibleMovies
      .filter(m => m.type === 'movie' || !m.type)
      .slice(0, 10);
  }, [visibleMovies]);

  // Top 10 Séries
  const top10Series = useMemo(() => {
    return visibleMovies
      .filter(m => m.type === 'series')
      .slice(0, 10);
  }, [visibleMovies]);

  // Cara Nova (Recém re-scaneados)
  const caraNovaMovies = useMemo(() => {
    const now = new Date().getTime();
    return visibleMovies.filter(movie => {
      if (movie.last_rescanned_at) {
        const rescanDate = new Date(movie.last_rescanned_at).getTime();
        const diffHours = (now - rescanDate) / (1000 * 60 * 60);
        return diffHours <= 24;
      }
      return false;
    });
  }, [visibleMovies]);

  // Conteúdo TeraBox
  const teraboxMovies = useMemo(() => {
    return visibleMovies.filter(m => 
      m.videoUrl?.includes('terabox') || 
      m.videoUrl?.includes('1024terabox') || 
      m.videoUrl?.includes('teraboxapp')
    ).slice(0, 10);
  }, [visibleMovies]);

  // Conteúdo TARAPLAY (KingX/TeraDL)
  const taraplayMovies = useMemo(() => {
    return visibleMovies.filter(m => 
      m.videoUrl?.includes('player.kingx.dev') || 
      m.videoUrl?.includes('teradl.kingx.dev') ||
      m.videoUrl?.includes('gdplayer.to') ||
      m.videoUrl?.includes('gdplayer.org')
    );
  }, [visibleMovies]);

  // Função auxiliar para agrupar por gênero
  const groupByGenre = (movies: Movie[]) => {
    const grouped: { [key: string]: Movie[] } = {};
    movies.forEach(movie => {
      if (!movie.genres) {
        if (!grouped['Outros']) grouped['Outros'] = [];
        grouped['Outros'].push(movie);
        return;
      }
      const genres = movie.genres.split(',').map(g => g.trim());
      genres.forEach(genre => {
        if (!grouped[genre]) grouped[genre] = [];
        grouped[genre].push(movie);
      });
    });
    return Object.keys(grouped).sort().reduce((acc, key) => {
      acc[key] = grouped[key];
      return acc;
    }, {} as { [key: string]: Movie[] });
  };

  const moviesByGenre = useMemo(() => groupByGenre(visibleMovies), [visibleMovies]);
  const newMoviesByGenre = useMemo(() => groupByGenre(newMovies), [newMovies]);

  // Filtrar filmes para a pesquisa
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return visibleMovies.filter(movie => {
      const title = (movie.title || "").toLowerCase();
      const name = (movie.name || "").toLowerCase();
      const originalName = (movie.original_name || "").toLowerCase();
      const genres = (movie.genres || "").toLowerCase();
      const overview = (movie.overview || "").toLowerCase();
      
      return title.includes(query) || 
             name.includes(query) || 
             originalName.includes(query) || 
             genres.includes(query) ||
             overview.includes(query);
    });
  }, [visibleMovies, searchQuery]);

  const handleSelectProfile = (selectedProfile: Profile) => {
    setProfile(selectedProfile);
    localStorage.setItem('active_profile', JSON.stringify(selectedProfile));
    
    // Se havia uma sala pendente no URL, tenta entrar nela agora que o perfil foi selecionado
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const movieId = params.get('movie');
    
    if (roomId && movieId) {
      const movie = myMovies.find(m => m.id.toString() === movieId.toString());
      if (movie) {
        handlePlayMovie(movie);
      }
    }
  };

  useEffect(() => {
    // Auto-join watch party if profile is already loaded and we have movies
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const movieId = params.get('movie');

    if (roomId && movieId && profile && myMovies.length > 0) {
      const isAlreadyInWatch = location.pathname.includes('/watch');
      if (!isAlreadyInWatch) {
        const movie = myMovies.find(m => m.id.toString() === movieId.toString());
        if (movie) {
           // We push to watch with the search params so the player wrapper can get them
           navigate(`/watch/${movie.id}?room=${roomId}`, { 
             state: { movie, backgroundLocation: location.state?.backgroundLocation },
             replace: true 
           });
        }
      }
    }
  }, [profile, myMovies, location.pathname, navigate]);

  const handleSwitchProfile = () => {
    setProfile(null);
    localStorage.removeItem('active_profile');
  };

  const sendTestNotification = async () => {
    await notificationService.sendNotification(
      '🔔 Teste de Notificação',
      'Sua conta NetPremium está configurada corretamente!',
      'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png'
    );
  };

  // Use um ref para a localização atual para evitar re-renderizações desnecessárias em handlers que usam a localização apenas para o estado de 'background'
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const updateProgress = useCallback(async (movieId: string | number, time: number, episodeUrl?: string) => {
    if (!profile) return;
    
    // Salva no estado local para reatividades rápida
    setWatchHistory(prev => ({ ...prev, [Number(movieId)]: time }));
    
    // Salva localmente para acesso instantâneo entre sessões (fallback)
    localStorage.setItem(`netplay_progress_${movieId}`, time.toString());
    if (episodeUrl) {
      localStorage.setItem(`netplay_progress_url_${movieId}`, episodeUrl);
    }
    
    // Salva no Supabase para sincronização
    try {
      await supabase.from('watch_history').upsert({
        profile_id: profile.id,
        movie_id: Number(movieId),
        last_position: time,
        updated_at: new Date().toISOString()
      }, { onConflict: 'profile_id,movie_id' });
    } catch (err) {
      console.error('Erro ao atualizar progresso no Supabase:', err);
    }
  }, [profile]);

  const handleSelectMovie = useCallback((movie: Movie) => {
    navigate(`/movie/${movie.id}`, { state: { backgroundLocation: location.pathname } });
  }, [navigate, location.pathname]);

  const handlePlayMovie = useCallback((movie: Movie, episodeUrl?: string, startTime?: number, playerStyle?: string) => {
    // Travamos a orientação e navegamos de forma síncrona
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen().catch(() => {});
      }
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
      if (typeof window !== 'undefined') {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('median') || ua.includes('gonative')) {
          if ((window as any).median) {
            (window as any).median.screen.setOrientation({orientation: 'landscape'});
          } else if ((window as any).gonative) {
            (window as any).gonative.screen.setOrientation({orientation: 'landscape'});
          } else {
            window.location.href = `median://screen/setOrientation?orientation=landscape`;
          }
        }
      }
    } catch(e) {}
    
    // Navegação síncrona permite que o autoplay passe no browser sem block
    const search = window.location.search;
    navigate(`/watch/${movie.id}${search}`, { state: { movie, episodeUrl, startTime, playerStyle, backgroundLocation: location.state?.backgroundLocation } });
  }, [navigate, location.state]);

  const closeMovieDetails = () => {
    navigate(state?.backgroundLocation?.pathname || '/menu');
  };

  const closePlayer = () => {
    // Set to portrait upon exit
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
        if ((screen.orientation as any).lock) {
          (screen.orientation as any).lock('portrait').catch(() => {});
        }
      }
      
      if (typeof window !== 'undefined') {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('median') || ua.includes('gonative')) {
          if ((window as any).median) {
            (window as any).median.screen.setOrientation({orientation: 'portrait'});
          } else if ((window as any).gonative) {
            (window as any).gonative.screen.setOrientation({orientation: 'portrait'});
          } else {
            window.location.href = `median://screen/setOrientation?orientation=portrait`;
          }
        }
      }
    } catch (e) {}

    navigate(state?.backgroundLocation?.pathname || '/menu');
    // Pequeno delay para garantir que a navegação e o unmount do player salvaram o progresso
    setTimeout(() => {
      fetchContinueWatching();
    }, 300);
  };

  // Efeito para forçar modo paisagem ao abrir o player
  useEffect(() => {
    const isPlaying = location.pathname.includes('/watch') || selectedMovie != null;
    if (isPlaying) {
      const lockOrientation = async () => {
        try {
          if (screen.orientation && (screen.orientation as any).lock) {
            await (screen.orientation as any).lock('landscape').catch(() => {});
          }
        } catch (e) {}
        
        try {
          if (typeof window !== 'undefined') {
            const ua = navigator.userAgent.toLowerCase();
            if (ua.includes('median') || ua.includes('gonative')) {
              if ((window as any).median) {
                (window as any).median.screen.setOrientation({orientation: 'landscape'});
              } else if ((window as any).gonative) {
                (window as any).gonative.screen.setOrientation({orientation: 'landscape'});
              } else {
                window.location.href = `median://screen/setOrientation?orientation=landscape`;
              }
            }
          }
        } catch (e) {}
      };
      lockOrientation();
      
      // Segunda tentativa após um delay
      const timer = setTimeout(lockOrientation, 1000);
      return () => clearTimeout(timer);
    } else {
      // Unlock ao fechar
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
        try {
          if ((screen.orientation as any).lock) {
             (screen.orientation as any).lock('portrait').catch(() => {});
          }
        } catch (e) {}
      }
      
      try {
        if (typeof window !== 'undefined') {
          const ua = navigator.userAgent.toLowerCase();
          if (ua.includes('median') || ua.includes('gonative')) {
            if ((window as any).median) {
              (window as any).median.screen.setOrientation({orientation: 'portrait'});
            } else if ((window as any).gonative) {
              (window as any).gonative.screen.setOrientation({orientation: 'portrait'});
            } else {
              window.location.href = `median://screen/setOrientation?orientation=portrait`;
            }
          }
        }
      } catch (e) {}
    }
  }, [location.pathname, selectedMovie]);

  const handlePlayNextEpisode = (currentMovie: Movie) => {
    if (currentMovie.type !== 'series' || !currentMovie.episodes) return;

    // Encontrar o episódio atual baseado na URL
    const currentEpIndex = currentMovie.episodes.findIndex(ep => ep.videoUrl === currentMovie.videoUrl);
    
    if (currentEpIndex !== -1 && currentEpIndex < currentMovie.episodes.length - 1) {
      const nextEp = currentMovie.episodes[currentEpIndex + 1];
      handlePlayMovie(currentMovie, nextEp.videoUrl);
    }
  };

  const handleClosePlayer = () => {
    setSelectedMovie(null);
    fetchContinueWatching(); // Atualiza a lista ao fechar o player
  };

  const showBack = !!(selectedMovie || watchPartyMovie || viewingMovie || selectedProvider || isSettingsOpen || isModalOpen || isAdminModalOpen || location.pathname !== '/menu');

  const handleBack = useCallback(() => {
    if (selectedMovie) {
      handleClosePlayer();
      return;
    }
    if (watchPartyMovie) {
      setWatchPartyMovie(null);
      return;
    }
    if (viewingMovie) {
      setViewingMovie(null);
      return;
    }
    if (selectedProvider) {
      setSelectedProvider(null);
      return;
    }
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }
    if (isModalOpen) {
      setIsModalOpen(false);
      return;
    }
    if (isAdminModalOpen) {
      setIsAdminModalOpen(false);
      return;
    }
    if (location.pathname !== '/menu') {
      navigate(-1);
      return;
    }
  }, [selectedMovie, watchPartyMovie, viewingMovie, selectedProvider, isSettingsOpen, isModalOpen, isAdminModalOpen, location.pathname, navigate]);

  useEffect(() => {
    (window as any).appBack = handleBack;
    // Suporte para botão voltar físico do Android (Median.co / GoNative)
    (window as any).onGoNativeBack = () => {
      if (showBack) {
        handleBack();
        return true; // Bloqueia o fechamento do app
      }
      return false; // Permite o comportamento padrão
    };
  }, [handleBack, showBack]);

  const handlePlayCustomUrl = (url: string) => {
    const customMovie: Movie = {
      id: Date.now(),
      title: "Vídeo Customizado",
      backdrop_path: "",
      poster_path: "",
      overview: "Reproduzindo vídeo de link externo.",
      vote_average: 0,
      videoUrl: url
    };
    setSelectedMovie(customMovie);
    setIsModalOpen(false);
  };

  const getSimilarMovies = useCallback((movie: Movie) => {
    if (!movie.genres) {
      return visibleMovies.filter(m => m.id?.toString() !== movie.id?.toString()).slice(0, 12);
    }

    const currentGenres = movie.genres.split(',').map(g => g.trim());
    
    // Calcular pontuação de similaridade baseada em gêneros comuns
    const scoredMovies = visibleMovies
      .filter(m => m.id?.toString() !== movie.id?.toString())
      .map(m => {
        let score = 0;
        if (m.genres) {
          const mGenres = m.genres.split(',').map(g => g.trim());
          score = currentGenres.filter(g => mGenres.includes(g)).length;
        }
        return { movie: m, score };
      })
      .sort((a, b) => b.score - a.score);

    return scoredMovies.map(s => s.movie).slice(0, 12);
  }, [visibleMovies]);

  const currentSimilarMovies = useMemo(() => {
    if (!viewingMovie) return [];
    return getSimilarMovies(viewingMovie);
  }, [viewingMovie, getSimilarMovies]);

  const providerMovies = useMemo(() => {
    if (!selectedProvider) return [];
    return visibleMovies.filter(m => {
      // 1. Check explicit watch_providers field if available (contains Name|LogoURL)
      if (m.watch_providers) {
        const providersString = m.watch_providers.toLowerCase();
        // The format is "Name|URL;;Name2|URL2"
        if (providersString.includes(selectedProvider.toLowerCase())) return true;
      }

      // 2. Fallback to keyword matching in title/overview (Legacy or specific original content)
      const t = (m.title || m.name || '').toLowerCase();
      const o = (m.overview || '').toLowerCase();
      
      const keywords: Record<string, string[]> = {
        'Disney+': ['disney+', 'pixar', 'marvel studios', 'star wars'],
        'Netflix': ['netflix original'],
        'Max': ['hbo original', 'max original', 'warner bros'],
        'Prime Video': ['amazon original', 'prime video'],
        'Apple TV+': ['apple original']
      };

      const providerKeywords = keywords[selectedProvider] || [];
      return providerKeywords.some(k => t.includes(k) || o.includes(k));
    }).sort((a, b) => {
      const dateA = String(a.release_date || a.created_at || '');
      const dateB = String(b.release_date || b.created_at || '');
      return dateB.localeCompare(dateA);
    });
  }, [selectedProvider, visibleMovies]);

  useEffect(() => {
    const handleOpenPlans = () => setIsPlansScreenOpen(true);
    document.addEventListener('open-plans', handleOpenPlans);
    return () => document.removeEventListener('open-plans', handleOpenPlans);
  }, []);

  useEffect(() => {
    if (appSettings && !isAdmin) {
      if (appSettings.subscription_status === 'active' && appSettings.subscription_expires_at) {
        const expires = new Date(appSettings.subscription_expires_at);
        if (expires < new Date()) {
          // Expirado!
          updateAppSettings({ subscription_status: 'expired' });
          setIsPlansScreenOpen(true);
        }
      } else {
        // Não tem assinatura ativa
        setIsPlansScreenOpen(true);
      }
    }
  }, [appSettings, isAdmin]);

  const handleUpdatePlan = async (plan: 'hub' | 'plus' | 'max') => {
    const prices = { hub: 15.90, plus: 25.90, max: 35.90 };
    const titles = { hub: 'Netprime Hub', plus: 'Netprime Plus', max: 'Netprime Max' };
    
    try {
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titles[plan],
          price: prices[plan],
          planId: plan,
          userId: user?.id,
          email: user?.email
        })
      });

      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        console.error('Mercado Pago Error:', data);
        alert(`Erro Mercado Pago: ${data.error || 'Desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao chamar Mercado Pago:', error);
      alert('Houve um erro ao processar o pagamento. Tente novamente mais tarde.');
    }
  };

  useEffect(() => {
    const checkPaymentSuccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const planId = params.get('plan');
      
      if (paymentStatus === 'success' && planId) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await updateAppSettings({ 
          subscription_plan: planId as any,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString()
        });
        setIsPlansScreenOpen(false);
        // Limpar URL após aprovação para não ficar acionando
        window.history.replaceState({}, document.title, window.location.pathname);
        alert(`Obrigado! Seu pagamento foi processado e seu plano foi atualizado para ${planId.toUpperCase()}.`);
      } else if (paymentStatus === 'failure') {
        alert('Houve um problema com seu pagamento no Mercado Pago. Tente novamente.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    checkPaymentSuccess();
  }, [user]); // run when user is authenticated, independently of profile

  if (loading || showIntro) {
    return (
      <IntroVignette 
        isLoading={loading} 
        onComplete={() => setShowIntro(false)} 
        movies={myMovies}
      />
    );
  }

  if (!hasSupabase) {
    return (
      <div className="bg-[#141414] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#181818] p-8 rounded-2xl border border-white/10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="text-red-600 animate-spin-slow" size={40} />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Configuração Necessária</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Para que o aplicativo funcione, você precisa configurar as chaves do <strong>Supabase</strong> no menu de configurações do AI Studio.
          </p>
          <div className="space-y-4 text-left bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-xs mb-8">
            <p className="text-red-500 font-bold">Variáveis faltantes:</p>
            {!import.meta.env.VITE_SUPABASE_URL && <p className="text-gray-500">• VITE_SUPABASE_URL</p>}
            {!import.meta.env.VITE_SUPABASE_ANON_KEY && <p className="text-gray-500">• VITE_SUPABASE_ANON_KEY</p>}
          </div>
          <p className="text-xs text-gray-500 italic">
            Dica: Você também pode me pedir para configurar o <strong>Firebase</strong>, que é o banco de dados padrão do AI Studio.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAppInfo) {
      return <AppInfo onContinue={(mode) => {
        if (mode) setInitialLoginMode(mode);
        setShowAppInfo(false);
      }} movies={myMovies} />;
    }
    return <Login initialMode={initialLoginMode} movies={myMovies} />;
  }

  if (isPlansScreenOpen) {
    return (
      <ThemeContext.Provider value={{ 
        theme: currentTheme, 
        setTheme: setCurrentTheme,
        providerData
      }}>
        <div className={`bg-[#111] min-h-screen w-full font-sans selection:bg-red-600 selection:text-white ${currentTheme !== 'default' ? 'theme-active theme-' + currentTheme.toLowerCase().replace(/[^a-z]/g, '') : ''}`}>
          <PlansScreen 
            appSettings={effectiveAppSettings} 
            onClose={() => setIsPlansScreenOpen(false)} 
            onUpdatePlan={handleUpdatePlan} 
            userEmail={user?.email}
            onLogout={handleLogout}
          />
        </div>
      </ThemeContext.Provider>
    );
  }

  if (!profile && activeTab !== 'admin') {
    return <ProfileSelection onSelect={handleSelectProfile} appSettings={effectiveAppSettings} />;
  }

  if (activeTab === 'admin') {
    if (!isAdmin) return <Navigate to="/menu" replace />;
    return (
      <AdminPanel 
        movies={myMovies}
        streamingProviders={streamingProviders}
        onClose={() => navigate('/perfil')}
        onUpdateMovie={handleUpdateMovie}
        onAddMovie={handleCreateMovie}
        onDeleteMovies={handleDeleteMovies}
        onToggleHideMovies={handleToggleHideMovies}
        onStartScanner={startScanner}
        onStartReScanner={processReScan}
        onAddStreamingProvider={handleAddStreamingProvider}
        onUpdateStreamingProvider={handleUpdateStreamingProvider}
        onDeleteStreamingProvider={handleDeleteStreamingProvider}
        onSeedProviders={seedDefaultProviders}
        onStartCollectionAutomation={startCollectionAutomation}
        onUpdateCollectionInfo={handleUpdateCollectionLogos}
        onSyncMissingLogos={handleSyncMissingMovieLogos}
        collectionAutomationState={collectionAutomationState}
        scannerState={scannerState}
        reScannerState={reScannerState}
        categories={categories}
        onRefreshCategoryImages={refreshCategoryImages}
        onUpdateCategoryImage={updateCategoryImage}
      />
    );
  }

  return (
    <ThemeContext.Provider value={{ 
      theme: currentTheme, 
      setTheme: setCurrentTheme,
      providerData
    }}>
      <div className={`bg-[#111] min-h-screen w-full font-sans selection:bg-red-600 selection:text-white overflow-x-hidden pb-16 md:pb-0 relative transition-colors duration-1000 ${currentTheme !== 'default' ? 'theme-active theme-' + currentTheme.toLowerCase().replace(/[^a-z]/g, '') : ''}`}>
      
      {!hasTmdbKey && (
        <div className="bg-red-600 text-white text-center py-2 text-xs font-bold fixed top-0 w-full z-[200]">
          ERRO: VITE_TMDB_API_KEY não configurada nos Secrets.
        </div>
      )}

      {!hasSupabase && (
        <div className="bg-yellow-600 text-white text-center py-1 text-[10px] font-bold fixed top-8 w-full z-[200]">
          AVISO: Supabase não configurado.
        </div>
      )}
      
      <Navbar 
        onOpenCustomUrl={() => setIsModalOpen(true)} 
        onRefresh={fetchMyMovies}
        onSwitchProfile={handleSwitchProfile}
        activeProfile={profile}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'search' && searchQuery) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
          } else {
            navigate(`/${tab === 'home' ? 'menu' : tab === 'profile' ? 'perfil' : tab}`);
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q && q.trim().length > 0 && location.pathname !== '/search') {
            navigate(`/search?q=${encodeURIComponent(q)}`, { replace: true });
          }
        }}
        onStartReScan={startReScanner}
        scannerState={scannerState}
        reScannerState={reScannerState}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showBack={location.pathname !== '/menu'}
        onBack={() => navigate(-1)}
        isAdminModalOpen={isAdminModalOpen}
        setIsAdminModalOpen={setIsAdminModalOpen}
      />
      
      <main className="relative pb-20 min-h-screen overscroll-none">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>}>
          <Routes location={state?.backgroundLocation || location}>
            <Route path="/" element={<Navigate to={`/menu${location.search}`} replace />} />
          
          <Route path="/redefinirsenha" element={<Login initialMode="updatePassword" />} />
          <Route path="/confirmacao" element={<Login initialMode="login" />} />
          <Route path="/invite/:inviteId" element={
            <InviteRedirect />
          } />
          <Route path="/menu" element={
            <HomeView 
              myMovies={myMovies} 
              streamingProviders={streamingProviders}
              continueWatching={continueWatching}
              cinemaMovies={cinemaMovies}
              newMovies={newMovies}
              top10Movies={top10Movies}
              top10Series={top10Series}
              caraNovaMovies={caraNovaMovies}
              moviesByGenre={moviesByGenre}
              handleSelectMovie={handleSelectMovie}
              handlePlayMovie={handlePlayMovie}
              toggleMyList={toggleMyList}
              toggleFavorite={toggleFavorite}
              myListIds={myListIds}
              favoriteIds={favoriteIds}
              setViewAllGenre={(genre: string) => navigate(`/genre/${genre}`)}
              setIsModalOpen={setIsModalOpen}
              profile={profile}
              searchQuery={searchQuery}
              searchResults={searchResults}
              categories={categories}
              franchises={dynamicFranchises}
            />
          } />
          
          <Route path="/genre/:genreName" element={
             <GenreViewWrapper 
               myMovies={myMovies} 
               moviesByGenre={moviesByGenre} 
               handleSelectMovie={handleSelectMovie} 
               navigate={navigate} 
               toggleMyList={toggleMyList}
               myList={myList}
             />
          } />
          
          <Route path="/search" element={<AdvancedSearch onSelectMovie={handleSelectMovie} myMovies={myMovies} moviesByGenre={moviesByGenre} dynamicFranchises={dynamicFranchises} onSelectFranchise={setActiveFranchise} categories={categories} />} />
          <Route path="/universe" element={
            <UniverseTabView
              franchises={dynamicFranchises}
              handleSelectMovie={handleSelectMovie}
              toggleMyList={toggleMyList}
              toggleFavorite={toggleFavorite}
              myListIds={myListIds}
              favoriteIds={favoriteIds}
            />
          } />
          <Route path="/universe/:franchiseId" element={
            <UniverseTabView
              franchises={dynamicFranchises}
              handleSelectMovie={handleSelectMovie}
              toggleMyList={toggleMyList}
              toggleFavorite={toggleFavorite}
              myListIds={myListIds}
              favoriteIds={favoriteIds}
            />
          } />
          <Route path="/mylist" element={<MyListView myList={myList} handleSelectMovie={handleSelectMovie} navigate={navigate} />} />
          <Route path="/trending" element={
            <TrendingView 
              top10Movies={top10Movies}
              top10Series={top10Series}
              handleSelectMovie={handleSelectMovie}
              toggleMyList={toggleMyList}
              toggleFavorite={toggleFavorite}
              myListIds={myListIds}
              favoriteIds={favoriteIds}
              continueWatching={continueWatching}
              myMovies={myMovies}
              franchises={dynamicFranchises}
            />
          } />
          <Route path="/provider/:providerId" element={
            <ProviderViewWrapper 
              handleSelectMovie={handleSelectMovie}
              toggleMyList={toggleMyList}
              toggleFavorite={toggleFavorite}
              myListIds={myListIds}
              favoriteIds={favoriteIds}
              myMovies={myMovies}
            />
          } />
          <Route path="/perfil" element={
             <ProfileDashboard 
               profile={profile}
               favorites={favorites}
               myList={myList}
               myMovies={myMovies}
               handleSwitchProfile={handleSwitchProfile}
               setIsAdminModalOpen={setIsAdminModalOpen}
               handleLogout={handleLogout}
               handleLogoutAll={handleLogoutAll}
               navigate={navigate}
               sendTestNotification={sendTestNotification}
               continueWatching={continueWatching}
               appSettings={effectiveAppSettings}
               driveFiles={driveFiles}
               fetchDriveFiles={fetchDriveFiles}
               isFetchingDrive={isFetchingDrive}
               addDriveFileToLibrary={addDriveFileToLibrary}
               setIsSettingsOpen={setIsSettingsOpen}
               isAdmin={isAdmin}
               updateAppSettings={updateAppSettings}
             />
          } />
          </Routes>
        </Suspense>

        {/* Modal Routes */}
        <AnimatePresence mode="wait">
          {/* @ts-expect-error - React-Router Types might not include key, but React allows it */}
          <Routes location={location} key={location.pathname}>
            <Route path="/movie/:movieId" element={
              <MovieDetailRouteWrapper 
                myMovies={myMovies}
                watchHistory={watchHistory}
                handlePlayMovie={handlePlayMovie}
                closeMovieDetails={closeMovieDetails}
                toggleMyList={toggleMyList}
                toggleFavorite={toggleFavorite}
                myListIds={myListIds}
                favoriteIds={favoriteIds}
                streamingProviders={streamingProviders}
                onRequestMovie={handleRequestMovie}
                onWatchParty={(m: Movie) => setWatchPartyMovie(m)}
                top10Movies={top10Movies}
                top10Series={top10Series}
                appSettings={effectiveAppSettings}
              />
            } />
            <Route path="/watch/:movieId" element={
              <PlayerRouteWrapper 
                myMovies={myMovies}
                profile={profile}
                closePlayer={closePlayer}
                handleSelectMovie={handleSelectMovie}
                handlePlayMovie={handlePlayMovie}
                onProgress={updateProgress}
                activeRoomId={activeRoomId}
                isAppHost={isHost}
                appSettings={effectiveAppSettings}
              />
            } />
          </Routes>
        </AnimatePresence>
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          settings={appSettings}
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={setAppSettings}
        />
      )}

      {watchPartyMovie && profile && (
        <WatchPartyModal
          movie={watchPartyMovie}
          profile={profile}
          onClose={() => setWatchPartyMovie(null)}
          onRoomCreated={(roomId) => {
            setActiveRoomId(roomId);
            setIsHost(true);
            navigate(`/watch/${watchPartyMovie.id}`, { state: { movie: watchPartyMovie, backgroundLocation: location.state?.backgroundLocation } });
            setWatchPartyMovie(null);
          }}
        />
      )}

      {isModalOpen && (
        <CustomUrlModal 
          onClose={() => setIsModalOpen(false)} 
          onPlay={handlePlayCustomUrl} 
          onSave={fetchMyMovies}
          onStartScanner={startScanner}
          scannerState={scannerState}
        />
      )}

        {/* Indicadores de Scanner em Segundo Plano */}
      <div className="fixed bottom-16 right-4 md:bottom-8 md:right-8 z-[150] flex flex-col gap-4 items-end pointer-events-none">
        <AnimatePresence>
        </AnimatePresence>

        {scannerState && (
          <div 
            className="bg-[#181818] border border-red-600/50 p-4 rounded-2xl shadow-2xl cursor-default hover:border-red-600 transition-all group animate-in fade-in slide-in-from-bottom-4 min-w-[280px]"
          >
            <div className="flex items-center gap-4">
              <div className="relative" onClick={() => setIsModalOpen(true)}>
                <div className="w-12 h-12 border-2 border-gray-800 rounded-full flex items-center justify-center cursor-pointer">
                  {scannerState.isScanning && !scannerState.isPaused ? (
                    <Loader2 className="text-red-600 animate-spin" size={20} />
                  ) : (
                    <Pause className="text-yellow-500" size={20} />
                  )}
                </div>
                <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-red-600"
                    strokeDasharray={138}
                    strokeDashoffset={138 - (138 * (scannerState.total > 0 ? scannerState.current / scannerState.total : 0))}
                  />
                </svg>
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                    {scannerState.isScanning ? (scannerState.isPaused ? 'Scanner Pausado' : 'Scanner Drive') : 'Scanner Concluído'}
                  </span>
                  <div className="flex items-center gap-2">
                    {scannerState.isScanning && (
                      <>
                        {scannerState.isPaused ? (
                          <button onClick={resumeScanner} className="text-green-500 hover:text-green-400 transition-colors">
                            <Play size={14} />
                          </button>
                        ) : (
                          <button onClick={pauseScanner} className="text-yellow-500 hover:text-yellow-400 transition-colors">
                            <Pause size={14} />
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={stopScanner} className="text-gray-500 hover:text-white transition-colors">
                      <Square size={12} />
                    </button>
                  </div>
                </div>
                <span className="text-xs text-white font-bold truncate max-w-[180px]">{scannerState.status}</span>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex gap-2">
                    <span className="text-[9px] text-green-500">+{scannerState.added}</span>
                    <span className="text-[9px] text-yellow-500">s{scannerState.skipped}</span>
                    <span className="text-[9px] text-gray-500">{scannerState.current}/{scannerState.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {reScannerState && (
          <div 
            className="bg-[#181818] border border-blue-600/50 p-4 rounded-2xl shadow-2xl cursor-default hover:border-blue-600 transition-all group animate-in fade-in slide-in-from-bottom-4 min-w-[280px]"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-gray-800 rounded-full flex items-center justify-center">
                  {reScannerState.isScanning && !reScannerState.isPaused ? (
                    <Sparkles className="text-blue-500 animate-pulse" size={20} />
                  ) : (
                    <Pause className="text-yellow-500" size={20} />
                  )}
                </div>
                <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-500"
                    strokeDasharray={138}
                    strokeDashoffset={138 - (138 * (reScannerState.total > 0 ? reScannerState.current / reScannerState.total : 0))}
                  />
                </svg>
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                    {reScannerState.isScanning ? (reScannerState.isPaused ? 'Re-scan Pausado' : 'Corrigindo Info') : 'Re-scan Concluído'}
                  </span>
                  <div className="flex items-center gap-2">
                    {reScannerState.isScanning && (
                      <>
                        {reScannerState.isPaused ? (
                          <button onClick={resumeReScanner} className="text-green-500 hover:text-green-400 transition-colors">
                            <Play size={14} />
                          </button>
                        ) : (
                          <button onClick={pauseReScanner} className="text-yellow-500 hover:text-yellow-400 transition-colors">
                            <Pause size={14} />
                          </button>
                        )}
                      </>
                    )}
                    <button onClick={stopReScanner} className="text-gray-500 hover:text-white transition-colors">
                      <Square size={12} />
                    </button>
                  </div>
                </div>
                <span className="text-xs text-white font-bold truncate max-w-[180px]">{reScannerState.status}</span>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex gap-2">
                    <span className="text-[9px] text-blue-400">u{reScannerState.updated}</span>
                    <span className="text-[9px] text-yellow-500">s{reScannerState.skipped}</span>
                    <span className="text-[9px] text-gray-500">{reScannerState.current}/{reScannerState.total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="text-gray-500 text-center py-10 border-t border-gray-800 text-sm mt-10">
        <p>&copy; 2026 Netflix Clone. Desenvolvido para fins educacionais.</p>
        <p className="mt-2">Dados fornecidos por TMDb API.</p>
      </footer>
    </div>
  </ThemeContext.Provider>
  );
}
