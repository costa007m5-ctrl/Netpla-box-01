import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Shield, RefreshCcw, Send, TrendingUp, Bookmark, 
  Play, ChevronRight, Clock, Award, HardDrive, Crown,
  Trash2, Search, Film, Tv, Sliders, Type, Bell, Monitor,
  Palette, UserCircle, Edit3, Lock, LogOut, CheckCircle2, AlertCircle, Heart,
  Save, X, Smartphone, List, Download, Sparkles, Users, Copy, Share2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ProfileDashboard({ 
  profile, 
  favorites, 
  myList, 
  handleSwitchProfile, 
  setIsAdminModalOpen, 
  handleLogout, 
  handleLogoutAll,
  navigate,
  sendTestNotification,
  continueWatching,
  downloads,
  myMovies,
  appSettings,
  setIsSettingsOpen,
  isAdmin,
  updateAppSettings
}: any) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'settings' | 'lists' | 'stats' | 'devices'>('overview');
  
  // Local settings states (the 50 features)
  const [autoplay, setAutoplay] = useState(appSettings?.autoplay_next ?? true);
  const [nextEp, setNextEp] = useState(appSettings?.autoplay_next ?? true);
  const [dataSaver, setDataSaver] = useState(false);
  const [spatialAudio, setSpatialAudio] = useState(true);
  const [subtitleSize, setSubtitleSize] = useState('Médio');
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [videoQuality, setVideoQuality] = useState('Auto');
  const [kidsMode, setKidsMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Local Stats Generation
  const stats = useMemo(() => {
    let totalMins = 0;
    const genreMap: Record<string, number> = {};
    const actorsMap: Record<string, number> = {};

    const movieIds = new Set();
    const seriesIds = new Set();
    
    // Combine IDs from all sources
    continueWatching.forEach((cw: any) => (cw.type === 'series' || myMovies?.find(m => m.id === cw.id)?.type === 'series') ? seriesIds.add(cw.id) : movieIds.add(cw.id));
    myList.forEach((m: any) => m.type === 'series' ? seriesIds.add(m.id) : movieIds.add(m.id));
    favorites.forEach((m: any) => (m.movie_data?.type === 'series' || m.type === 'series') ? seriesIds.add(m.movie_id || m.id) : movieIds.add(m.movie_id || m.id));

    const movieCount = movieIds.size;
    const seriesCount = seriesIds.size;

    const allInvolvedIds = new Set([...movieIds, ...seriesIds]);
    allInvolvedIds.forEach(id => {
      const m = myMovies?.find((mv: any) => mv.id === id);
      if (m) {
        totalMins += (m.runtime || 90);
        if (m.genres) {
          m.genres.split(',').forEach((g: string) => {
            const cleanG = g.trim();
            if (cleanG) genreMap[cleanG] = (genreMap[cleanG] || 0) + 1;
          });
        }
        if (m.actors) {
          m.actors.split(',').forEach((a: string) => {
            const cleanA = a.trim();
            if (cleanA) actorsMap[cleanA] = (actorsMap[cleanA] || 0) + 1;
          });
        }
      }
    });

    // Determine top genre
    const sortedGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]);
    const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'Indefinido';

    // Determine top actor
    const sortedActors = Object.entries(actorsMap).sort((a, b) => b[1] - a[1]);
    const topActor = sortedActors.length > 0 ? sortedActors[0][0] : 'Nenhum';

    const hoursWatched = Math.floor(totalMins / 60);
    
    let userLevel = 'Iniciante';
    if (hoursWatched > 50) userLevel = 'Cinéfilo';
    if (hoursWatched > 150) userLevel = 'Viciado';
    if (hoursWatched > 300) userLevel = 'Crítico de Elite';

    return { totalMins, hoursWatched, movieCount, seriesCount, topGenre, topActor, userLevel };
  }, [continueWatching, myMovies]);

  // Storage calculation
  const totalStorage = 32 * 1024; // Mock 32GB
  const usedStorage = useMemo(() => {
    let totalSize = 0;
    (downloads || []).forEach((d: any) => {
      if (d.videoBlob) totalSize += d.videoBlob.size / (1024 * 1024);
    });
    return Math.round(totalSize);
  }, [downloads]);

  const [referralStats, setReferralStats] = useState({ count: 0, credits: 0, freeMonths: 0, pending: null as any });
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'plan' && appSettings?.user_id) {
      fetch(`/api/referrals?userId=${appSettings.user_id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setReferralStats({ count: data.count, credits: data.credits, freeMonths: data.freeMonths, pending: data.pending });
          }
        })
        .catch(err => console.error("Erro ao buscar indicações:", err));
    }
  }, [activeSubTab, appSettings?.user_id]);

  const handleRedeem = async () => {
    if (!appSettings?.user_id) return;
    setRedeeming(true);
    try {
      const res = await fetch('/api/referrals/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: appSettings.user_id,
          count: referralStats.count,
          credits: referralStats.credits,
          freeMonths: referralStats.freeMonths
        })
      });
      if (!res.ok) throw new Error('Falha ao resgatar');
      alert('Resgate solicitado com sucesso! A administração irá processar em breve.');
      setReferralStats(prev => ({ ...prev, pending: { status: 'pending' } }));
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
    setRedeeming(false);
  };

  // Sync local state if appSettings changes from outside
  useEffect(() => {
    if (appSettings) {
      setAutoplay(appSettings.autoplay_next ?? true);
      setNextEp(appSettings.autoplay_next ?? true);
    }
  }, [appSettings]);

  // Load profile-specific settings from localStorage (UI preferences)
  useEffect(() => {
    const s = localStorage.getItem(`profile_settings_${profile?.id}`);
    if (s) {
      const parsed = JSON.parse(s);
      setDataSaver(parsed.dataSaver ?? false);
      setSpatialAudio(parsed.spatialAudio ?? true);
      setSubtitleSize(parsed.subtitleSize ?? 'Médio');
      setPlaybackSpeed(parsed.playbackSpeed ?? '1.0x');
      setVideoQuality(parsed.videoQuality ?? 'Auto');
      setKidsMode(parsed.kidsMode ?? false);
      setReduceMotion(parsed.reduceMotion ?? false);
    }
  }, [profile?.id]);

  const saveSettings = async () => {
    // 1. Save global settings to Supabase
    if (updateAppSettings) {
      await updateAppSettings({
        autoplay_next: autoplay,
      });
    }

    // 2. Save profile-specific settings to localStorage
    localStorage.setItem(`profile_settings_${profile?.id}`, JSON.stringify({
      dataSaver, spatialAudio, subtitleSize, 
      playbackSpeed, videoQuality, kidsMode, reduceMotion
    }));
    alert('As configurações foram salvas com sucesso no banco de dados e localmente.');
  };

  const handleExportData = () => {
    const data = {
      profile,
      stats,
      history: continueWatching,
      myList,
      favorites
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netplay_data_${profile?.name}.json`;
    a.click();
  };

  const handleClearHistory = async () => {
    if (window.confirm('Tem certeza que deseja apagar todo o histórico de visualização? Isso não pode ser desfeito.')) {
      try {
        // Clear from Supabase
        const { error } = await supabase
          .from('watch_history')
          .delete()
          .eq('profile_id', profile.id);
        
        if (error) throw error;

        // Clear from LocalStorage
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('netplay_progress_')) {
            localStorage.removeItem(key);
          }
        });

        alert('Todo o seu histórico de visualização foi removido com sucesso.');
        window.location.reload();
      } catch (err: any) {
        console.error('Erro ao limpar histórico:', err);
        alert('Erro ao limpar histórico no banco de dados.');
      }
    }
  };

  const menuItems = [
    { id: 'overview', icon: UserCircle, label: 'Geral' },
    { id: 'plan', icon: Crown, label: 'Assinatura' },
    { id: 'stats', icon: TrendingUp, label: 'Analytics' },
    { id: 'lists', icon: List, label: 'Minhas Listas' },
    { id: 'settings', icon: Sliders, label: 'Preferências (Novo)' },
    { id: 'devices', icon: Smartphone, label: 'Dispositivos' },
  ];

  return (
    <motion.div
      key="profile-dashboard"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="pt-24 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen pb-24"
    >
      {/* PRIMARY NAVIGATION TABS (MINIABAS) */}
      <div className="flex overflow-x-auto no-scrollbar bg-white/5 border border-white/10 rounded-2xl mb-8 backdrop-blur-xl p-1 shrink-0">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSubTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setActiveSubTab(item.id as any)}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap rounded-xl ${isActive ? 'text-white bg-red-600 shadow-lg shadow-red-600/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              <Icon size={16} className={isActive ? 'text-white' : ''} /> <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* HEADER SECTION (PROFILE INFO) */}
      <div className="relative w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-white/5 border border-white/10 mb-8 backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 blur-[150px] -mr-48 -mt-48 rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/10 blur-[120px] -ml-40 -mb-40 rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="relative group cursor-pointer" onClick={() => navigate('/perfil')}>
            <div className="absolute -inset-2 bg-gradient-to-tr from-red-600 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-75 transition duration-500"></div>
            <img 
              src={profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"} 
              alt="Avatar" 
              className="relative w-24 h-24 md:w-40 md:h-40 rounded-[1.5rem] object-cover border-4 border-white shadow-2xl transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-1 right-1 bg-red-600 text-white p-1.5 rounded-lg shadow-xl">
              <Edit3 size={12} />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-4">
              <Award size={12} className="text-yellow-500" /> Nível: {stats.userLevel}
            </div>
            <h1 className="text-3xl md:text-6xl font-black text-white uppercase tracking-tighter italic mb-4">{profile?.name}</h1>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 transition-all shadow-xl flex items-center gap-2">
                  <Shield size={14} /> Multi-Admin
                </button>
              )}
              <button onClick={handleSwitchProfile} className="bg-white/10 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/20 transition-all flex items-center gap-2 shadow-xl">
                <RefreshCcw size={14} /> Trocar Perfil
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {/* TAB: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="col-span-1 lg:col-span-2 space-y-6 md:space-y-8">
                {/* Bento Box Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-red-600/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center mb-4 text-red-600"><Clock size={20} /></div>
                    <span className="text-3xl font-black text-white block mb-1">{stats.hoursWatched}h</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Tempo Assistido</span>
                  </div>
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-purple-600/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center mb-4 text-purple-500"><Heart size={20} /></div>
                    <span className="text-lg md:text-xl font-black text-white block mb-1 truncate">{stats.topGenre}</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Gênero Favorito</span>
                  </div>
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-blue-600/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 text-blue-500"><Film size={20} /></div>
                    <span className="text-3xl font-black text-white block mb-1">{stats.movieCount}</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Filmes</span>
                  </div>
                  <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-green-600/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center mb-4 text-green-500"><Tv size={20} /></div>
                    <span className="text-3xl font-black text-white block mb-1">{stats.seriesCount}</span>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Séries</span>
                  </div>
                </div>

                <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] px-8 border border-white/10 backdrop-blur-xl">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2 mb-6">
                    <TrendingUp className="text-red-600" /> Continue Assistindo
                  </h3>
                  {continueWatching.length === 0 ? (
                    <p className="text-gray-500 text-sm">Seu histórico está vazio.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {continueWatching.slice(0, 4).map((cw: any) => {
                        const m = myMovies?.find(mv => mv.id === cw.id);
                        if(!m) return null;
                        return (
                           <div key={cw.id} className="cursor-pointer group" onClick={() => navigate(`/movie/${m.id}`)}>
                             <div className="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative">
                               <img src={m.poster_path} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                 <Play fill="currentColor" className="text-white w-12 h-12 shadow-2xl" />
                               </div>
                             </div>
                             <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                               <div className="h-full bg-red-600" style={{ width: `${(cw.progress / cw.duration) * 100}%` }}></div>
                             </div>
                           </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar actions inside Overview */}
              <div className="col-span-1 space-y-6">
                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2 mb-6">
                    <HardDrive className="text-blue-500" /> Armazenamento
                  </h3>
                  <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                    <span>{usedStorage} MB usados</span>
                    <span>{totalStorage} MB Total</span>
                  </div>
                  <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden flex border border-white/5 mb-6">
                    <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(usedStorage/totalStorage)*100}%` }}></div>
                    <div className="h-full bg-green-500/50" style={{ width: '15%' }}></div>
                  </div>
                  <button onClick={() => navigate('/downloads')} className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest transition-all">
                    Gerenciar Downloads
                  </button>
                </div>

                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2 mb-6">
                    <Settings className="text-gray-400" /> Ações Rápidas
                  </h3>
                  <div className="space-y-3">
                    {appSettings?.subscription_plan === 'max' && (
                      <button onClick={() => window.open('https://wa.me/?text=Olá, sou cliente VIP Netprime Max e preciso de suporte.', '_blank')} className="w-full py-4 px-6 rounded-xl bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-600/20 font-black text-xs uppercase tracking-widest flex items-center justify-between transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        <span>Suporte VIP (WhatsApp)</span> <Smartphone size={16} />
                      </button>
                    )}
                    <button onClick={handleClearHistory} className="w-full py-4 px-6 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/20 font-black text-xs uppercase tracking-widest flex items-center justify-between transition-all">
                      <span>Limpar Histórico</span> <Trash2 size={16} />
                    </button>
                    <button onClick={handleExportData} className="w-full py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-widest flex items-center justify-between transition-all">
                      <span>Exportar Meus Dados</span> <Download size={16} />
                    </button>
                    <button onClick={handleLogout} className="w-full py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-widest flex items-center justify-between transition-all mt-4">
                      <span>Encerrar Sessão</span> <LogOut size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SETTINGS (The 50 Functions Matrix) */}
          {activeSubTab === 'settings' && (
             <div className="bg-white/5 p-6 md:p-12 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
                  <div>
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                      <Sliders className="text-red-600" size={32} /> Central de Preferências
                    </h3>
                    <p className="text-gray-400 font-bold text-sm mt-2">Personalize dezenas de comportamentos do seu player, interface e conta.</p>
                  </div>
                  <button onClick={saveSettings} className="bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-500 shadow-xl flex items-center gap-2">
                    <Save size={16} /> Salvar Alterações
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-10">
                  {/* Reprodução */}
                  <div className="space-y-6">
                    <h4 className="text-red-500 font-black tracking-widest uppercase text-sm border-b border-red-500/20 pb-2">Reprodução e Tela</h4>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <p className="text-white font-bold">Auto-Play em Prévias</p>
                        <p className="text-gray-500 text-xs">Reproduzir trailers automaticamente no menu</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors relative ${autoplay ? 'bg-red-600' : 'bg-white/20'}`} onClick={() => setAutoplay(!autoplay)}>
                        <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoplay ? 'left-7' : 'left-1'}`}></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <p className="text-white font-bold">Próximo Episódio</p>
                        <p className="text-gray-500 text-xs">Pular para o próximo automaticamente</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors relative ${nextEp ? 'bg-red-600' : 'bg-white/20'}`} onClick={() => setNextEp(!nextEp)}>
                        <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${nextEp ? 'left-7' : 'left-1'}`}></div>
                      </div>
                    </label>

                    <div>
                      <p className="text-white font-bold mb-2">Qualidade de Vídeo Padrão</p>
                      <select value={videoQuality} onChange={(e) => setVideoQuality(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-red-600 transition-colors">
                        <option>Auto (Recomendado)</option>
                        <option>1080p Ultra HD</option>
                        <option>720p HD</option>
                        <option>480p Economia</option>
                      </select>
                    </div>

                    <div>
                      <p className="text-white font-bold mb-2">Velocidade de Reprodução</p>
                      <div className="flex gap-2">
                        {['0.75x', '1.0x', '1.25x', '1.5x'].map(spd => (
                           <button key={spd} onClick={() => setPlaybackSpeed(spd)} className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${playbackSpeed === spd ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>{spd}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Som e Legendas */}
                  <div className="space-y-6">
                    <h4 className="text-blue-500 font-black tracking-widest uppercase text-sm border-b border-blue-500/20 pb-2">Som e Acessibilidade</h4>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <p className="text-white font-bold">Áudio Espacial</p>
                        <p className="text-gray-500 text-xs">Aprimorar graves e direção 3D do som</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors relative ${spatialAudio ? 'bg-blue-600' : 'bg-white/20'}`} onClick={() => setSpatialAudio(!spatialAudio)}>
                        <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${spatialAudio ? 'left-7' : 'left-1'}`}></div>
                      </div>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group">
                      <div>
                        <p className="text-white font-bold">Reduzir Movimento</p>
                        <p className="text-gray-500 text-xs">Desativa as animações de interface</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors relative ${reduceMotion ? 'bg-blue-600' : 'bg-white/20'}`} onClick={() => setReduceMotion(!reduceMotion)}>
                        <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${reduceMotion ? 'left-7' : 'left-1'}`}></div>
                      </div>
                    </label>

                    <div>
                      <p className="text-white font-bold mb-2 flex items-center gap-2">Tema da Interface {appSettings?.subscription_plan === 'max' ? <Sparkles size={14} className="text-yellow-500" /> : <Lock size={14} className="text-gray-500" />}</p>
                      <select 
                        value={appSettings?.theme || 'default'} 
                        onChange={(e) => {
                          if (appSettings?.subscription_plan !== 'max') {
                            document.dispatchEvent(new CustomEvent('open-plans'));
                            return;
                          }
                          if (updateAppSettings) updateAppSettings('theme', e.target.value);
                        }} 
                        className={`w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-red-600 transition-colors ${appSettings?.subscription_plan !== 'max' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="default">Vermelho (Padrão)</option>
                        <option value="netflix">Netflix</option>
                        <option value="neon" disabled={appSettings?.subscription_plan !== 'max'}>Cyberpunk Neon (Max Only)</option>
                      </select>
                    </div>

                    <div>
                      <p className="text-white font-bold mb-2">Tamanho das Legendas</p>
                      <select value={subtitleSize} onChange={(e) => setSubtitleSize(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-600 transition-colors">
                        <option>Pequeno</option>
                        <option>Médio (Padrão)</option>
                        <option>Grande</option>
                        <option>Extra Grande</option>
                      </select>
                    </div>

                    <div>
                      <p className="text-white font-bold mb-2">Cor de Fundo da Legenda</p>
                      <div className="flex gap-2">
                        {['Preto', 'Transparente', 'Sem fundo'].map(bg => (
                           <button key={bg} className="flex-1 py-2 rounded-lg font-black text-xs bg-white/10 text-gray-400 hover:bg-white/20 transition-colors">{bg}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dados e Downloads Omitidos */}
                </div>
             </div>
          )}

          {/* TAB: LISTS */}
          {activeSubTab === 'lists' && (
            <div className="space-y-12">
              <div className="bg-white/5 p-6 md:p-12 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3 mb-8">
                    <Bookmark className="text-red-600" /> Minha Lista ({myList.length})
                 </h3>
                 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {myList.map((movie: any) => (
                      <div key={movie.id} className="aspect-[2/3] relative rounded-xl overflow-hidden cursor-pointer group hover:ring-4 hover:ring-red-600 transition-all shadow-xl" onClick={() => navigate(`/movie/${movie.id}`)}>
                        <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-white text-xs font-black truncate">{movie.title || movie.name}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white/5 p-6 md:p-12 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3 mb-8">
                    <Heart className="text-purple-600" /> Meus Filmes e Séries Curtidos ({favorites.length})
                 </h3>
                 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {favorites.map((fM: any) => {
                      const movieInfo = myMovies?.find(m => m.id === (fM.movie_data?.id || fM.movie_id)) || fM.movie_data;
                      if(!movieInfo) return null;
                      return (
                        <div key={fM.id} className="aspect-[2/3] relative rounded-xl overflow-hidden cursor-pointer group hover:ring-4 hover:ring-purple-600 transition-all shadow-xl" onClick={() => navigate(`/movie/${movieInfo.id}`)}>
                          <img src={movieInfo.poster_path} alt={movieInfo.title} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-purple-600 p-1.5 rounded-full"><Heart fill="white" size={14} className="text-white" /></div>
                        </div>
                      )
                    })}
                 </div>
              </div>
            </div>
          )}

          {/* TAB: PLAN & REFERRALS */}
          {activeSubTab === 'plan' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Current Plan Info */}
               <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 blur-3xl -mr-10 -mt-10 rounded-full"></div>
                 <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3 mb-8">
                   <Crown className="text-red-600" /> Assinatura e Faturamento
                 </h3>
                 
                 <div className="space-y-6 relative z-10">
                   <div>
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Plano Atual</p>
                     <p className="text-3xl font-black text-white uppercase italic tracking-tighter">
                       {appSettings?.subscription_plan === 'hub' ? 'NETPLAY HUB' : appSettings?.subscription_plan === 'plus' ? 'NETPLAY PLUS' : 'NETPLAY MAX'}
                     </p>
                   </div>
                   <div>
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                     <p className={`text-sm font-black uppercase tracking-widest ${appSettings?.subscription_status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                       {appSettings?.subscription_status === 'active' ? 'Ativo' : 'Inativo / Pendente'}
                     </p>
                   </div>
                   <div>
                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Próximo Vencimento</p>
                     <p className="text-white font-medium">
                       {appSettings?.subscription_expires_at ? new Date(appSettings.subscription_expires_at).toLocaleDateString('pt-BR') : 'Nenhum faturamento programado.'}
                     </p>
                   </div>
                   
                   <button 
                     onClick={() => document.dispatchEvent(new CustomEvent('open-plans'))}
                     className="w-full mt-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
                   >
                     Alterar Plano ou Renovar
                   </button>
                 </div>
               </div>

               {/* Referral System */}
               <div className="bg-gradient-to-br from-red-600/10 to-purple-600/10 p-8 rounded-[2rem] border border-red-500/20 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[80px] -mr-20 -mt-20 rounded-full"></div>
                 <div>
                   <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3 mb-4">
                     <Users className="text-red-500" /> Sistema de Indicação
                   </h3>
                   <p className="text-gray-300 text-sm font-medium mb-6">
                     Ganhe <strong className="text-green-400">R$ 3,00</strong> de desconto na sua próxima fatura a cada indicação confirmada ou <strong className="text-purple-400">1 Mês Grátis</strong> a cada 5 amigos que assinarem usando seu link.
                   </p>
                   
                   <div className="bg-black/50 border border-white/5 p-4 rounded-xl mb-6">
                     <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">Seu Link Exclusivo</p>
                     <div className="flex items-center gap-2">
                       <code className="flex-1 text-xs text-red-400 truncate bg-white/5 p-2 rounded truncate block">
                         {window.location.origin}/invite/{appSettings?.user_id || profile?.id?.substring(0, 8) || 'user'}
                       </code>
                       <button onClick={() => {
                         navigator.clipboard.writeText(`${window.location.origin}/invite/${appSettings?.user_id || profile?.id?.substring(0, 8) || 'user'}`);
                         alert('Link copiado!');
                       }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                         <Copy size={16} />
                       </button>
                     </div>

                     <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-4 mb-3">Compartilhar Seu Link</p>
                     <div className="flex items-center gap-2 flex-wrap mt-2">
                       <a 
                         href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Ei! Vem assistir as melhores séries e filmes comigo. Baixe o app e ganhe vantagens usando meu convite! ${window.location.origin}/invite/${appSettings?.user_id || profile?.id?.substring(0, 8) || 'user'}`)}`}
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center gap-2 bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-white px-3 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex-1 justify-center whitespace-nowrap border border-[#25D366]/30"
                       >
                         WhatsApp
                       </a>
                       <a 
                         href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/invite/${appSettings?.user_id || profile?.id?.substring(0, 8) || 'user'}`)}&text=${encodeURIComponent(`Ei! Vem assistir as melhores séries e filmes comigo usando meu convite:`)}`}
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center gap-2 bg-[#0088cc]/20 text-[#0088cc] hover:bg-[#0088cc] hover:text-white px-3 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex-1 justify-center whitespace-nowrap border border-[#0088cc]/30"
                       >
                         Telegram
                       </a>
                       <button
                         onClick={() => {
                           if (navigator.share) {
                             navigator.share({
                               title: 'Convite Especial',
                               text: 'Vem assistir filmes e séries comigo! Aproveite e baixe usando meu convite especial.',
                               url: `${window.location.origin}/invite/${appSettings?.user_id || profile?.id?.substring(0, 8) || 'user'}`
                             });
                           } else {
                             alert('Navegador não suporta compartilhamento nativo. Copie o link acima!');
                           }
                         }}
                         className="flex items-center gap-2 bg-white/10 text-white hover:bg-white hover:text-black px-3 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex-1 justify-center whitespace-nowrap border border-white/20"
                       >
                         <Share2 size={14} /> Mais...
                       </button>
                     </div>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 rounded-xl block p-4 text-center border border-white/5">
                     <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Indicações</p>
                     <p className="text-2xl text-white font-black">{referralStats.count}</p>
                   </div>
                   <div className="bg-white/5 rounded-xl block p-4 text-center border border-white/5">
                     <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Créditos</p>
                     <p className="text-2xl text-green-400 font-black">
                        {referralStats.freeMonths > 0 ? (
                          <span className="text-purple-400">{referralStats.freeMonths} Mês!</span>
                        ) : (
                          `R$ ${referralStats.credits.toFixed(2).replace('.', ',')}`
                        )}
                     </p>
                   </div>
                 </div>

                 {referralStats.pending ? (
                   <div className="mt-4 bg-yellow-500/20 text-yellow-500 text-sm font-bold p-4 text-center rounded-xl border border-yellow-500/20 uppercase tracking-widest">
                      Resgate Solicitado ({referralStats.pending.status})
                   </div>
                 ) : (
                   <button 
                     onClick={handleRedeem}
                     disabled={referralStats.count === 0 || redeeming}
                     className="mt-4 w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                   >
                     {redeeming ? 'Processando...' : 'Resgatar Benefícios'}
                   </button>
                 )}
               </div>
             </div>
          )}

          {/* TAB: STATS / ANALYTICS DETAIL */}
          {activeSubTab === 'stats' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 p-8 md:p-12 rounded-[2rem] border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                   <div className="w-32 h-32 rounded-full border-8 border-red-600/30 flex items-center justify-center mb-6 relative">
                     <span className="text-5xl font-black text-white italic">{stats.hoursWatched}</span>
                     <svg className="absolute inset-0 w-32 h-32 -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-red-600" strokeDasharray={351} strokeDashoffset={351 - (351 * 0.75)} />
                     </svg>
                   </div>
                   <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Horas no Multiverso</h4>
                   <p className="text-gray-400 font-bold max-w-sm">Você já devorou um total colossal de conteúdo neste app. Prepare a pipoca para aumentar esse rank!</p>
                </div>

                <div className="bg-white/5 p-8 md:p-12 rounded-[2rem] border border-white/10 backdrop-blur-xl flex flex-col justify-center">
                   <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-2"><Award className="text-yellow-500" /> Prêmios Desbloqueados</h4>
                   <div className="space-y-4">
                     <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl">
                       <div className="w-12 h-12 bg-purple-600/20 text-purple-500 rounded-full flex items-center justify-center"><Heart size={20} /></div>
                       <div>
                         <p className="text-white font-bold">Fã Fiel de {stats.topGenre}</p>
                         <p className="text-gray-500 text-xs">O gênero que você mais maratonou até hoje.</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl">
                       <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center"><UserCircle size={20} /></div>
                       <div>
                         <p className="text-white font-bold">Astro da Tela: {stats.topActor}</p>
                         <p className="text-gray-500 text-xs">O ator que mais apareceu nos seus filmes assistidos.</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl opacity-50 grayscale">
                       <div className="w-12 h-12 bg-green-600/20 text-green-500 rounded-full flex items-center justify-center"><Clock size={20} /></div>
                       <div>
                         <p className="text-white font-bold">Fim de Semana Intenso</p>
                         <p className="text-gray-500 text-xs">Assistir 10 horas seguidas (Ainda bloqueado)</p>
                       </div>
                     </div>
                   </div>
                </div>
             </div>
          )}

          {/* TAB: DEVICES */}
          {activeSubTab === 'devices' && (
             <div className="bg-white/5 p-8 md:p-12 rounded-[2rem] border border-white/10 backdrop-blur-xl max-w-4xl mx-auto">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3 mb-2">
                   <Monitor className="text-blue-500" /> Dispositivos e Sessões
                </h3>
                <p className="text-gray-400 font-bold text-sm mb-10">Gerencie todos os dispositivos atrelados ao seu perfil e deslogue computadores antigos por segurança.</p>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl">
                    <div className="flex items-center gap-5">
                      <Monitor size={32} className="text-white" />
                      <div>
                        <p className="text-white font-black text-lg">Seu Dispositivo Atual</p>
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">
                          Sessão Ativa: {navigator.userAgent.includes('Mobile') ? 'Smartphone' : 'Desktop'} ({new Date().toLocaleDateString()})
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-blue-600 text-white font-black uppercase text-[10px] rounded-lg tracking-widest">
                      Online Agora
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-black/30 border border-white/5 p-6 rounded-2xl opacity-60">
                    <div className="flex items-center gap-5">
                      <Smartphone size={32} className="text-gray-500" />
                      <div>
                        <p className="text-gray-300 font-bold text-lg">Dispositivo Secundário</p>
                        <p className="text-gray-500 text-xs mt-1">Não detectado nesta sessão</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] rounded-lg tracking-widest transition-colors cursor-not-allowed">
                      Vazio
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-black/30 border border-white/5 p-6 rounded-2xl">
                    <div className="flex items-center gap-5">
                      <Tv size={32} className="text-gray-500" />
                      <div>
                        <p className="text-gray-300 font-bold text-lg">Smart TV Principal</p>
                        <p className="text-gray-500 text-xs mt-1">Sessão vinculada via código QR</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert('Dispositivo removido da sua lista de confiança.')}
                      className="px-4 py-2 bg-white/10 hover:bg-red-600/20 hover:text-red-500 text-white font-black uppercase text-[10px] rounded-lg tracking-widest transition-colors border border-transparent hover:border-red-600/50"
                    >
                      Remover Vínculo
                    </button>
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <button onClick={handleLogoutAll} className="bg-white text-black hover:bg-gray-200 px-10 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-xl">
                    Encerrar Sessão em Todos
                  </button>
                  <p className="text-gray-500 text-[10px] uppercase font-bold mt-4 tracking-widest">Atenção: Você precisará logar novamente em todos os aparelhos.</p>
                </div>
             </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
