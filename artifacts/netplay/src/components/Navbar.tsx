import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, Settings, User, LogOut, ShieldCheck, ChevronDown, Users, Search, Bell, PlusCircle, Sparkles, Home, TrendingUp, Bookmark, CloudDownload, Play, ChevronLeft, Cpu, X } from 'lucide-react';
import AdminModal from './AdminModal';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface NavbarProps {
  onOpenCustomUrl: () => void;
  onRefresh?: () => void;
  onSwitchProfile?: () => void;
  activeProfile?: Profile;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onStartReScan?: (movies: any[]) => void;
  scannerState?: any;
  reScannerState?: any;
  onOpenSettings?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  isAdminModalOpen?: boolean;
  setIsAdminModalOpen?: (open: boolean) => void;
}

const Navbar = React.memo(({ 
  onOpenCustomUrl, 
  onRefresh, 
  onSwitchProfile, 
  activeProfile,
  activeTab = 'home',
  onTabChange = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  onStartReScan,
  scannerState,
  reScannerState,
  onOpenSettings,
  showBack,
  onBack,
  isAdminModalOpen = false,
  setIsAdminModalOpen = () => {}
}: NavbarProps) => {
  const [show, handleShow] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        handleShow(true);
      } else {
        handleShow(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
    navigate('/search');
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v) {
      setSearchParams({ q: v }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    if (onSearchChange) onSearchChange(v);
  };

  const currentQuery = searchParams.get('q') || searchQuery || '';
  const isOnSearchPage = window.location.pathname === '/search';
  
  useEffect(() => {
    if (isOnSearchPage) {
      setIsSearchOpen(true);
    }
  }, [isOnSearchPage]);

  return (
    <>
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 w-full h-16 md:h-24 px-4 md:px-12 flex justify-between items-center z-50 transition-all duration-500 ease-in-out ${show || isOnSearchPage ? "bg-black/80 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-b border-white/5" : "bg-gradient-to-b from-black via-black/50 to-transparent"}`}
      >
        <div className="flex items-center gap-6 md:gap-16 w-full max-w-[2000px] mx-auto">
          <AnimatePresence mode="wait">
            {showBack && !isOnSearchPage ? (
              <motion.button
                key="back-button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={onBack}
                className="flex items-center gap-3 text-white font-black uppercase tracking-tighter italic group bg-white/5 hover:bg-white hover:text-black hover:scale-105 px-6 py-2 md:py-3 rounded-2xl border border-white/10 transition-all shadow-xl whitespace-nowrap"
              >
                <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                <span className="hidden md:inline text-lg">Voltar</span>
              </motion.button>
            ) : (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  navigate('/');
                  onTabChange('home');
                }}
                className={`flex items-center gap-2 cursor-pointer relative group flex-shrink-0 ${isOnSearchPage && isSearchOpen ? 'hidden md:flex' : 'flex'}`}
              >
                <div className="flex items-center gap-2 md:gap-3 relative overflow-hidden rounded-[1rem] p-1">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-red-500 to-red-800 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/50 group-hover:shadow-red-600/80 transition-all border border-red-400/30">
                    <Play size={24} fill="white" className="text-white ml-1 group-hover:scale-110 transition-transform md:w-8 md:h-8 drop-shadow-md" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:duration-700 group-hover:animate-sheen pointer-events-none" />
                </div>
                
                <span className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter italic font-display leading-[0.8] drop-shadow-2xl">
                  NET<span className="text-red-500 bg-clip-text">PLAY</span>
                </span>
                
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Desktop Navigation */}
          <ul className={`hidden md:flex items-center gap-2 bg-white/5 p-1.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl ${isOnSearchPage ? 'md:hidden lg:flex' : ''}`}>
            {[
              { id: 'home', label: 'Início', icon: Home },
              { id: 'trending', label: 'Em Alta', icon: TrendingUp },
              { id: 'universe', label: 'Explorar', icon: Sparkles },
              { id: 'profile', label: 'Perfil', icon: User },
            ].map((item) => (
              <li 
                key={item.id}
                onClick={() => {
                   if(item.id === 'home') navigate('/menu');
                   else if(item.id === 'trending') navigate('/trending');
                   else if(item.id === 'universe') navigate('/universe');
                   else if(item.id === 'profile') navigate('/perfil');
                   onTabChange(item.id);
                }}
                className={`cursor-pointer transition-all flex items-center gap-2 group relative px-6 py-2.5 rounded-full ${activeTab === item.id && !isOnSearchPage ? 'text-white bg-white/10 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <item.icon size={16} className={activeTab === item.id && !isOnSearchPage ? 'text-red-500' : 'group-hover:text-red-400 transition-colors'} />
                <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                {activeTab === item.id && !isOnSearchPage && (
                  <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/10 rounded-full border border-white/10 -z-10 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />
                )}
              </li>
            ))}
          </ul>

          {/* Search Bar (Top Area) */}
          <div className="flex-1 flex justify-end items-center mr-4">
               {(!isSearchOpen && !isOnSearchPage) ? (
                 <button 
                  onClick={handleSearchClick}
                  className="p-3 text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
                 >
                   <Search size={22} className="text-gray-300" />
                 </button>
               ) : (
                 <motion.div 
                   initial={{ width: 0, opacity: 0 }}
                   animate={{ width: '100%', opacity: 1 }}
                   className="relative flex items-center w-full max-w-2xl bg-black/60 backdrop-blur-xl border border-white/20 rounded-full overflow-hidden shadow-2xl shadow-red-600/10 h-12 md:h-14"
                 >
                   <div className="pl-5 pr-3 text-red-600">
                     <Search size={22} />
                   </div>
                   <input
                     autoFocus
                     type="text"
                     placeholder="Buscar filmes, séries, gêneros..."
                     value={currentQuery}
                     onChange={handleSearchInput}
                     className="w-full bg-transparent text-white font-bold placeholder-gray-500 outline-none h-full text-sm md:text-base mr-3"
                   />
                   {(currentQuery || isOnSearchPage) && (
                     <button 
                       onClick={() => {
                         setSearchParams({});
                         if(!currentQuery) {
                            setIsSearchOpen(false);
                            navigate('/');
                         }
                       }}
                       className="p-2 mr-2 text-gray-400 hover:text-white transition-colors"
                     >
                       <X size={20} />
                     </button>
                   )}
                 </motion.div>
               )}
          </div>
        </div>
      </motion.div>

      {/* Mobile Navigation - Floating Dock Style */}
      <div className="fixed bottom-4 left-4 right-4 h-16 bg-black/80 backdrop-blur-[40px] border border-white/10 rounded-full flex justify-between items-center z-50 md:hidden px-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {[
          { id: 'home', label: 'Início', icon: Home, path: '/menu' },
          { id: 'trending', label: 'Em Alta', icon: TrendingUp, path: '/trending' },
          { id: 'universe', label: 'Explorar', icon: Sparkles, path: '/universe' },
          { id: 'profile', label: 'Perfil', icon: User, path: '/perfil' },
        ].map((item) => {
          const isActive = activeTab === item.id && !isOnSearchPage;
          return (
            <button 
              key={item.id}
              onClick={() => {
                navigate(item.path);
                onTabChange(item.id);
              }}
              className={`flex flex-col items-center justify-center transition-all relative w-16 h-12 rounded-full ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <div className={`relative flex items-center justify-center transition-transform duration-300 ${isActive ? '-translate-y-3' : ''}`}>
                 {item.id === 'profile' ? (
                   <img
                     className={`w-7 h-7 object-cover rounded-full border-2 shadow-sm transition-all ${isActive ? 'border-[#e50914] shadow-[0_0_15px_rgba(229,9,20,0.6)]' : 'border-white/10'}`}
                     src={activeProfile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"}
                     alt="Avatar"
                     referrerPolicy="no-referrer"
                   />
                 ) : (
                   <item.icon size={22} className={`${isActive ? 'text-[#e50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.6)]' : 'opacity-80'} transition-all`} />
                 )}
                 {isActive && (
                    <div className="absolute -bottom-4 w-1.5 h-1.5 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse" />
                 )}
              </div>
              <span className={`absolute bottom-1 text-[8px] font-black uppercase tracking-widest italic transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0 text-red-500' : 'opacity-0 translate-y-2'}`}>{item.label}</span>
              
              {isActive && (
                <motion.div 
                  layoutId="mobile-nav-dock-indicator" 
                  className="absolute inset-0 bg-white/5 rounded-full -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {isAdminModalOpen && (
        <AdminModal 
          onClose={() => setIsAdminModalOpen(false)} 
          onRefresh={onRefresh}
          onOpenCustomUrl={() => {
            setIsAdminModalOpen(false);
            onOpenCustomUrl();
          }}
          onStartReScan={onStartReScan}
          scannerState={scannerState}
          reScannerState={reScannerState}
        />
      )}
    </>
  );
});

export default Navbar;

