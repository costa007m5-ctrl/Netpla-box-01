import React, { useState } from 'react';
import { X, Moon, Sun, Globe, Play, Layout, Check, Save, Cloud, ExternalLink, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { AppSettings } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  settings: AppSettings | null;
  onClose: () => void;
  onUpdate: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings || {
    id: '',
    user_id: '',
    theme: 'dark',
    language: 'pt-BR',
    autoplay_next: true,
    show_logos: true,
    updated_at: new Date().toISOString()
  });
  const [saving, setSaving] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      
      const authWindow = window.open(url, 'google_auth', 'width=600,height=700');
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          const account = event.data.payload;
          setLocalSettings(prev => ({
            ...prev,
            google_drive_accounts: [...(prev.google_drive_accounts || []), account],
            google_drive_token: account.access_token // Use the latest token as primary
          }));
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('Erro ao conectar Google Drive:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({
          ...localSettings,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onUpdate(data);
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-500">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-[#121212] w-full max-w-2xl rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-10 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-3 rounded-2xl shadow-lg shadow-red-600/20">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Configurações</h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1 italic">Personalize sua experiência</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white hover:rotate-90 duration-500"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-12 max-h-[60vh] overflow-y-auto scrollbar-hide">
          {/* Aparência */}
          <section>
            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-6 italic">Visual & Tema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'dark' }))}
                className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${localSettings.theme === 'dark' ? 'border-red-600 bg-red-600/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${localSettings.theme === 'dark' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                    <Moon size={20} />
                  </div>
                  <span className="text-white font-black uppercase tracking-widest text-xs italic">Modo Escuro</span>
                </div>
                {localSettings.theme === 'dark' && <Check size={20} className="text-red-600" />}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLocalSettings(prev => ({ ...prev, theme: 'light' }))}
                className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all ${localSettings.theme === 'light' ? 'border-red-600 bg-red-600/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${localSettings.theme === 'light' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                    <Sun size={20} />
                  </div>
                  <span className="text-white font-black uppercase tracking-widest text-xs italic">Modo Claro</span>
                </div>
                {localSettings.theme === 'light' && <Check size={20} className="text-red-600" />}
              </motion.button>
            </div>
          </section>

          {/* Idioma */}
          <section>
            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-6 italic">Idioma e Região</h3>
            <div className="relative group">
              <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors" size={24} />
              <select 
                value={localSettings.language}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full bg-white/5 border border-white/5 text-white p-6 pl-16 rounded-[2rem] outline-none focus:border-red-600/50 transition-all appearance-none font-bold italic text-sm"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
          </section>

          {/* Reprodução */}
          <section>
            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-6 italic">Experiência de Reprodução</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-8 bg-white/5 rounded-[2rem] border border-white/5 group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-black/40 rounded-2xl text-gray-400 group-hover:text-red-600 transition-colors">
                    <Play size={24} />
                  </div>
                  <div>
                    <p className="text-white font-black uppercase tracking-widest text-xs italic">Auto-reprodução</p>
                    <p className="text-[10px] text-gray-500 font-bold italic mt-1">Reproduzir próximo episódio automaticamente</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLocalSettings(prev => ({ ...prev, autoplay_next: !prev.autoplay_next }))}
                  className={`w-16 h-8 rounded-full transition-all relative ${localSettings.autoplay_next ? 'bg-red-600 shadow-lg shadow-red-600/40' : 'bg-gray-800'}`}
                >
                  <motion.div 
                    animate={{ x: localSettings.autoplay_next ? 32 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md" 
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-8 bg-white/5 rounded-[2rem] border border-white/5 group hover:bg-white/10 transition-all">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-black/40 rounded-2xl text-gray-400 group-hover:text-red-600 transition-colors">
                    <Layout size={24} />
                  </div>
                  <div>
                    <p className="text-white font-black uppercase tracking-widest text-xs italic">Interface Visual</p>
                    <p className="text-[10px] text-gray-500 font-bold italic mt-1">Exibir logos dos canais nos cartazes</p>
                  </div>
                </div>
                <button 
                  onClick={() => setLocalSettings(prev => ({ ...prev, show_logos: !prev.show_logos }))}
                  className={`w-16 h-8 rounded-full transition-all relative ${localSettings.show_logos ? 'bg-red-600 shadow-lg shadow-red-600/40' : 'bg-gray-800'}`}
                >
                  <motion.div 
                    animate={{ x: localSettings.show_logos ? 32 : 4 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md" 
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Integrações */}
          <section>
            <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] mb-6 italic">Conectividade</h3>
            <div className="p-10 bg-gradient-to-br from-blue-600/10 to-transparent rounded-[3rem] border border-blue-600/20 relative overflow-hidden group">
              <Cloud className="absolute -right-8 -top-8 text-blue-600/5 w-48 h-48 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
                    <Cloud className="text-white" size={32} />
                  </div>
                  <div className="text-center md:text-left">
                    <h4 className="text-white font-black text-xl uppercase tracking-tighter italic leading-none">Google Drive</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 italic">Sua biblioteca na nuvem</p>
                  </div>
                </div>
                {localSettings.google_drive_token ? (
                  <div className="flex items-center gap-3 text-green-500 bg-green-500/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest italic border border-green-500/20">
                    <ShieldCheck size={18} /> Conectado
                  </div>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConnectGoogle}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3 italic"
                  >
                    <ExternalLink size={18} /> Conectar Agora
                  </motion.button>
                )}
              </div>
              
              {localSettings.google_drive_token && (
                <button 
                  onClick={() => setLocalSettings(prev => ({ ...prev, google_drive_token: undefined }))}
                  className="mt-8 text-red-500 text-[10px] font-black uppercase tracking-widest italic hover:text-red-400 transition-colors"
                >
                  Desconectar conta
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-10 bg-black/40 border-t border-white/5 flex flex-col md:flex-row justify-end gap-6">
          <button 
            onClick={onClose}
            className="px-10 py-5 text-gray-500 font-black uppercase tracking-widest text-xs italic hover:text-white transition-colors"
          >
            Descartar
          </button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs italic hover:bg-red-500 transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-2xl shadow-red-600/20"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Salvar Alterações
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
