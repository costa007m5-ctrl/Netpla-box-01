import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader2, Sparkles, ShieldCheck, Mail, Lock, Eye, EyeOff, Play, ChevronLeft, Check, RefreshCcw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  initialMode?: 'login' | 'signup' | 'updatePassword';
  movies?: any[];
}

const Login: React.FC<LoginProps> = ({ initialMode = 'login', movies = [] }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'updatePassword'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [welcomeText, setWelcomeText] = useState('');

  React.useEffect(() => {
    // Detectar rota para ajustar título inicial
    if (window.location.pathname.includes('/redefinirsenha')) {
      setMode('updatePassword');
    } else if (window.location.pathname.includes('/confirmacao')) {
      setMessage('🍿 Bem-vindo! Quase lá, sua conta está sendo validada...');
    }

    // Escutar eventos de recuperação e confirmação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('updatePassword');
        setMessage(null);
        setError(null);
      }
      
      if (event === 'USER_UPDATED') {
        // Pode ser usado para confirmar mudança de e-mail por exemplo
      }

      if (event === 'SIGNED_IN' && !session?.user.last_sign_in_at) {
        // Primeiro login após confirmação de e-mail
        setMessage('🎯 Conta confirmada com sucesso! Bem-vindo ao Net Play.');
        setTimeout(() => setMessage(null), 5000);
      }
    });

    const hours = new Date().getHours();
    if (hours < 12) setWelcomeText('Bom dia!');
    else if (hours < 18) setWelcomeText('Boa tarde!');
    else setWelcomeText('Boa noite!');

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === 'signup') {
        const referralCode = localStorage.getItem('netplay_referral_code');
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/menu`,
            data: { referred_by: referralCode || null, whatsapp }
          }
        });
        if (error) throw error;
        setMessage('✨ Cadastro realizado! Verifique o Gmail para confirmar sua conta e liberar o acesso.');
        setError(null);
      } else if (mode === 'updatePassword') {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage('✅ Senha alterada com sucesso! Você já pode entrar.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na ação.');
    } finally {
      setLoading(false);
    }
  };

  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setMessage('📧 Link de redefinição enviado! Confira sua caixa de entrada no Gmail.');
      setIsForgotPassword(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans bg-[#020202]"
    >
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {movies && movies.length > 0 ? (
          <div className="absolute inset-0 z-0 opacity-20 scale-110 -rotate-3 origin-center">
            <div className="flex flex-col gap-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex gap-4">
                  <motion.div
                    animate={{ 
                      x: row % 2 === 0 ? [0, -2000] : [-2000, 0] 
                    }}
                    transition={{ 
                      duration: 80 + (row * 15), 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                    className="flex gap-4 shrink-0"
                  >
                    {[...movies, ...movies].slice(row * 10, (row * 10) + 20).map((movie, i) => (
                      <div 
                        key={`${row}-${i}`} 
                        className="w-40 md:w-56 aspect-[2/3] rounded-3xl overflow-hidden border border-white/5 shadow-2xl"
                      >
                        <img 
                          src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w342/${movie.poster_path}`}
                          className="w-full h-full object-cover grayscale-[0.3]"
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale-[0.4]"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2000&auto=format&fit=crop')`
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020202] via-transparent to-[#020202]" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-red-600/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" 
        />
      </div>

      {/* Floating Elements (Background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: '110vh', x: `${Math.random() * 100}vw` }}
            animate={{ y: '-10vh' }}
            transition={{ 
              duration: 15 + Math.random() * 10, 
              repeat: Infinity, 
              delay: Math.random() * 15,
              ease: "linear"
            }}
            className="w-1 h-32 bg-gradient-to-b from-transparent via-red-600/30 to-transparent"
          />
        ))}
      </div>

      {/* Logo Container */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 p-8 md:p-12 z-20 flex items-center justify-between pointer-events-none"
      >
        <div 
          onClick={() => {
            setMode('login');
            setIsForgotPassword(false);
            setMessage(null);
            setError(null);
          }}
          className="flex items-center gap-3 cursor-pointer pointer-events-auto group"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.5)] group-hover:scale-110 transition-transform duration-500">
            <Play size={20} className="text-white fill-white ml-1" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-2xl md:text-3xl italic tracking-tight uppercase leading-none">NetPremium</span>
            <span className="text-[8px] md:text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-1 ml-1">Premium Hub</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 pointer-events-auto">
          <button onClick={() => window.open('https://help.netflix.com', '_blank')} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors italic">Suporte</button>
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all italic">
            {mode === 'login' ? 'Assinar Agora' : 'Entrar'}
          </button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="w-full h-full min-h-screen px-0 md:max-w-7xl md:px-6 flex flex-col md:flex-row items-center justify-between gap-0 md:gap-12 z-10">
        
        {/* Left Side: Branding/Marketing */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="hidden md:flex flex-col gap-8 max-w-lg mt-24 md:mt-0"
        >
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-full w-fit flex items-center gap-2"
            >
              <Sparkles className="text-red-500" size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500 italic">Promoção Exclusiva Ativada</span>
            </motion.div>
            <h2 className="text-5xl xl:text-7xl font-black text-white italic uppercase tracking-tighter leading-[0.9]">
              {welcomeText}<br />
              <span className="text-red-600">Sua jornada</span><br />
              começa aqui.
            </h2>
            <p className="text-gray-400 text-lg font-medium leading-relaxed max-w-md italic">
              Filmes ilimitados, séries e muito mais. Assista onde quiser. Cancele quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <ShieldCheck className="text-blue-500 mb-3" size={24} />
              <h4 className="text-white font-black uppercase italic text-xs mb-1">Privacidade Total</h4>
              <p className="text-gray-500 text-[10px] font-medium leading-relaxed">Seus dados protegidos com criptografia de ponta.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <Play className="text-emerald-500 mb-3" size={24} />
              <h4 className="text-white font-black uppercase italic text-xs mb-1">Qualidade 4K</h4>
              <p className="text-gray-500 text-[10px] font-medium leading-relaxed">Experiência cinematográfica na sua casa.</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Auth Form */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative w-full max-w-[460px] md:max-w-[460px] flex flex-col justify-end min-h-screen md:min-h-0 pt-32 pb-8 md:py-0"
        >
          {/* Mobile spacing filler to push content to bottom */}
          <div className="flex-1 md:hidden" />

          {/* Form Card */}
          <div className="bg-gradient-to-t from-black via-black/90 to-black/40 md:bg-black/60 backdrop-blur-xl md:backdrop-blur-[40px] p-8 md:p-14 rounded-t-[3rem] md:rounded-[3rem] border-t border-x-0 md:border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-[0_50px_100px_rgba(0,0,0,0.9)] relative z-10 w-full mb-0 mt-auto">
            {/* Glossy Overlay */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Mobile Dragger hint */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-8 md:hidden" />

            <div className="flex flex-col gap-4 mb-12">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-3 mb-2">
                  <Play size={28} className="text-red-600 fill-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]" />
                  <h1 className="text-white text-4xl font-black uppercase tracking-tighter italic">NetPremium</h1>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-2" />
                <span className="text-red-500 font-black text-[10px] uppercase tracking-[0.4em] italic opacity-80">Seu Premium Hub</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 mt-4 text-white/40">
                <ShieldCheck size={14} className="text-red-600" />
                <p className="text-[9px] font-bold uppercase tracking-widest italic">Acesso Restrito & Criptografado</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-2xl mb-8 flex items-center gap-3 text-xs font-bold italic overflow-hidden shadow-inner"
                >
                  <AlertCircle size={18} className="shrink-0 text-red-500" />
                  {error}
                </motion.div>
              )}
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 p-5 rounded-2xl mb-8 flex items-start gap-4 text-xs font-bold italic overflow-hidden shadow-xl"
                >
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Mail size={18} className="shrink-0 text-emerald-400" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Sucesso!</span>
                    <span>{message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isForgotPassword ? (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/50 group-focus-within:text-red-600 transition-all duration-300" size={18} />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-glass-premium text-white rounded-[1.5rem] pl-14 pr-6 py-5 outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm shadow-xl placeholder:text-white/20"
                      required
                    />
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="bg-[#e50914] text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.25rem] mt-2 transition-all flex items-center justify-center disabled:opacity-50 shadow-[0_15px_40px_rgba(229,9,20,0.4)] italic text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : 'Enviar Recuperação'}
                </motion.button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                    setMessage(null);
                  }}
                  className="flex items-center justify-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest italic hover:text-white transition-colors mt-2"
                >
                  <ChevronLeft size={14} /> Voltar ao Login
                </button>
              </form>
            ) : mode === 'updatePassword' ? (
              <form onSubmit={handleAuth} className="flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/50 group-focus-within:text-red-600 transition-all duration-300" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Nova senha secreta"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-glass-premium text-white rounded-[1.5rem] pl-14 pr-14 py-5 outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm shadow-xl placeholder:text-white/20"
                      required
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/50 group-focus-within:text-red-600 transition-all duration-300" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirme a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-glass-premium text-white rounded-[1.5rem] pl-14 pr-14 py-5 outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm shadow-xl placeholder:text-white/20"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="premium-gradient-red neon-glow-red hover:scale-[1.02] text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] mt-2 transition-all flex items-center justify-center disabled:opacity-50 italic text-sm border border-white/10"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : 'Definir Nova Senha'}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/50 group-focus-within:text-red-600 transition-all duration-300" size={18} />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-glass-premium text-white rounded-[1.5rem] pl-14 pr-6 py-5 outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm shadow-xl placeholder:text-white/20"
                      required
                    />
                  </div>
                  
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/50 group-focus-within:text-red-600 transition-all duration-300" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha secreta"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-glass-premium text-white rounded-[1.5rem] pl-14 pr-14 py-5 outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm shadow-xl placeholder:text-white/20"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {mode === 'signup' && (
                    <div className="relative group">
                      <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400/50 group-focus-within:text-red-600 transition-all duration-300" size={18} />
                      <input
                        type="tel"
                        placeholder="WhatsApp (com DDD)"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-glass-premium text-white rounded-[1.5rem] pl-14 pr-6 py-5 outline-none border border-white/5 focus:border-red-600/50 transition-all font-bold italic text-sm shadow-xl placeholder:text-white/20"
                        required
                      />
                    </div>
                  )}
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="premium-gradient-red neon-glow-red hover:scale-[1.02] text-white font-black uppercase tracking-[0.2em] py-5 rounded-[1.5rem] mt-2 transition-all flex items-center justify-center disabled:opacity-50 italic text-sm border border-white/10"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : (mode === 'login' ? 'Entrar Agora' : 'Finalizar Inscrição')}
                </motion.button>
              </form>
            )}

            {!isForgotPassword && mode !== 'updatePassword' && (
              <div className="flex justify-between items-center mt-8 text-gray-500 text-[10px] font-black uppercase tracking-widest italic">
                <div className="flex items-center gap-2 cursor-pointer group">
                  <div className="w-5 h-5 rounded-lg border border-white/10 flex items-center justify-center group-hover:border-red-600 transition-all bg-white/[0.02]">
                    <input type="checkbox" id="remember" className="hidden" />
                    <Check size={12} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <label htmlFor="remember" className="cursor-pointer group-hover:text-gray-300">Lembre-se</label>
                </div>
                <button 
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError(null);
                    setMessage(null);
                  }}
                  className="hover:text-white transition-colors underline decoration-white/10"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {mode !== 'updatePassword' && (
              <div className="mt-12 space-y-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-bold italic text-[10px] uppercase tracking-widest">{mode === 'login' ? 'Novo por aqui?' : 'Já tem uma saga?'}</span>
                    <button 
                      type="button"
                      onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                      className="text-red-600 font-black uppercase tracking-[0.1em] italic text-[10px] hover:underline"
                    >
                      {mode === 'login' ? 'Assinar Agora' : 'Fazer Login'}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-3 pt-8 border-t border-white/5">
                  <div className="p-2 bg-red-600/10 rounded-lg">
                    <ShieldCheck size={16} className="text-red-600" />
                  </div>
                  <p className="text-gray-500 text-[8px] leading-relaxed font-bold uppercase tracking-[0.2em] italic max-w-[240px]">
                    Dados protegidos por criptografia de ponta a ponta (SHA-256). 
                    <span className="text-white/30 hover:text-white cursor-pointer ml-1 underline decoration-red-600/50">Termos & Privacidade.</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Glowing Shadow (Form) */}
          <div className="absolute -inset-10 bg-red-600/5 blur-[100px] rounded-[5rem] -z-10 pointer-events-none" />
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-0 right-0 text-center z-20 opacity-30">
        <p className="text-white text-[9px] font-black uppercase tracking-[0.8em] italic">Streaming experience powered by NetPremium Engine</p>
      </div>
    </div>
  );
};

export default Login;
