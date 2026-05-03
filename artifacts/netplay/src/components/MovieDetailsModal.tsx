import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Plus, ThumbsUp, Volume2, VolumeX, Users, Sparkles, Calendar, Star, Clock, Info, ChevronDown, Monitor, Smartphone, Cast, Share2, Tv, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Movie } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import tmdb, { requests, getMovieLogo } from '../services/tmdb';
import VideoPlayer from './VideoPlayer';

interface MovieDetailsModalProps {
  movie: Movie;
  similarMovies: Movie[];
  onClose: () => void;
  onPlay: (movie: Movie, episodeUrl?: string, startTime?: number, playerStyle?: string) => void;
  onSelectSimilar: (movie: Movie) => void;
  onWatchParty: (movie: Movie) => void;
  onToggleMyList: (movie: Movie) => void;
  onToggleFavorite: (movie: Movie) => void;
  isAddedToMyList: boolean;
  isFavorite: boolean;
  streamingProviders?: any[];
  onRequestMovie?: (movie: Movie) => void;
  rank?: number;
  appSettings?: any;
}

const getProvider = (movie: Movie, streamingProviders?: any[]) => {
  const providers = [
    { name: 'Netflix', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', bg: 'bg-black' },
    { name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', bg: 'bg-[#00143c]' },
    { name: 'Max', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', bg: 'bg-[#002be7]' },
    { name: 'Prime Video', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', bg: 'bg-[#00a8e1]' },
    { name: 'Apple TV+', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', bg: 'bg-black' },
    { name: 'Paramount+', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', bg: 'bg-blue-900' },
    { name: 'Globoplay', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Globoplay_logo.svg', bg: 'bg-white' },
    { name: 'Hulu', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg', bg: 'bg-[#1ce783]' }
  ];

  const t = (movie.title || movie.name || '').toLowerCase();
  const wp = (movie.watch_providers || '').toLowerCase();

  // Check dynamic providers first
  if (streamingProviders && streamingProviders.length > 0) {
    const found = streamingProviders.find(p => 
      wp.includes(p.name.toLowerCase()) || 
      t.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(t)
    );
    if (found) {
      return {
        name: found.name,
        logo: found.logo_url,
        bg: 'bg-black/40'
      };
    }
  }

  // Netflix
  if (wp.includes('netflix') || t.includes('netflix') || t.includes('nflx') || t.includes('stranger things') || t.includes('witcher') || t.includes('squid game') || t.includes('cobra kai') || t.includes('bridgerton') || t.includes('crown')) {
    return providers[0];
  }
  
  // Disney+ / Star+
  if (wp.includes('disney') || wp.includes('star+') || wp.includes('star plus') || t.includes('disney') || t.includes('star+') || t.includes('star plus') || t.includes('zootopia') || t.includes('marvel') || t.includes('avengers') || t.includes('star wars') || t.includes('pixar') || t.includes('mickey') || t.includes('frozen')) {
    return providers[1];
  }
  
  // Max / HBO
  if (wp.includes('max') || wp.includes('hbo') || t.includes('max') || t.includes('hbo') || t.includes('warner') || t.includes('discovery') || t.includes('batman') || t.includes('superman') || t.includes('game of thrones') || t.includes('house of the dragon') || t.includes('harry potter') || t.includes('dune') || t.includes('joker')) {
    return providers[2];
  }
  
  // Prime Video
  if (wp.includes('prime') || wp.includes('amazon') || t.includes('prime') || t.includes('amazon') || t.includes('boys') || t.includes('invincible') || t.includes('rings of power') || t.includes('fallout') || t.includes('reacher')) {
    return providers[3];
  }

  // Apple TV+
  if (wp.includes('apple') || t.includes('apple') || t.includes('ted lasso') || t.includes('severance') || t.includes('morning show')) {
    return providers[4];
  }

  // Paramount+
  if (wp.includes('paramount') || t.includes('paramount') || t.includes('halo') || t.includes('yellowstone')) {
    return providers[5];
  }

  // Globoplay
  if (wp.includes('globo') || t.includes('globo')) {
    return providers[6];
  }
  
  if (movie.watch_providers) {
    const providerList = movie.watch_providers.split(',').map(p => p.trim());
    return { name: providerList[0], logo: '', bg: 'bg-gray-800' };
  }
  
  return { name: 'Streaming', logo: '', bg: 'bg-gray-900' };
};

const getAgeRating = (id: number) => {
  const ratings = ['L', '10', '12', '14', '16', '18'];
  return ratings[id % ratings.length];
};

const getRatingColor = (rating: string) => {
  switch(rating) {
    case 'L': return 'bg-green-500';
    case '10': return 'bg-blue-500';
    case '12': return 'bg-yellow-500';
    case '14': return 'bg-orange-500';
    case '16': return 'bg-red-500';
    case '18': return 'bg-black border border-red-500';
    default: return 'bg-gray-500';
  }
};

const getVideoSourceType = (url?: string) => {
  if (!url) return 'Assistir';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('drive.google.com')) return 'Drive';
  if (lowerUrl.includes('terabox') || lowerUrl.includes('teradl') || lowerUrl.includes('kingx')) return 'Terabox';
  if (lowerUrl.includes('gdplayer')) return 'GDPlayer';
  return 'Play';
};

const MovieDetailsModal = React.memo(({ 
  movie, 
  similarMovies, 
  onClose, 
  onPlay, 
  onSelectSimilar, 
  onWatchParty,
  onToggleMyList,
  onToggleFavorite,
  isAddedToMyList,
  isFavorite,
  streamingProviders,
  onRequestMovie,
  rank,
  appSettings
}: MovieDetailsModalProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlayingFullscreen, setIsPlayingFullscreen] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'details' | 'episodes' | 'similar'>(movie.type === 'series' ? 'episodes' : 'details');
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [showTvShare, setShowTvShare] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [realWatchProviders, setRealWatchProviders] = useState<any[]>([]);
  const [currentProvider, setCurrentProvider] = useState<any>(getProvider(movie, streamingProviders));
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<'480p' | '720p' | '1080p'>('720p');
  const [logoUrl, setLogoUrl] = useState<string | null>(movie.logo_path || null);
  const [selectedEpisodeDetails, setSelectedEpisodeDetails] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isPlayingFullscreen) {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    }
  }, [isPlayingFullscreen]);

  useEffect(() => {
    if (movie.id && !logoUrl) {
      async function fetchLogo() {
        const logo = await getMovieLogo(movie.id, (movie as any).name ? 'tv' : 'movie');
        if (logo) setLogoUrl(logo);
      }
      fetchLogo();
    }
  }, [movie.id]);

  useEffect(() => {
    const fetchWatchProviders = async () => {
      try {
        const isTv = movie.type === 'series' || !!movie.first_air_date;
        const url = isTv ? requests.tvWatchProviders(movie.id) : requests.movieWatchProviders(movie.id);
        const res = await tmdb.get(url);
        const brProviders = res.data.results?.BR?.flatrate || res.data.results?.BR?.buy || [];
        setRealWatchProviders(brProviders);

        // Update current provider based on real data
        if (brProviders.length > 0) {
          const knownProviders = [
            { name: 'Netflix', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', bg: 'bg-black' },
            { name: 'Disney+', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', bg: 'bg-[#00143c]' },
            { name: 'Max', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', bg: 'bg-[#002be7]' },
            { name: 'Prime Video', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', bg: 'bg-[#00a8e1]' },
            { name: 'Apple TV+', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', bg: 'bg-black' },
            { name: 'Paramount+', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', bg: 'bg-blue-900' },
            { name: 'Globoplay', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Globoplay_logo.svg', bg: 'bg-white' },
            { name: 'Hulu', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Hulu_Logo.svg', bg: 'bg-[#1ce783]' }
          ];
          
          const found = brProviders.find((p: any) => 
            knownProviders.some(kp => p.provider_name.toLowerCase().includes(kp.name.toLowerCase()) || kp.name.toLowerCase().includes(p.provider_name.toLowerCase()))
          );
          
          if (found) {
            const kpData = knownProviders.find(kp => found.provider_name.toLowerCase().includes(kp.name.toLowerCase()) || kp.name.toLowerCase().includes(found.provider_name.toLowerCase()));
            if (kpData) setCurrentProvider(kpData);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar watch providers:", error);
      }
    };
    fetchWatchProviders();
  }, [movie.id, movie.type, movie.first_air_date]);

  const savedUrl = useMemo(() => {
    return localStorage.getItem(`netplay_progress_url_${movie.id}`);
  }, [movie.id]);

  const savedEpisodeSeason = useMemo(() => {
    if (movie.type !== 'series' || !movie.episodes || !savedUrl) return null;
    const ep = movie.episodes.find(e => e.videoUrl === savedUrl || e.videoUrl2 === savedUrl);
    if (ep) {
       return ep.season;
    }
    return null;
  }, [movie, savedUrl]);

  // Organizar episódios por temporada
  const episodesBySeason = movie.episodes?.reduce((acc, ep) => {
    const s = ep.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(ep);
    return acc;
  }, {} as Record<number, typeof movie.episodes>) || {};

  const seasons = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);

  useEffect(() => {
    // Reset states when movie changes
    setShowVideo(false);
    setActiveInfoTab('details');
    setCurrentProvider(getProvider(movie));
    
    if (savedEpisodeSeason) {
      setSelectedSeason(savedEpisodeSeason);
    } else if (seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
    
    // Delay video start minimal to allow smooth modal opening
    const timer = setTimeout(() => {
      if (movie.videoUrl) {
        setShowVideo(true);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [movie, savedEpisodeSeason]);

  const backgroundUrl = movie.backdrop_path?.startsWith('http') 
    ? movie.backdrop_path 
    : `https://image.tmdb.org/t/p/original/${movie.backdrop_path}`;

  const provider = currentProvider;
  const [userResetProgress, setUserResetProgress] = useState(false);
  const savedProgress = useMemo(() => {
    if (userResetProgress) return 0;
    const progress = localStorage.getItem(`netplay_progress_${movie.id}`);
    if (progress) return parseFloat(progress);
    if (movie.last_position && movie.last_position > 5) return movie.last_position;
    return 0;
  }, [movie.id, movie.last_position, userResetProgress]);

  const savedEpisodeInfo = useMemo(() => {
    if (movie.type !== 'series' || !movie.episodes || !savedUrl) return null;
    const ep = movie.episodes.find(e => e.videoUrl === savedUrl || e.videoUrl2 === savedUrl);
    if (ep) {
       return `T${ep.season} E${ep.episode}`;
    }
    return null;
  }, [movie, savedUrl]);

  const formatProgressTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const ageRating = getAgeRating(movie.id);
  const matchPercentage = 80 + (movie.id % 20);
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : '2024';

  const isLocked = useMemo(() => {
    if (!movie.created_at) return false;
    if (appSettings?.subscription_plan === 'max') return false;
    
    // Check how many days ago it was created in the Database
    const createdDate = new Date(movie.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (appSettings?.subscription_plan === 'plus') {
        return diffDays <= 3;
    }
    // Default or Hub
    return diffDays <= 7;
  }, [movie.created_at, appSettings?.subscription_plan]);

  // Provider specific modal styles
  const modalThemes: Record<string, any> = {
    'Netflix': {
      bg: 'bg-[#141414]',
      accent: 'text-[#E50914]',
      button: 'bg-white text-black hover:bg-gray-200 rounded-md',
      secondaryButton: 'bg-[#6d6d6eb3] text-white hover:bg-[#6d6d6e66] rounded-md',
      font: 'font-sans'
    },
    'Disney+': {
      bg: 'bg-[#040714]',
      accent: 'text-[#0063e5]',
      button: 'bg-[#0063e5] text-white hover:bg-[#0485ee] rounded-full',
      secondaryButton: 'bg-black/40 text-white border border-white/20 hover:bg-white/10 rounded-full',
      font: 'font-sans'
    },
    'Max': {
      bg: 'bg-[#000814]',
      accent: 'text-[#002be7]',
      button: 'bg-white text-black hover:bg-gray-200 rounded-full',
      secondaryButton: 'bg-white/10 text-white border border-white/10 hover:bg-white/20 rounded-full',
      font: 'font-sans'
    },
    'Prime Video': {
      bg: 'bg-[#0f171e]',
      accent: 'text-[#00a8e1]',
      button: 'bg-[#00a8e1] text-white hover:bg-[#00c3ff] rounded-md',
      secondaryButton: 'bg-[#1a242f] text-white hover:bg-[#252e39] rounded-md',
      font: 'font-sans'
    },
    'Apple TV+': {
      bg: 'bg-[#000000]',
      accent: 'text-white',
      button: 'bg-white text-black hover:bg-gray-200 rounded-xl',
      secondaryButton: 'bg-white/10 text-white hover:bg-white/20 rounded-xl',
      font: 'font-sans'
    }
  };

  const theme = modalThemes[provider.name] || modalThemes['Netflix'];

  const isYouTube = movie.videoUrl?.includes('youtube.com') || movie.videoUrl?.includes('youtu.be');
  const isKingX = movie.videoUrl?.includes('player.kingx.dev');
  
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  const ytId = isYouTube ? getYouTubeId(movie.videoUrl!) : null;

  const extractDriveId = (url: string) => {
    const match = url.match(/(?:file\/d\/|id=)([-\w]{25,})/);
    if (match) return match[1];
    const fallbackMatch = url.match(/[-\w]{25,}/);
    return fallbackMatch ? fallbackMatch[0] : null;
  };

  const url = movie.videoUrl || '';
  const isDriveVideo = url.includes('drive.google.com');
  const driveId = isDriveVideo ? extractDriveId(url) : null;
  const driveApiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

  const getDriveUrl = () => {
    if (!driveId) return null;
    if (driveApiKey) {
      return `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media&key=${driveApiKey}`;
    }
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  };

  const finalVideoUrl = isDriveVideo ? getDriveUrl() : url;

  const parseWatchProviders = (providersString?: string) => {
    if (!providersString) return [];
    if (!providersString.includes('|')) {
      // Handle legacy comma-separated names
      return providersString.split(',').map(p => ({
        name: p.trim(),
        logo: ''
      })).filter(p => p.name);
    }

    const parsed = providersString.split(';;').map(p => {
      const [name, logo] = p.split('|');
      return { name, logo };
    });

    return parsed.reduce((acc: any[], current) => {
      if (!acc.find(item => item.name === current.name)) {
        acc.push(current);
      }
      return acc;
    }, []);
  };

  const providers = parseWatchProviders(movie.watch_providers);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex flex-col items-center bg-black overflow-y-auto no-scrollbar" 
      onClick={onClose}
    >
      <div 
        className={`${theme.bg} w-full min-h-screen relative ${theme.font}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-4 md:top-8 right-4 md:right-8 z-[190] bg-white/10 backdrop-blur-md text-white p-2 md:p-4 rounded-lg md:rounded-2xl hover:bg-red-600 transition-all hover:scale-110 active:scale-95 border border-white/10"
        >
          <X size={18} className="md:w-6 md:h-6" />
        </button>
        
        {/* Hero Section do Modal */}
        <div className="relative h-[40vh] md:h-[85vh] bg-black">
          <AnimatePresence>
            {showVideo && movie.videoUrl ? (
              <div 
                key="video"
                className="absolute inset-0 overflow-hidden animate-fade-in"
              >
                {isYouTube && ytId ? (
                  <iframe
                    className="w-full h-[150%] -mt-[10%] pointer-events-none scale-110"
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&showinfo=0&rel=0&loop=1&playlist=${ytId}&modestbranding=1&iv_load_policy=3`}
                    allow="autoplay; encrypted-media"
                    frameBorder="0"
                  />
                ) : isKingX ? (
                  <iframe
                    className="w-full h-full pointer-events-none scale-110"
                    src={movie.videoUrl}
                    allow="autoplay; encrypted-media"
                    frameBorder="0"
                  />
                ) : (
                  <div className={isPlayingFullscreen ? "fixed inset-0 z-[9999]" : "absolute inset-0"}>
                    <VideoPlayer
                      movie={{...movie, videoUrl: finalVideoUrl || movie.videoUrl}}
                      onClose={() => {
                        if (isPlayingFullscreen) {
                           setIsPlayingFullscreen(false);
                        } else {
                           onClose();
                        }
                      }}
                      onPlayNext={(m, epUrl) => onPlay(m, epUrl, 0)}
                      initialTime={savedProgress}
                      appSettings={appSettings}
                      isBackgroundMode={!isPlayingFullscreen}
                      onClickBackground={() => setIsPlayingFullscreen(true)}
                    />
                  </div>
                )}
                {/* Botão de Mudo (SÓ para youtube/kingx pois NetflixPlayer já tem mudo nativo e hide) */}
                {!isPlayingFullscreen && (isYouTube || isKingX) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                    className="absolute bottom-12 md:bottom-32 right-6 md:right-12 z-[190] bg-white/5 backdrop-blur-2xl text-white p-2 md:p-5 rounded-lg md:rounded-2xl hover:bg-white/10 transition-all border border-white/10 shadow-2xl pointer-events-auto"
                  >
                    {isMuted ? <VolumeX size={16} className="md:w-7 md:h-7" /> : <Volume2 size={16} className="md:w-7 md:h-7" />}
                  </button>
                )}
              </div>
            ) : (
              <div 
                key="poster"
                className="absolute inset-0 bg-cover bg-center animate-fade-in"
                style={{ backgroundImage: `url("${backgroundUrl}")` }}
              />
            )}
          </AnimatePresence>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-black/20 z-[5] pointer-events-none" />
          
          {/* Provider Logo removed as requested */}

          <div className="absolute bottom-0 left-0 p-6 md:p-16 w-full z-20 space-y-4 md:space-y-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="space-y-2 md:space-y-6"
            >
              {rank && (
                <div className="flex items-center gap-2 bg-red-600/30 backdrop-blur-md border border-red-600/50 px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-2xl w-fit shadow-2xl">
                   <div className="bg-red-600 text-white w-5 h-5 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-sm font-black italic shadow-lg">
                      #{rank}
                   </div>
                   <span className="text-white text-[8px] md:text-sm font-black uppercase tracking-widest italic drop-shadow-lg">TOP 10 HOJE</span>
                </div>
              )}
              <div className="flex items-center gap-3 md:gap-6">
                <span className="text-green-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs drop-shadow-[0_0_10px_rgba(34,197,94,0.5)] italic">{matchPercentage}% Match</span>
                <span className="text-gray-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[8px] md:text-xs italic">{year}</span>
                <span className={`text-white px-2 md:px-4 py-0.5 md:py-1.5 rounded-md md:rounded-xl font-black text-[8px] md:text-xs shadow-xl italic ${getRatingColor(ageRating)}`}>{ageRating}</span>
              </div>
              {logoUrl ? (
                <img 
                  src={logoUrl.startsWith('http') ? logoUrl : `https://image.tmdb.org/t/p/original/${logoUrl}`} 
                  alt={movie.title || movie.name} 
                  className="h-12 md:h-32 object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    setLogoUrl(null);
                  }}
                />
              ) : (
                <h2 
                  className="text-xl md:text-9xl font-black text-white uppercase tracking-tighter italic drop-shadow-[0_0_50px_rgba(0,0,0,0.8)] leading-[0.85]"
                >
                  {movie.title || movie.name}
                </h2>
              )}
            </motion.div>
            
            <div className="flex flex-wrap items-center gap-3 md:gap-8">
              {/* Botão Play Principal ou Resume/Restart */}
              {savedProgress > 5 && !isLocked ? (
                <div className="flex flex-wrap items-center gap-3 md:gap-8 w-full md:w-auto">
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,255,255,0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (isYouTube || isKingX) {
                        const defaultUrl = movie.type === 'series' && movie.episodes && movie.episodes.length > 0 ? movie.episodes[0].videoUrl : movie.videoUrl;
                        onPlay(movie, savedUrl || defaultUrl, savedProgress);
                      } else {
                        setIsPlayingFullscreen(true);
                      }
                    }}
                    className="bg-white text-black hover:bg-gray-200 flex-1 md:flex-none px-6 md:px-10 py-3 md:py-4 rounded-md font-bold uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <Play fill="currentColor" size={14} className="md:w-6 md:h-6" /> 
                    <span className="whitespace-nowrap relative z-10">Continuar {savedEpisodeInfo ? `(${savedEpisodeInfo})` : `(${formatProgressTime(savedProgress)})`}</span>
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      localStorage.removeItem(`netplay_progress_${movie.id}`);
                      setUserResetProgress(true);
                      if (isYouTube || isKingX) {
                        const urlToPlay = movie.type === 'series' && movie.episodes && movie.episodes.length > 0 ? movie.episodes[0].videoUrl : movie.videoUrl;
                        onPlay(movie, urlToPlay, 0);
                      } else {
                        setIsPlayingFullscreen(true);
                      }
                    }}
                    className="bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 px-6 md:px-8 py-3 md:py-4 rounded-md font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 text-xs md:text-sm shadow-xl backdrop-blur-md transition-all"
                  >
                    <RotateCcw size={14} className="md:w-5 md:h-5" />
                    <span className="whitespace-nowrap">Reiniciar</span>
                  </motion.button>
                </div>
              ) : (
                <>
                  {movie.videoUrl || movie.videoUrl2 || (movie.type === 'series' && movie.episodes && movie.episodes.length > 0) ? (
                    <div className="flex flex-wrap gap-3 md:gap-4">
                      <motion.button 
                        whileHover={{ scale: 1.05, boxShadow: isLocked ? '0 0 40px rgba(220,38,38,0.3)' : '0 0 40px rgba(255,255,255,0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (isLocked) {
                            document.dispatchEvent(new CustomEvent('open-plans'));
                            return;
                          }
                          if (isYouTube || isKingX) {
                            const urlToPlay = movie.type === 'series' && movie.episodes && movie.episodes.length > 0 ? movie.episodes[0].videoUrl : movie.videoUrl;
                            onPlay(movie, urlToPlay, 0, 'netflix');
                          } else {
                            setIsPlayingFullscreen(true);
                          }
                        }}
                        className={`${isLocked ? 'bg-zinc-800 text-gray-400 border border-zinc-600' : 'bg-white text-black hover:bg-gray-200'} px-6 md:px-10 py-3 md:py-4 rounded-md font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 text-xs md:text-sm shadow-xl transition-colors`}
                      >
                        {isLocked ? (
                          <>
                             <Lock size={14} className="md:w-6 md:h-6 text-yellow-500" />
                             <span className="whitespace-nowrap text-yellow-500">Upgrade (Plus/Max)</span>
                          </>
                        ) : (
                          <>
                            <Play fill="currentColor" size={14} className="md:w-6 md:h-6" /> 
                            <span className="whitespace-nowrap">{isKingX ? 'Play Netflix' : 'Assistir'}</span>
                          </>
                        )}
                      </motion.button>
                      
                      {isKingX && !isLocked && (
                        <motion.button 
                          whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(147,51,234,0.3)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const urlToPlay = movie.type === 'series' && movie.episodes && movie.episodes.length > 0 ? movie.episodes[0].videoUrl : movie.videoUrl;
                            onPlay(movie, urlToPlay, 0, 'special');
                          }}
                          className={`bg-purple-600 text-white hover:bg-purple-500 px-6 md:px-10 py-3 md:py-4 rounded-md font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 text-xs md:text-sm shadow-xl transition-all`}
                        >
                          <Play fill="currentColor" size={14} className="md:w-6 md:h-6" />
                          <span className="whitespace-nowrap">Play Terabox</span>
                        </motion.button>
                      )}
                    </div>
                  ) : (
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(220,38,38,0.3)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onRequestMovie?.(movie)}
                      className="bg-white/10 text-white border-2 border-white/20 px-6 md:px-10 py-3 md:py-4 rounded-md font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 text-xs md:text-sm shadow-xl transition-all hover:bg-white hover:text-black"
                    >
                      <Sparkles size={14} className="md:w-6 md:h-6" /> 
                      <span className="whitespace-nowrap">Indicar Filme</span>
                    </motion.button>
                  )}

                  {!isLocked && (movie.videoUrl2 || (movie.type === 'series' && movie.episodes && movie.episodes.some(e => e.videoUrl2))) && (
                    <motion.button 
                      whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,255,255,0.3)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const urlToPlay = movie.type === 'series' && movie.episodes && movie.episodes.length > 0 ? (movie.episodes[0].videoUrl2 || movie.episodes[0].videoUrl) : movie.videoUrl2;
                        onPlay(movie, urlToPlay, 0);
                      }}
                      className={`bg-white text-black hover:bg-gray-200 px-6 md:px-10 py-3 md:py-4 rounded-md font-bold uppercase tracking-widest flex items-center gap-2 md:gap-3 text-xs md:text-sm shadow-xl transition-all`}
                    >
                      <Play fill="currentColor" size={14} className="md:w-6 md:h-6" />
                      <span className="whitespace-nowrap">Opção 2</span>
                    </motion.button>
                  )}
                </>
              )}
              
              <div className="flex bg-black/20 rounded-full items-center gap-3 md:gap-4 p-1">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onToggleMyList(movie)}
                  className={`w-10 h-10 md:w-14 md:h-14 rounded-full border-2 transition-all flex items-center justify-center ${isAddedToMyList ? 'bg-white border-white text-black' : 'bg-transparent border-white text-white hover:bg-white inset-0 hover:text-black'}`}
                  title="Minha Lista"
                >
                  <Plus size={14} className={`md:w-6 md:h-6 transition-transform duration-700 ${isAddedToMyList ? 'rotate-45' : ''}`} />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onWatchParty(movie)}
                  className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-all flex items-center justify-center"
                  title="Assistir em Grupo"
                >
                  <Users size={14} className="md:w-6 md:h-6" />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const url = `${window.location.origin}/movie/${movie.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: movie.title || movie.name,
                        text: `Assista agora no aplicativo: ${movie.title || movie.name}\n\n`,
                        url: url
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(`${window.location.origin}/movie/${movie.id}`);
                      alert("Link copiado!");
                    }
                  }}
                  className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-all flex items-center justify-center"
                  title="Compartilhar"
                >
                  <Share2 size={14} className="md:w-6 md:h-6" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Informações Detalhadas */}
        <div className="p-6 md:p-12 space-y-8 md:space-y-12">
          {/* Essential Info Bar (Streaming & Genres) - Now more prominent and higher up */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-stretch md:items-center justify-between bg-white/5 p-6 md:p-10 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-sm">
            <div className="space-y-3 md:space-y-4 flex-1">
              <h3 className="text-gray-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs italic">Onde Assistir</h3>
              <div className="flex flex-wrap gap-3 md:gap-5">
                {providers.length > 0 ? (
                  providers.map((p: any, i: number) => (
                    <div key={i} className="group relative">
                      <div className="px-4 py-2 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl hover:bg-white/10 transition-all hover:scale-110 shadow-xl flex items-center gap-2">
                        {p.logo ? (
                          <img src={p.logo} alt={p.name} className="h-4 md:h-5 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-white font-black uppercase tracking-widest text-[8px] md:text-[10px] italic">{p.name}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : realWatchProviders.length > 0 ? (
                  realWatchProviders.map((p: any) => (
                    <div key={p.provider_id} className="group relative">
                      <div className="px-4 py-2 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl hover:bg-white/10 transition-all hover:scale-110 shadow-xl flex items-center gap-2">
                        <img 
                          src={`https://image.tmdb.org/t/p/original${p.logo_path}`} 
                          alt={p.provider_name} 
                          className="h-4 md:h-5 object-contain" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl flex items-center gap-3 md:gap-4">
                    <span className="text-white font-black uppercase tracking-widest text-[10px] md:text-xs italic">{provider.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-px h-12 bg-white/10 hidden md:block" />

            <div className="space-y-3 md:space-y-4 flex-1">
              <h3 className="text-gray-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs italic">Gêneros</h3>
              <div className="flex flex-wrap gap-2">
                {(movie.genres || "Conteúdo Digital").split(',').map(g => (
                  <span key={g} className="bg-white/10 px-3 md:px-4 py-1 md:py-1.5 rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-300 italic border border-white/5">{g.trim()}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-16">
            <div className="lg:col-span-2 space-y-6 md:space-y-10">
              <div className="flex flex-wrap gap-6 md:gap-10">
                <div className="flex items-center gap-2 md:gap-3 text-gray-400 font-black uppercase tracking-widest text-[10px] md:text-xs italic">
                  <Star className="text-yellow-500 fill-yellow-500 md:w-5 md:h-5" size={14} />
                  <span>{movie.vote_average?.toFixed(1) || '8.5'} Rating</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-gray-400 font-black uppercase tracking-widest text-[10px] md:text-xs italic">
                  <Clock size={14} className={`${theme.accent} md:w-5 md:h-5`} />
                  <span>{movie.runtime || '120'} min</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-gray-400 font-black uppercase tracking-widest text-[10px] md:text-xs italic">
                  <Calendar size={14} className={`${theme.accent} md:w-5 md:h-5`} />
                  <span>{year}</span>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                <p className="text-white text-sm md:text-2xl leading-relaxed font-medium italic text-gray-300">
                  {movie.overview || "Sem descrição disponível para este conteúdo."}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="flex gap-6 md:gap-10 mb-8 md:mb-12 border-b-2 border-white/10 overflow-x-auto no-scrollbar sticky top-0 bg-[#040714]/80 backdrop-blur-3xl z-50 py-2 px-6 md:px-12">
            {movie.type === 'series' && (
              <button 
                onClick={() => setActiveInfoTab('episodes')}
                className={`pb-4 md:pb-5 text-sm md:text-base font-bold uppercase tracking-[0.15em] transition-all relative whitespace-nowrap pt-4 ${activeInfoTab === 'episodes' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Episódios
                {activeInfoTab === 'episodes' && <motion.div layoutId="tab" className={`absolute bottom-[-2px] left-0 right-0 h-[3px] bg-white rounded-t-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />}
              </button>
            )}
            <button 
              onClick={() => setActiveInfoTab('similar')}
              className={`pb-4 md:pb-5 text-sm md:text-base font-bold uppercase tracking-[0.15em] transition-all relative whitespace-nowrap pt-4 ${activeInfoTab === 'similar' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Sugestões
              {activeInfoTab === 'similar' && <motion.div layoutId="tab" className={`absolute bottom-[-2px] left-0 right-0 h-[3px] bg-white rounded-t-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />}
            </button>
            <button 
              onClick={() => setActiveInfoTab('details')}
              className={`pb-4 md:pb-5 text-sm md:text-base font-bold uppercase tracking-[0.15em] transition-all relative whitespace-nowrap pt-4 ${activeInfoTab === 'details' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Detalhes
              {activeInfoTab === 'details' && <motion.div layoutId="tab" className={`absolute bottom-[-2px] left-0 right-0 h-[3px] bg-white rounded-t-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />}
            </button>
          </div>

        {/* Conteúdo das Tabs */}
        <AnimatePresence>
          {showTvShare && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-6"
              onClick={() => setShowTvShare(false)}
            >
              <motion.div 
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#141414] border border-white/10 rounded-[3rem] p-10 max-w-sm w-full text-center space-y-8 shadow-[0_0_100px_rgba(220,38,38,0.3)]"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex flex-col items-center">
                   <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mb-6">
                      <Tv className="text-red-600" size={32} />
                   </div>
                   <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter text-center">Conectar à Smart TV</h3>
                   <p className="text-gray-500 text-sm mt-2 leading-relaxed text-center">Como sua TV não tem câmera, siga estes passos simples para assistir:</p>
                </div>
                
                <div className="space-y-4 text-left">
                   <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-5">
                      <div className="flex gap-4 items-start">
                         <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-lg shadow-red-600/20">1</div>
                         <p className="text-white text-[11px] font-bold uppercase tracking-wider italic">Abra o Navegador de Internet (Browser) da sua Smart TV.</p>
                      </div>
                      <div className="flex gap-4 items-start">
                         <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 shadow-lg shadow-red-600/20">2</div>
                         <p className="text-white text-[11px] font-bold uppercase tracking-wider italic">Digite exatamente este endereço no topo:</p>
                      </div>
                      <div className="bg-black/60 p-5 rounded-2xl border-2 border-red-600/30 text-center group cursor-pointer active:scale-95 transition-all">
                         <span className="text-red-600 font-mono font-black text-xl md:text-2xl tracking-tighter block">{window.location.hostname}</span>
                      </div>
                      <p className="text-gray-600 text-[9px] text-center font-bold uppercase tracking-widest italic">Não precisa digitar "http://" ou "www"</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex flex-col items-center gap-2">
                     <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Ou se preferir usar o QR Code:</p>
                     <div className="bg-white p-4 rounded-2xl shadow-2xl">
                        <QRCodeSVG 
                          value={window.location.href} 
                          size={120}
                          level="H"
                        />
                     </div>
                   </div>
                   <button 
                     onClick={() => setShowTvShare(false)}
                     className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-xl"
                   >
                     Voltar
                   </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeInfoTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-24">
                  <div className="md:col-span-2 space-y-8">
                    <div className="space-y-6">
                      {movie.collection_name && (
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-6 p-6 bg-gradient-to-r from-red-600/20 to-transparent border border-red-600/30 rounded-[2.5rem] w-full cursor-pointer shadow-2xl backdrop-blur-md group"
                          onClick={() => {
                            // No App.tsx, precisaremos lidar com a navegação para a coleção
                            window.dispatchEvent(new CustomEvent('open-collection', { 
                              detail: { 
                                id: movie.collection_id, 
                                name: movie.collection_name,
                                poster: movie.collection_poster_path
                              } 
                            }));
                            // We don't call onClose() here because handleOpenCollection in App.tsx 
                            // will trigger a navigation, which naturally unmounts this Route-based modal.
                          }}
                        >
                          <div className="relative w-20 h-28 md:w-28 md:h-40 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:border-red-600 transition-all">
                            <img 
                              src={movie.collection_poster_path ? (movie.collection_poster_path.startsWith('http') ? movie.collection_poster_path : `https://image.tmdb.org/t/p/w500/${movie.collection_poster_path}`) : movie.poster_path} 
                              alt={movie.collection_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles size={16} className="text-red-500 animate-pulse" />
                              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-red-500 italic">Saga Completa</span>
                            </div>
                            <span className="text-white font-black uppercase text-lg md:text-3xl italic tracking-tighter leading-none mb-2">{movie.collection_name}</span>
                            <p className="text-gray-400 text-[10px] md:text-xs font-bold italic flex items-center gap-2">
                              Ver todos os títulos desta franquia <ChevronDown className="-rotate-90" size={12} />
                            </p>
                          </div>
                        </motion.div>
                      )}
                      <h3 className="text-white font-black uppercase tracking-[0.3em] text-sm md:text-lg italic border-l-4 border-red-600 pl-4">Sinopse</h3>
                      <p className="text-gray-300 text-lg md:text-3xl leading-relaxed italic font-medium">
                        {movie.overview || "Sem descrição disponível."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px] block mb-2">Avaliação</span>
                        <div className="flex items-center gap-3 text-white font-black italic text-xl">
                          <Star size={20} className="text-yellow-500 fill-yellow-500" />
                          <span>{movie.rating?.toFixed(1) || movie.vote_average?.toFixed(1) || '8.5'}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px] block mb-2">Duração</span>
                        <div className="flex items-center gap-3 text-white font-black italic text-xl">
                          <Clock size={20} className={theme.accent} />
                          <span>{movie.runtime || '120'} min</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px] block mb-2">Ano</span>
                        <div className="flex items-center gap-3 text-white font-black italic text-xl">
                          <Calendar size={20} className={theme.accent} />
                          <span>{movie.release_year || year}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                        <span className="text-gray-500 font-black uppercase tracking-widest text-[10px] block mb-2">Qualidade</span>
                        <div className="flex items-center gap-3 text-white font-black italic text-xl">
                          <Sparkles size={20} className="text-blue-400" />
                          <span>4K HDR</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {providers.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-white font-black uppercase tracking-[0.3em] text-sm italic">Onde Assistir</h3>
                        <div className="flex flex-wrap gap-4">
                          {providers.map((p: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-2 group">
                              <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl group-hover:border-red-600 transition-all group-hover:scale-110 h-12 md:h-16">
                                {p.logo ? (
                                  <img src={p.logo} alt={p.name} className="h-6 md:h-8 object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className="text-[10px] text-white font-black uppercase tracking-widest italic">{p.name}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <h3 className="text-white font-black uppercase tracking-[0.3em] text-sm italic">Gêneros</h3>
                      <div className="flex flex-wrap gap-3">
                        {(movie.genres || "Ação, Aventura").split(',').map(g => (
                          <span key={g} className="bg-white/10 px-5 py-2 rounded-xl text-xs font-black text-gray-300 italic uppercase tracking-widest border border-white/5">{g.trim()}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-white font-black uppercase tracking-[0.3em] text-sm italic">Elenco Principal</h3>
                      <div className="space-y-4">
                        {(movie.actors || 'Ator Principal, Atriz Coadjuvante, Diretor').split(',').slice(0, 5).map((actor, i) => (
                          <div key={i} className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 overflow-hidden group-hover:border-red-600 transition-colors">
                              <img src={`https://picsum.photos/seed/${(movie.id + i) * 2}/100/100`} alt={actor} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="text-white font-black text-sm uppercase tracking-widest italic truncate max-w-[150px]">{actor.trim()}</p>
                              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Artista</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeInfoTab === 'episodes' && movie.type === 'series' && (
              <motion.div 
                key="episodes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div className="relative group">
                    <select 
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-2xl font-black uppercase tracking-widest appearance-none pr-16 hover:bg-white/10 transition-all cursor-pointer outline-none focus:border-red-600 italic"
                    >
                      {seasons.map(s => (
                        <option key={s} value={s} className="bg-[#111]">Temporada {s}</option>
                      ))}
                    </select>
                    <Plus size={20} className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 rotate-45" />
                  </div>
                  <span className="text-gray-500 font-black uppercase tracking-widest text-xs">{episodesBySeason[selectedSeason]?.length || 0} Episódios</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
                  {episodesBySeason[selectedSeason]?.map((ep, idx) => (
                    <motion.div 
                      key={ep.id || idx}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      onClick={() => setSelectedEpisodeDetails(ep)}
                      className="flex flex-row items-center gap-4 p-3 md:p-6 rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/5 hover:border-red-600/30 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="text-xl md:text-4xl font-black text-gray-500 group-hover:text-red-600 min-w-[30px] md:min-w-[48px] text-center italic transition-colors z-10">
                        {ep.episode}
                      </div>
                      
                      <div className="relative w-32 md:w-64 aspect-video rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 bg-gray-900 shadow-xl group/ep z-10" onClick={(e) => { e.stopPropagation(); onPlay(movie, ep.videoUrl); }}>
                        <img 
                          src={ep.still_path || backgroundUrl} 
                          alt={ep.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition-opacity">
                          <Play size={32} className="text-white fill-white md:w-16 md:h-16" />
                        </div>
                        <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/80 px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[6px] md:text-[8px] font-black text-white italic">
                           {getVideoSourceType(ep.videoUrl)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pr-2 z-10 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-2">
                           <h4 className="text-white font-bold text-sm md:text-xl uppercase tracking-tighter italic group-hover:text-red-500 transition-colors truncate">
                             {ep.title || `Episódio ${ep.episode}`}
                           </h4>
                           {ep.runtime && ep.runtime > 0 && (
                             <span className="text-gray-400 text-[8px] md:text-xs font-bold uppercase tracking-widest shrink-0 mt-0.5">
                               {ep.runtime} min
                             </span>
                           )}
                        </div>
                        
                        <p className="text-gray-400 text-[10px] md:text-sm mt-1 md:mt-2 line-clamp-2 md:line-clamp-3 leading-snug font-medium italic">
                          {ep.overview || "Sem sinopse disponível para este episódio."}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {activeInfoTab === 'similar' && (
              <div 
                key="similar"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in"
              >
                {similarMovies.length > 0 ? (
                  similarMovies.map((similar, idx) => {
                    const simProvider = getProvider(similar);
                    const simAgeRating = getAgeRating(similar.id);
                    const simMatch = 80 + (similar.id % 20);
                    const simYear = 2010 + (similar.id % 15);

                    return (
                      <div 
                        key={similar.id}
                        className="bg-white/5 rounded-[2rem] overflow-hidden cursor-pointer group border border-white/5 hover:border-red-600/30 transition-all hover:-translate-y-2 shadow-2xl animate-fade-in"
                        style={{ animationDelay: `${idx * 0.05}s` }}
                        onClick={() => {
                          const modalContent = document.querySelector('.custom-scrollbar');
                          if (modalContent) modalContent.scrollTo({ top: 0, behavior: 'smooth' });
                          onSelectSimilar(similar);
                        }}
                      >
                        <div className="relative aspect-video">
                          <img 
                            src={similar.backdrop_path ? (similar.backdrop_path.startsWith('http') ? similar.backdrop_path : `https://image.tmdb.org/t/p/w500/${similar.backdrop_path}`) : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80'}
                            alt={similar.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={48} className="text-white fill-white" />
                          </div>
                          <div className="absolute top-4 right-4">
                            {simProvider.logo && (
                              <div className={`${simProvider.bg} p-2 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md`}>
                                <img src={simProvider.logo} alt={simProvider.name} className="h-4 object-contain" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-8 space-y-4">
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-green-500">{simMatch}% Match</span>
                            <span className={`px-2 py-0.5 rounded-md ${getRatingColor(simAgeRating)} text-white`}>{simAgeRating}</span>
                            <span className="text-gray-500">{simYear}</span>
                          </div>
                          <h4 className="text-white font-black text-xl uppercase tracking-tighter italic group-hover:text-red-500 transition-colors truncate">
                            {similar.title}
                          </h4>
                          <p className="text-gray-500 text-sm line-clamp-3 font-medium italic leading-relaxed">
                            {similar.overview}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <Sparkles size={48} className="text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 font-black uppercase tracking-widest italic">Nenhum título semelhante encontrado.</p>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Overlay de Detalhes do Episódio */}
      <AnimatePresence>
        {selectedEpisodeDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedEpisodeDetails(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedEpisodeDetails(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-600 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
              >
                <X size={24} />
              </button>
              
              <div className="relative aspect-video w-full group">
                <img 
                  src={selectedEpisodeDetails.still_path || backgroundUrl} 
                  alt={selectedEpisodeDetails.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
                <button 
                  onClick={() => onPlay(movie, selectedEpisodeDetails.videoUrl)}
                  className="absolute inset-0 flex items-center justify-center group-hover:bg-black/20 transition-all"
                >
                  <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                    <Play size={40} className="text-white fill-white ml-2" />
                  </div>
                </button>
              </div>
              
              <div className="p-8 space-y-4">
                <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  <span className="text-red-500">Temporada {selectedEpisodeDetails.season}</span>
                  <span>Episódio {selectedEpisodeDetails.episode}</span>
                  {selectedEpisodeDetails.runtime && <span>{selectedEpisodeDetails.runtime} min</span>}
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                  {selectedEpisodeDetails.title || `Episódio ${selectedEpisodeDetails.episode}`}
                </h3>
                  {selectedEpisodeDetails.rating && selectedEpisodeDetails.rating > 0 && (
                    <span className="inline-block bg-red-600/20 text-red-500 px-3 py-1 rounded-lg text-xs font-black italic border border-red-500/20 mb-2">
                       Aprovação: {(selectedEpisodeDetails.rating * 10).toFixed(0)}%
                    </span>
                  )}
                <p className="text-gray-400 text-lg leading-relaxed italic">
                  {selectedEpisodeDetails.overview || 'Nenhuma sinopse disponível para este episódio.'}
                </p>
                
                <div className="pt-4 flex gap-4">
                   <button
                     onClick={(e) => { e.stopPropagation(); onPlay(movie, selectedEpisodeDetails.videoUrl); }}
                     className="bg-white hover:bg-gray-200 text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest italic flex items-center gap-2 transition-all"
                   >
                      <Play size={16} fill="black" /> {getVideoSourceType(selectedEpisodeDetails.videoUrl)}
                   </button>
                   {selectedEpisodeDetails.videoUrl2 && (
                     <button
                       onClick={(e) => { e.stopPropagation(); onPlay(movie, selectedEpisodeDetails.videoUrl2); }}
                       className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest italic flex items-center gap-2 transition-all"
                     >
                        <Play size={16} fill="white" /> {getVideoSourceType(selectedEpisodeDetails.videoUrl2)}
                     </button>
                   )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
});

export default MovieDetailsModal;
