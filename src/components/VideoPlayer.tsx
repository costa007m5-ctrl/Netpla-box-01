import React, { useState, useEffect, useRef } from 'react';
import screenfull from 'screenfull';
import NetflixPlayer from './NetflixPlayer';
import { X, Maximize, ExternalLink, Users, Smile, Send, Play, WifiOff } from 'lucide-react';
import { Movie, RoomEvent, AppSettings } from '../types';
import { supabase } from '../lib/supabase';

interface VideoPlayerProps {
  movie: Movie;
  onClose: () => void;
  profileId?: string;
  profile?: any; // Added profile object
  roomId?: string;
  isHost?: boolean;
  onPlayNext?: (movie: Movie, episodeUrl: string) => void;
  recommendations?: Movie[];
  onProgress?: (movieId: string | number, time: number, episodeUrl?: string) => void;
  appSettings?: AppSettings;
  initialTime?: number;
  initialPlayerStyle?: 'netflix' | 'standard' | 'special' | string;
  isBackgroundMode?: boolean;
  onClickBackground?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ movie, onClose, profileId, profile, roomId, isHost, onPlayNext, recommendations = [], onProgress, appSettings, initialTime, initialPlayerStyle, isBackgroundMode, onClickBackground }) => {
  const [orientationKey, setOrientationKey] = useState(0);
  const [playerStyle, setPlayerStyle] = useState<'netflix' | 'standard' | 'special' | null>((initialPlayerStyle as any) || 'netflix');
  const [drivePlayMethod, setDrivePlayMethod] = useState<'api' | 'uc' | 'iframe'>('api');
  const getInitialExtracted = (type: 'video' | 'subtitle') => {
    let url = movie.videoUrl || '';
    const isKing = url.includes('player.kingx.dev') || url.includes('teradl.kingx.dev');
    // KingX (via Xapiverse/Terabox) now requires Captcha on direct M3U8 links. 
    // We MUST pass the player.kingx.dev wrapper down to NetflixPlayer to trigger isIframeMode.
    if (isKing && false) {
      try {
        let searchString = '';
        if (url.includes('#')) {
          searchString = url.split('#')[1];
        } else if (url.includes('?')) {
          searchString = url.split('?').slice(1).join('?');
        }
        
        if (searchString) {
           const normalizedSearch = searchString.replace(/%26/g, '&').replace(/&amp;/g, '&');
           if (type === 'video') {
              if (url.includes('player.kingx.dev/?url=')) {
                  const match = url.match(/[\?&]url=(.+)$/i);
                  if (match && match[1]) {
                     let v = match[1];
                     if (v.includes('&subtitle_url=')) {
                        v = v.split('&subtitle_url=')[0];
                     }
                     return decodeURIComponent(v);
                  }
              }
              const vMatch = normalizedSearch.match(/video_url=([^&]+(?:&[^&]+)*?)(?:&subtitle_url=|$)/i);
              if (vMatch && vMatch[1]) {
                 return decodeURIComponent(vMatch[1]);
              }
           } else if (type === 'subtitle') {
              const subMatch = normalizedSearch.match(/subtitle_url=([^&]+(?:&[^&]+)*?)(?:&video_url=|$)/i);
              if (subMatch && subMatch[1]) {
                 return decodeURIComponent(subMatch[1]);
              }
           }
        }
      } catch (e) {}
    }
    return null;
  };

  const [extractedVideoUrl, setExtractedVideoUrl] = useState<string | null>(getInitialExtracted('video'));
  const [extractedSubtitleUrl, setExtractedSubtitleUrl] = useState<string | null>(getInitialExtracted('subtitle'));
  const [isExtractingTerabox, setIsExtractingTerabox] = useState(false);
  
  const [emotes, setEmotes] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const lastSyncTime = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const driveApiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;

  const [movieLogo, setMovieLogo] = useState<string | null>(movie.logo_path || null);

  useEffect(() => {
    if (!movieLogo && movie.id) {
       // Tenta buscar o logo (como é para TMDB, verificamos primeiro tv, depois movie)
       import('../services/tmdb').then(({ getMovieLogo }) => {
         getMovieLogo(movie.id, (movie as any).name ? 'tv' : 'movie').then(logo => {
           if (logo) setMovieLogo(logo);
           else {
             getMovieLogo(movie.id, (movie as any).name ? 'movie' : 'tv').then(logo2 => {
               if (logo2) setMovieLogo(logo2);
             });
           }
         });
       });
    }
  }, [movie.id, movieLogo]);

  // Track progress on unmount
  useEffect(() => {
    return () => {
      const finalTime = currentTimeRef.current;
      const finalDuration = durationRef.current;
      if (profileId && movie.id && finalTime > 0 && appSettings?.subscription_plan !== 'hub') {
        const isMovie = movie.type !== 'series';
        const isFinished = finalDuration > 0 && (isMovie ? (finalDuration - finalTime <= 450) : (finalDuration - finalTime <= 30));
        
        if (isFinished && isMovie) {
           supabase.from('watch_history').delete().match({ profile_id: profileId, movie_id: movie.id }).then(() => {});
        } else if (isFinished && !isMovie) {
           const currentIndex = movie.episodes ? movie.episodes.findIndex(ep => ep.videoUrl === movie.videoUrl || ep.videoUrl2 === movie.videoUrl) : -1;
           const isLastEpisode = movie.episodes && currentIndex !== -1 && currentIndex === movie.episodes.length - 1;
           
           if (isLastEpisode) {
              supabase.from('watch_history').delete().match({ profile_id: profileId, movie_id: movie.id }).then(() => {});
           } else {
              const nextEp = movie.episodes && currentIndex !== -1 ? movie.episodes[currentIndex + 1] : null;
              if (nextEp) {
                 localStorage.setItem(`netplay_progress_url_${movie.id}`, nextEp.videoUrl || nextEp.videoUrl2 || '');
              }
              supabase.from('watch_history').upsert({
                profile_id: profileId,
                movie_id: movie.id,
                last_position: 0,
                updated_at: new Date().toISOString()
              }, { onConflict: 'profile_id,movie_id' }).then(() => {});
           }
        } else {
           supabase.from('watch_history').upsert({
             profile_id: profileId,
             movie_id: movie.id,
             last_position: finalTime,
             updated_at: new Date().toISOString()
           }, { onConflict: 'profile_id,movie_id' }).then(() => {});
        }
      }
    };
  }, [profileId, movie.id, movie.type, appSettings?.subscription_plan]);

  useEffect(() => {
    const currentUrl = movie.videoUrl || '';
    if (movie.id && currentUrl) {
      localStorage.setItem(`netplay_progress_url_${movie.id}`, currentUrl);
    }
  }, [movie.id, movie.videoUrl]);

  useEffect(() => {
    const saveToHistory = async () => {
      if (!profileId || !movie.id) return;
      if (appSettings?.subscription_plan === 'hub') return;
      
      try {
        const { error } = await supabase
          .from('watch_history')
          .upsert({
            profile_id: profileId,
            movie_id: movie.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'profile_id,movie_id' });

        if (error) throw error;
      } catch (error) {
        console.error('Erro ao salvar histórico:', error);
      }
    };

    saveToHistory();
  }, [profileId, movie.id]);

  useEffect(() => {
    if (!roomId) return;
    if (playerStyle === 'netflix') return; // NetflixPlayer handles its own sync

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: profileId || 'anonymous',
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setParticipants(Object.values(state).flat());
      })
      .on('broadcast', { event: 'room_event' }, ({ payload }: { payload: RoomEvent }) => {
        handleRoomEvent(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: profileId,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, profileId]);

  const handleRoomEvent = (event: RoomEvent) => {
    if (event.sender_id === profileId) return;

    switch (event.type) {
      case 'play':
        if (videoRef.current?.paused) videoRef.current?.play();
        break;
      case 'pause':
        if (!videoRef.current?.paused) videoRef.current?.pause();
        break;
      case 'seek':
        if (videoRef.current) {
          videoRef.current.currentTime = event.payload.time;
        }
        break;
      case 'emote':
        addEmote(event.payload.emoji);
        break;
    }
  };

  const broadcastEvent = (type: RoomEvent['type'], payload?: any) => {
    if (!roomId || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'room_event',
      payload: { type, payload, sender_id: profileId },
    }).catch(() => {});
  };

  const addEmote = (emoji: string) => {
    const id = Math.random().toString(36).substring(7);
    const x = 20 + Math.random() * 60; // 20% to 80%
    const y = 20 + Math.random() * 60;
    setEmotes(prev => [...prev, { id, emoji, x, y }]);
    setTimeout(() => {
      setEmotes(prev => prev.filter(e => e.id !== id));
    }, 3000);
  };

  const sendEmote = (emoji: string) => {
    addEmote(emoji);
    broadcastEvent('emote', { emoji });
    setShowEmotePicker(false);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !roomId) return;

    const onPlay = () => broadcastEvent('play');
    const onPause = () => broadcastEvent('pause');
    const onSeeked = () => broadcastEvent('seek', { time: video.currentTime });

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [roomId]);

  const extractDriveId = (url: string) => {
    const match = url.match(/(?:file\/d\/|id=)([-\w]{25,})/);
    if (match) return match[1];
    const fallbackMatch = url.match(/[-\w]{25,}/);
    return fallbackMatch ? fallbackMatch[0] : null;
  };

  const extractYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const url = movie.videoUrl || '';
  const isDriveVideo = url.includes('drive.google.com');
  const isGooglePhotos = url.includes('photos.google.com') || url.includes('photos.app.goo.gl');
  const isTeraBox = url.includes('terabox.com') || url.includes('teraboxapp.com') || url.includes('dubox.com') || url.includes('nephobox.com');
  const isKingX = url.includes('player.kingx.dev') || url.includes('teradl.kingx.dev');
  const isGDPlayer = url.includes('gdplayer.to') || url.includes('gdplayer.org');
  const driveId = isDriveVideo ? extractDriveId(url) : null;

  // Extração inicial foi migrada para estado síncrono.
  
  // Lógica de fallback para Google Drive
  useEffect(() => {
    if (isDriveVideo && !driveApiKey && drivePlayMethod === 'api') {
      setDrivePlayMethod('uc');
    }
  }, [isDriveVideo, driveApiKey, drivePlayMethod]);

  const getDriveUrl = () => {
    if (!driveId) return null;
    if (drivePlayMethod === 'api' && driveApiKey) {
      return `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media&key=${driveApiKey}`;
    }
    if (drivePlayMethod === 'uc') {
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
    return null;
  };

  const getInitialFinalVideoUrl = () => {
    const defaultUrl = movie.videoUrl || '';
    const isDrive = defaultUrl.includes('drive.google.com');
    const dId = isDrive ? extractDriveId(defaultUrl) : null;
    if (isDrive && dId) return `/api/stream/${dId}`;
    return defaultUrl;
  };

  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(getInitialFinalVideoUrl);

  useEffect(() => {
    setFinalVideoUrl(getInitialFinalVideoUrl());
  }, [movie.id, movie.videoUrl]);

  useEffect(() => {
    const runExtraction = async () => {
      const u = movie.videoUrl || '';
      const isTera = u.includes('terabox.com') || u.includes('teraboxapp.com') || u.includes('dubox.com') || u.includes('nephobox.com') || u.includes('1024terabox.com') || u.includes('freeterabox.com') || u.includes('4funbox.com') || u.includes('mirrobox.com') || u.includes('momerybox.com') || u.includes('teraboxlink.com') || u.includes('terafileshare.com');
      
      if (isTera) {
        setIsExtractingTerabox(true);
        try {
          const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(u)}`);
          if (res.ok) {
            const data = await res.json();
            
            let vid = data.list && data.list.length > 0 ? data.list[0] : data;
            
            if (vid) {
               const stUrl = vid.fast_stream_url?.['1080p'] || vid.fast_stream_url?.['720p'] || vid.fast_stream_url?.['480p'] || vid.fast_stream_url?.['360p'] || vid.normal_dlink || vid.url || vid.stream_url || vid.video_url || vid.src || (vid.data && vid.data.url) || vid.dlink;
               
               if (stUrl) {
                  setExtractedVideoUrl(stUrl);
                  setFinalVideoUrl(stUrl);
               }
               
               const subUrl = vid.subtitle_url || data.subtitle || data.subtitle_url;
               if (subUrl) {
                  setExtractedSubtitleUrl(subUrl);
               }
            }
          }
        } catch (e) {
          console.error("Failed to extract Terabox via API", e);
        } finally {
          setIsExtractingTerabox(false);
        }
      }
    };
    runExtraction();
  }, [movie.id, movie.videoUrl]);

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isHLS = url.includes('.m3u8') || (extractedVideoUrl?.includes('.m3u8') ?? false);
  const isMega = url.includes('mega.nz');
  const isDirectVideo = isHLS || url.match(/\.(mp4|webm|ogg|mkv|mov|avi)$/i) !== null || (isDriveVideo && drivePlayMethod !== 'iframe') || (isKingX && extractedVideoUrl !== null);
  const isMP4 = isHLS || url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mkv') || url.toLowerCase().includes('.avi') || (isDriveVideo && drivePlayMethod !== 'iframe') || (isKingX && extractedVideoUrl !== null);
  const isEmbeddable = isYouTube || isMega || isTeraBox || isKingX || isGDPlayer || (isDriveVideo && drivePlayMethod === 'iframe');

  const getEmbedUrl = () => {
    if (isDriveVideo && drivePlayMethod === 'iframe') {
      return driveId ? `https://drive.google.com/file/d/${driveId}/preview?autoplay=1` : null;
    }
    if (isYouTube) {
      const id = extractYouTubeId(url);
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&showinfo=0&modestbranding=1` : null;
    }
    if (isMega) {
      // Convert mega.nz/file/... to mega.nz/embed/...
      return url.replace('/file/', '/embed/').replace('/#!', '/embed/#!');
    }
    if (isTeraBox || isGDPlayer) {
      return url; // TeraBox and GDPlayer usually work as-is if already embed links
    }
    return url;
  };

  const embedUrl = getEmbedUrl();

  // Monitorar conexão
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detectar fonte e definir estilo automaticamente
  useEffect(() => {
    const url = movie.videoUrl || '';
    const isDrive = url.includes('drive.google.com');
    const isKingXUrl = url.includes('kingx.dev') || url.includes('teradl.kingx.dev');
    const isTera = url.includes('terabox') || url.includes('teradl') || url.includes('kingx');

    if (isDrive) {
      setDrivePlayMethod('iframe');
      setPlayerStyle('standard'); // Usar o fluxo padrão que renderiza o iframe no final
      requestLandscape();
    } else if (isKingXUrl) {
      setPlayerStyle('netflix');
      requestLandscape();
    } else if (isTera) {
      setPlayerStyle('netflix');
      requestLandscape();
    } else {
      // Outros links vão para o Netflix Player por padrão para melhor compatibilidade
      setPlayerStyle('netflix');
      requestLandscape();
    }
  }, [movie.videoUrl]);

  const requestLandscape = async () => {
    try {
      const container = containerRef.current;
      if (!container) return;

      // Try to enter fullscreen first as it's often required for orientation lock
      if (!document.fullscreenElement) {
        if (screenfull.isEnabled) {
          await screenfull.request(container).catch(() => {});
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen().catch(() => {});
        } else if (container.requestFullscreen) {
          await container.requestFullscreen().catch(() => {});
        }
      }

      // Lock orientation with multiple attempts and fallbacks
      const lock = async () => {
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock('landscape');
            return true;
          } catch (e) {
            try {
              await (screen.orientation as any).lock('landscape-primary');
              return true;
            } catch (e2) {
              return false;
            }
          }
        }
        return false;
      };

      // Try immediately
      await lock();

      // Small delay to ensure fullscreen transition is stable, then try again
      await new Promise(resolve => setTimeout(resolve, 500));
      await lock();
      
      // One more try after 1.5s for slow devices
      setTimeout(lock, 1500);

      // iOS specific: force landscape via webkitEnterFullscreen on the video element if available
      if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        try {
          (videoRef.current as any).webkitEnterFullscreen();
        } catch (e) {}
      }

      setOrientationKey(prev => prev + 1);
    } catch (error) {
      console.warn("Erro ao configurar modo paisagem:", error);
    }
  };

  useEffect(() => {
    if (playerStyle !== null) {
      // Immediate attempt
      requestLandscape();
      
      // Follow-up attempt after a short delay to catch any race conditions
      const timer = setTimeout(requestLandscape, 1000);
      return () => clearTimeout(timer);
    }
  }, [playerStyle]);

  const toggleFullscreen = async () => {
    try {
      const container = containerRef.current;
      if (!container) return;

      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
      setOrientationKey(prev => prev + 1);
    } catch (error) {
      console.error("Erro ao alternar tela cheia:", error);
    }
  };

  useEffect(() => {
    if (playerStyle === null && isKingX) {
      setPlayerStyle('netflix');
      // Tentar rotacionar imediatamente para KingX
      requestLandscape();
    }
  }, [isKingX, playerStyle]);

  if (isExtractingTerabox) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-red-600 rounded-full animate-spin mb-4"></div>
        <p className="text-white font-medium animate-pulse">Obtendo link otimizado...</p>
      </div>
    );
  }

  if (isMP4 && (finalVideoUrl || extractedVideoUrl) && playerStyle === 'netflix') {
    const currentIndex = movie.type === 'series' && movie.episodes 
      ? movie.episodes.findIndex(ep => ep.videoUrl === movie.videoUrl)
      : -1;
    const currentEpisode = currentIndex !== -1 && movie.episodes ? movie.episodes[currentIndex] : null;
    const episodeTitle = currentEpisode ? (currentEpisode.title || `Episódio ${currentEpisode.episode}`) : "";
    const displayTitle = movie.type === 'series' && episodeTitle 
       ? `${movie.title || movie.name} - ${episodeTitle}` 
       : (movie.title || movie.name || "");
    const hasNextEpisode = currentIndex !== -1 && movie.episodes && currentIndex < movie.episodes.length - 1;

    const videoUrlOptions = [];
    if (finalVideoUrl || extractedVideoUrl) {
      videoUrlOptions.push({ id: 'sd', label: 'Padrão (SD)', url: extractedVideoUrl || finalVideoUrl || "" });
    }
    if (movie.video_url_2) {
      videoUrlOptions.push({ id: 'hd', label: 'Alta Definição (HD)', url: movie.video_url_2 });
    }

    return (
      <div className="relative w-full h-full">
        <NetflixPlayer 
          src={extractedVideoUrl || finalVideoUrl || ""}
          // verificationUrl removed since KingX now plays natively via iframe mode
          subtitleUrl={extractedSubtitleUrl || undefined}
          title={displayTitle}
          seriesTitle={movie.type === 'series' ? (movie.title || movie.name || "") : undefined}
          episodes={movie.episodes}
          onSelectEpisode={(ep) => {
            if (onPlayNext) onPlayNext(movie, ep.videoUrl || ep.videoUrl2 || "");
          }}
          backdropUrl={movie.backdrop_path}
          logoUrl={movieLogo || undefined}
          onClose={onClose}
          initialTime={initialTime ?? movie.last_position ?? 0}
          isMovie={movie.type !== 'series'}
          hasNextEpisode={hasNextEpisode}
          recommendations={recommendations}
          onSelectRecommendation={(rec) => {
            const defaultRecUrl = rec.type === 'series' && rec.episodes && rec.episodes.length > 0 ? rec.episodes[0].videoUrl : rec.videoUrl;
            if (onPlayNext) onPlayNext(rec, defaultRecUrl || "");
          }}
          onNextEpisode={() => {
            if (hasNextEpisode && movie.episodes && onPlayNext) {
              onPlayNext(movie, movie.episodes[currentIndex + 1].videoUrl);
            }
          }}
          videoUrlOptions={videoUrlOptions}
          isHost={isHost}
          roomId={roomId}
          profile={profile}
          maxQualityHeight={appSettings?.subscription_plan === 'hub' ? 720 : 1080}
          onSwitchPlayer={() => {
            if (isDriveVideo) {
              setDrivePlayMethod('iframe');
              setPlayerStyle('standard');
            } else {
              setPlayerStyle('standard');
            }
          }}
          autoNextOffset={
            movie.type === 'series' && currentIndex !== -1 
              ? movie.episodes?.[currentIndex]?.credits_time 
              : undefined
          }
          onProgress={async (time, duration) => {
            currentTimeRef.current = time;
            if (duration !== undefined) durationRef.current = duration;
            if (onProgress) onProgress(movie.id, time, movie.videoUrl);
            
            if (profileId && movie.id && appSettings?.subscription_plan !== 'hub') {
              const finalDuration = duration !== undefined ? duration : durationRef.current;
              const isMovie = movie.type !== 'series';
              const seriesCreditsTime = currentIndex !== -1 && movie.episodes?.[currentIndex]?.credits_time !== undefined 
                  ? movie.episodes[currentIndex].credits_time 
                  : 30; // default 30 se não definido
              const isFinished = finalDuration > 0 && (isMovie ? (finalDuration - time <= 450) : (finalDuration - time <= seriesCreditsTime!));

              if (isFinished && isMovie) {
                  await supabase.from('watch_history').delete().match({ profile_id: profileId, movie_id: movie.id });
              } else if (isFinished && !isMovie) {
                  const currentIndex = movie.episodes ? movie.episodes.findIndex(ep => ep.videoUrl === movie.videoUrl || ep.videoUrl2 === movie.videoUrl) : -1;
                  const isLastEpisode = movie.episodes && currentIndex !== -1 && currentIndex === movie.episodes.length - 1;
                  
                  if (isLastEpisode) {
                     await supabase.from('watch_history').delete().match({ profile_id: profileId, movie_id: movie.id });
                  } else {
                     const nextEp = movie.episodes && currentIndex !== -1 ? movie.episodes[currentIndex + 1] : null;
                     if (nextEp) {
                        localStorage.setItem(`netplay_progress_url_${movie.id}`, nextEp.videoUrl || nextEp.videoUrl2 || '');
                     }
                     await supabase.from('watch_history').upsert({
                       profile_id: profileId,
                       movie_id: movie.id,
                       last_position: 0,
                       updated_at: new Date().toISOString()
                     }, { onConflict: 'profile_id,movie_id' });
                  }
              } else {
                  await supabase.from('watch_history').upsert({
                    profile_id: profileId,
                    movie_id: movie.id,
                    last_position: time,
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'profile_id,movie_id' });
              }
            }
          }}
          isBackgroundMode={isBackgroundMode}
          onClickBackground={onClickBackground}
        />
      </div>
    );
  }

  // Player Especial (Iframe do KingX)
  if (playerStyle === 'special' && isKingX) {
    if (isBackgroundMode) return null; // Background mode not fully supported for special player overlays yet
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        <div className="absolute top-6 left-6 z-[210] flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform"
          >
            <X size={24} />
          </button>
          <h2 className="text-white font-black italic uppercase tracking-tighter text-lg drop-shadow-lg">{movie.title || movie.name}</h2>
        </div>
        <div className="absolute top-6 right-6 z-[210]">
          <button 
            onClick={() => setPlayerStyle('netflix')}
            className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl"
          >
            Voltar para Netflix Player
          </button>
        </div>
        <iframe 
          src={url}
          className="w-full h-full border-none"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={isBackgroundMode ? "absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden select-none pointer-events-auto" : "fixed inset-0 z-[200] flex items-center justify-center bg-black overflow-hidden select-none"}
    >
      {/* Banner de Fundo (Papel de Parede) */}
      <div className="absolute inset-0 z-0">
        <img 
          src={movie.backdrop_path.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/original/${movie.backdrop_path}`}
          alt=""
          className="w-full h-full object-cover opacity-20 blur-xl"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      <div className="w-full h-full relative flex flex-col z-10">
        {/* Topo: Voltar e Título */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="text-white hover:scale-110 transition-transform p-2 bg-black/60 rounded-full backdrop-blur-md"
            >
              <X size={28} />
            </button>
            <h2 className="text-white font-bold text-lg md:text-xl drop-shadow-lg truncate max-w-[200px] md:max-w-md">
              {movie.title || movie.name}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {roomId && (
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                <Users size={14} className="text-red-500" />
                <span className="text-xs font-bold text-white">{participants.length}</span>
              </div>
            )}
            {(isDriveVideo || isGooglePhotos || isTeraBox) && (
              <a 
                href={movie.videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:scale-105 transition-transform px-3 py-2 md:px-4 md:py-2 bg-red-600/90 rounded-full backdrop-blur-md text-xs md:text-sm font-bold"
              >
                <ExternalLink size={16} />
                <span className="hidden md:inline">
                  {isGooglePhotos ? 'Abrir no Google Fotos' : isTeraBox ? 'Abrir no TeraBox' : 'Abrir no Navegador'}
                </span>
              </a>
            )}
            <button 
              onClick={toggleFullscreen}
              className="text-white hover:scale-110 transition-transform p-2 bg-black/60 rounded-full backdrop-blur-md"
            >
              <Maximize size={24} />
            </button>
            {isMP4 && playerStyle === 'standard' && (
              <button 
                onClick={() => setPlayerStyle('netflix')}
                className="text-white hover:scale-110 transition-transform px-3 py-1 bg-red-600 rounded-full text-[10px] font-bold"
              >
                Netflix Player
              </button>
            )}
          </div>
        </div>
        
        {/* Player Area */}
        <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center">
          {!isOnline && (
            <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center mb-8 border border-red-600/30">
                <WifiOff size={48} className="text-red-600" />
              </div>
              <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter italic font-display">Sem Internet</h3>
              <p className="text-gray-400 max-w-md mb-8 font-medium">
                Parece que você está offline. Verifique sua conexão para continuar assistindo.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
              >
                Tentar Novamente
              </button>
            </div>
          )}
          
          {isDirectVideo && (finalVideoUrl || extractedVideoUrl) ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={extractedVideoUrl || finalVideoUrl || ""}
                controls
                autoPlay
                className="w-full h-full outline-none"
                controlsList="nodownload"
                onError={() => {
                  if (isDriveVideo) {
                    console.warn(`Falha ao carregar vídeo do Drive usando proxy. Tentando iframe...`);
                    setDrivePlayMethod('iframe');
                  }
                }}
              >
                {extractedSubtitleUrl && (
                  <track 
                    kind="subtitles" 
                    src={extractedSubtitleUrl} 
                    srcLang="pt" 
                    label="Português" 
                    default 
                  />
                )}
              </video>
              
              {/* Watch Party Emotes Overlay */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
                {emotes.map(emote => (
                  <div
                    key={emote.id}
                    className="absolute text-4xl md:text-6xl animate-bounce transition-all duration-1000 opacity-0 animate-in fade-in slide-in-from-bottom-10"
                    style={{ left: `${emote.x}%`, top: `${emote.y}%` }}
                  >
                    {emote.emoji}
                  </div>
                ))}
              </div>

              {/* Watch Party Controls */}
              {roomId && (
                <div className="absolute bottom-24 right-8 flex flex-col gap-4 pointer-events-auto z-[60]">
                  <div className="relative">
                    {showEmotePicker && (
                      <div className="absolute bottom-full right-0 mb-4 bg-black/90 p-4 rounded-2xl border border-white/10 backdrop-blur-xl flex gap-3 animate-in slide-in-from-bottom-4">
                        {['❤️', '🔥', '😂', '😮', '😢', '👏'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => sendEmote(emoji)}
                            className="text-3xl hover:scale-125 transition-transform active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowEmotePicker(!showEmotePicker)}
                      className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-md border border-white/20 transition-all active:scale-90 shadow-2xl"
                    >
                      <Smile size={24} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : isEmbeddable && embedUrl ? (
            <>
              <iframe
                key={orientationKey}
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full border-none"
                allow="autoplay; encrypted-media; fullscreen; screen-orientation"
                allowFullScreen
                referrerPolicy="no-referrer"
              ></iframe>
            </>
          ) : isGooglePhotos || isTeraBox ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 border border-white/20">
                <ExternalLink size={40} className="text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                {isGooglePhotos ? 'Google Fotos Detectado' : 'TeraBox Detectado'}
              </h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {isGooglePhotos 
                  ? "Por motivos de segurança, o Google Fotos não permite que seus vídeos sejam reproduzidos dentro de outros sites."
                  : "O TeraBox requer que você esteja logado na plataforma deles para assistir aos vídeos compartilhados."}
                Clique no botão abaixo para assistir com segurança diretamente no {isGooglePhotos ? 'Google Fotos' : 'TeraBox'}.
              </p>
              <a 
                href={movie.videoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95"
              >
                <ExternalLink size={24} />
                Assistir no {isGooglePhotos ? 'Google Fotos' : 'TeraBox'}
              </a>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Vídeo não disponível</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
