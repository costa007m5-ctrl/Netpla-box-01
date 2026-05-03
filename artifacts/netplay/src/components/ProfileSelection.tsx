import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, User, Trash2, Sparkles, RefreshCcw, Film, Tv, Play, Loader2, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Profile, Movie } from '../types';

const getWeeklyRecommendations = async (profile: Profile, movies: Movie[]) => null;

const DEFAULT_AVATARS = [
  'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88399df9j7679q6u.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-qo9h82134t9nv0j0.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-v979967897996789.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-dy996789dy996789.jpg',
  'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-2fg9967892fg996789.jpg'
];

const PREMIUM_AVATARS = [
  'https://mir-s3-cdn-cf.behance.net/project_modules/disp/366be133850498.56ba69ac36858.png', 
  'https://mir-s3-cdn-cf.behance.net/project_modules/disp/84c20033850498.56ba69ac290ea.png',
  'https://mir-s3-cdn-cf.behance.net/project_modules/disp/64623a33850498.56ba69ac2a6f7.png',
  'https://pro2-bar-s3-cdn-cf3.myportfolio.com/aa2bb133fcd9891823ebce6f9aebd1b5/0b6ac486-2dc9-4a0d-8ca3-30b1bc7e2311_rw_600.gif?h=60ef5ba96e6d761ff017f8b9e4aaeaf6', // GIF! 
  'https://pro2-bar-s3-cdn-cf.myportfolio.com/aa2bb133fcd9891823ebce6f9aebd1b5/45db51bd-9c02-4fc4-8830-bd6c1b3fbc06_rw_600.gif?h=bd171328eb4132b49eb120287dd44bb5' // GIF 2
];

interface ProfileSelectionProps {
  onSelect: (profile: Profile) => void;
  appSettings?: any;
}

const ProfileSelection: React.FC<ProfileSelectionProps> = ({ onSelect, appSettings }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Profile | null>(null);
  const [newName, setNewName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATARS[0]);
  const [movieAvatars, setMovieAvatars] = useState<string[]>([]);
  const [isFetchingAvatars, setIsFetchingAvatars] = useState(false);

  useEffect(() => {
    fetchProfiles();
    fetchMovieAvatars();
  }, []);

  const fetchMovieAvatars = async () => {
    setIsFetchingAvatars(true);
    try {
      const { data } = await supabase
        .from('movies')
        .select('poster_path')
        .not('poster_path', 'is', null)
        .limit(20);
      
      if (data) {
        const urls = data.map(m => m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w200/${m.poster_path}`);
        setMovieAvatars(urls);
      }
    } catch (error) {
      console.error('Erro ao buscar avatars de filmes:', error);
    } finally {
      setIsFetchingAvatars(false);
    }
  };

  const allAvatars = appSettings?.subscription_plan === 'max' 
    ? [...PREMIUM_AVATARS, ...DEFAULT_AVATARS, ...movieAvatars] 
    : [...DEFAULT_AVATARS, ...movieAvatars];

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar perfis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newName.trim()) return;
    if (profiles.length >= 3) {
      alert('Máximo de 3 perfis atingido.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          name: newName,
          avatar_url: selectedAvatar
        });

      if (error) throw error;
      
      setNewName('');
      setShowCreateModal(false);
      fetchProfiles();
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!showEditModal || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: newName,
          avatar_url: selectedAvatar
        })
        .eq('id', showEditModal.id);

      if (error) throw error;
      
      setShowEditModal(null);
      fetchProfiles();
      setIsEditing(false); // Sair do modo de edição após salvar
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      alert('Erro ao atualizar perfil: ' + error.message);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProfiles();
    } catch (error) {
      console.error('Erro ao deletar perfil:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <Loader2 className="text-red-600 animate-spin" size={64} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full"></div>
      </div>

      <AnimatePresence mode="wait">
        {!showCreateModal && !showEditModal ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center relative z-10 max-w-6xl w-full"
          >
            <motion.h1 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-6xl font-black text-white mb-12 uppercase tracking-tighter italic"
            >
              {isEditing ? 'Gerenciar Perfis:' : 'Quem está assistindo?'}
            </motion.h1>
            
            <div className="flex flex-wrap justify-center gap-8 md:gap-12">
              {profiles.map((p, idx) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="group relative"
                >
                  <div 
                    onClick={() => isEditing ? (setShowEditModal(p), setNewName(p.name), setSelectedAvatar(p.avatar_url)) : onSelect(p)}
                    className={`w-28 h-28 md:w-40 md:h-40 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 group-hover:scale-105 shadow-2xl relative ${appSettings?.subscription_plan === 'max' ? 'ring-4 ring-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)] group-hover:ring-8 group-hover:ring-yellow-400' : 'group-hover:ring-8 group-hover:ring-red-600'}`}
                  >
                    {appSettings?.subscription_plan === 'max' && (
                      <div className="absolute -top-1 -right-1 z-20">
                        <Crown size={24} className="text-yellow-400 drop-shadow-md rotate-12" fill="currentColor" />
                      </div>
                    )}
                    <img 
                      src={p.avatar_url} 
                      alt={p.name}
                      className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${isEditing ? 'brightness-50' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {isEditing ? <Edit2 className="text-white" size={48} /> : <Play className="text-white fill-white" size={48} />}
                    </div>
                  </div>
                  <p className="mt-6 text-gray-400 font-black text-lg md:text-xl group-hover:text-white transition-colors uppercase tracking-widest italic">{p.name}</p>
                </motion.div>
              ))}

              {profiles.length < 3 && !isEditing && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * profiles.length }}
                  className="flex flex-col items-center group"
                >
                  <button 
                    onClick={() => {
                      setShowCreateModal(true);
                      setNewName('');
                      setSelectedAvatar(DEFAULT_AVATARS[0]);
                    }}
                    className="w-28 h-28 md:w-40 md:h-40 rounded-3xl bg-white/5 border-4 border-dashed border-white/10 flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 shadow-xl"
                  >
                    <Plus size={48} className="group-hover:rotate-90 transition-transform duration-500" />
                  </button>
                  <p className="mt-6 text-gray-600 font-black text-lg md:text-xl group-hover:text-white transition-colors uppercase tracking-widest italic">Novo Perfil</p>
                </motion.div>
              )}
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className="mt-20 px-12 py-4 border-2 border-white/20 text-white/50 hover:text-white hover:border-white text-xl uppercase tracking-[0.3em] transition-all font-black bg-transparent hover:bg-white/5 rounded-2xl italic"
            >
              {isEditing ? 'Concluído' : 'Gerenciar Perfis'}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-2xl w-full bg-white/5 p-12 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-2xl relative z-10"
          >
            <div className="absolute top-0 right-0 p-8">
              <Sparkles className="text-red-600 animate-pulse" size={32} />
            </div>

            <h2 className="text-4xl font-black text-white mb-12 uppercase tracking-tighter italic">
              {showEditModal ? 'Editar Perfil' : 'Criar Perfil'}
            </h2>
            
            <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-[2rem] blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
                <img 
                  src={selectedAvatar} 
                  alt="Preview"
                  className="relative w-40 h-40 md:w-56 md:h-56 rounded-[2rem] object-cover border-4 border-white/10 shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => fetchMovieAvatars()}
                  className="absolute bottom-4 right-4 bg-red-600 text-white p-4 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <RefreshCcw size={24} className={isFetchingAvatars ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="flex-1 w-full space-y-8">
                <div className="space-y-2">
                  <label className="text-gray-500 font-black text-xs uppercase tracking-widest italic ml-2">Nome do Perfil</label>
                  <input 
                    type="text"
                    placeholder="Ex: João Silva"
                    className="w-full bg-black/40 border border-white/10 text-white p-5 rounded-2xl outline-none focus:border-red-600 transition-all text-xl font-bold"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={showEditModal ? handleUpdateProfile : handleCreateProfile}
                    disabled={!newName.trim()}
                    className="flex-1 bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Check size={24} /> Salvar
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(null);
                      setNewName('');
                      setSelectedAvatar(DEFAULT_AVATARS[0]);
                    }}
                    className="bg-white/10 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 active:scale-95"
                  >
                    <X size={24} />
                  </button>
                </div>

                {showEditModal && (
                  <button 
                    onClick={() => handleDeleteProfile(showEditModal.id)}
                    className="w-full text-red-600 font-black text-xs uppercase tracking-widest hover:text-red-500 transition-colors flex items-center justify-center gap-2 pt-4"
                  >
                    <Trash2 size={16} /> Excluir Perfil
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-gray-400 text-xs font-black uppercase tracking-widest">Escolha seu Personagem</label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Film size={14} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Cinema</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Tv size={14} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Séries</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4 max-h-[240px] overflow-y-auto pr-4 scrollbar-hide">
                {allAvatars.map((avatar, idx) => {
                  const isPremium = PREMIUM_AVATARS.includes(avatar);
                  return (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.1, rotate: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all shadow-xl ${selectedAvatar === avatar ? 'border-red-600 ring-4 ring-red-600/20' : 'border-transparent hover:border-white/30'}`}
                    >
                      <img 
                        src={avatar} 
                        alt={`Avatar ${idx}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {isPremium && (
                        <div className="absolute top-1 right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black p-0.5 rounded-full shadow-lg">
                          <Sparkles size={10} fill="currentColor" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileSelection;
