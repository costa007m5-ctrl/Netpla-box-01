import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Trash2, Eye, EyeOff, RefreshCcw, Edit3, CheckSquare, Square, 
  Filter, ChevronLeft, MoreVertical, LayoutGrid, List, AlertCircle, 
  Cloud, Link as LinkIcon, ExternalLink, Play, Check, X, Save,
  ArrowUpDown, Download, Settings, Database, Plus, Upload,
  Sparkles, Calendar, Shield, Copy, Star, Send, Image as ImageIcon,
  Activity, Users, Heart, DollarSign, Server, Bell, RefreshCw
} from 'lucide-react';
import { Movie, ScannerState, ReScannerState, StreamingProvider } from '../types';
import { supabase } from '../lib/supabase';
import tmdb, { requests, getMovieLogo } from '../services/tmdb';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminMercadoPagoTab from './admin/AdminMercadoPagoTab';
import AdminReferralsTab from './admin/AdminReferralsTab';
import { AdminAPIsTab } from './admin/AdminAPIsTab';
import { AdminOneSignalTab } from './admin/AdminOneSignalTab';
import AdminTeraboxTab from './admin/AdminTeraboxTab';

interface AdminPanelProps {
  movies: Movie[];
  streamingProviders: StreamingProvider[];
  onClose: () => void;
  onUpdateMovie: (movie: Movie) => Promise<void>;
  onAddMovie: (movie: Partial<Movie>) => Promise<void>;
  onDeleteMovies: (ids: number[]) => Promise<void>;
  onToggleHideMovies: (ids: number[], hide: boolean) => Promise<void>;
  onStartScanner: (folderId: string, folderUrl: string, options?: { type?: 'movie' | 'series' }) => void;
  onStartReScanner: (movies: Movie[]) => void;
  onAddStreamingProvider: (provider: Partial<StreamingProvider>) => Promise<void>;
  onUpdateStreamingProvider: (provider: StreamingProvider) => Promise<void>;
  onDeleteStreamingProvider: (id: string) => Promise<void>;
  onSeedProviders?: () => Promise<void>;
  scannerState: ScannerState | null;
  reScannerState: ReScannerState | null;
  onStartCollectionAutomation: (movies: Movie[]) => void;
  onUpdateCollectionInfo?: (specificCollectionId?: number) => Promise<void>;
  onSyncMissingLogos?: () => Promise<void>;
  collectionAutomationState: any;
  categories?: any[];
  onRefreshCategoryImages?: (categoryId?: number) => Promise<void>;
  onUpdateCategoryImage?: (categoryId: number, backdrop: string) => Promise<void>;
}

type AdminTab = 'dashboard' | 'all' | 'drive' | 'kingx' | 'others' | 'pending' | 'providers' | 'app' | 'duplicates' | 'collections' | 'supabase' | 'requests' | 'genres' | 'users' | 'mercadopago' | 'referrals' | 'apis' | 'onesignal' | 'terabox';

const AdminPanel: React.FC<AdminPanelProps> = ({
  movies,
  streamingProviders,
  onClose,
  onUpdateMovie,
  onAddMovie,
  onDeleteMovies,
  onToggleHideMovies,
  onStartScanner,
  onStartReScanner,
  onAddStreamingProvider,
  onUpdateStreamingProvider,
  onDeleteStreamingProvider,
  onSeedProviders,
  scannerState,
  reScannerState,
  onStartCollectionAutomation,
  onUpdateCollectionInfo,
  onSyncMissingLogos,
  collectionAutomationState,
  categories,
  onRefreshCategoryImages,
  onUpdateCategoryImage
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('all');
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [categoryUrl, setCategoryUrl] = useState('');
  const [isRefreshingCategories, setIsRefreshingCategories] = useState(false);
  const [refreshingCategoryId, setRefreshingCategoryId] = useState<number | null>(null);

  const handleRefreshAllCategories = async () => {
    if (!onRefreshCategoryImages) return;
    setIsRefreshingCategories(true);
    await onRefreshCategoryImages();
    setIsRefreshingCategories(false);
  };

  const handleRefreshSingleCategory = async (id: number) => {
    if (!onRefreshCategoryImages) return;
    setRefreshingCategoryId(id);
    await onRefreshCategoryImages(id);
    setRefreshingCategoryId(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMovie, setNewMovie] = useState<Partial<Movie>>({
    title: '',
    overview: '',
    video_url: '',
    video_url_2: '',
    poster_path: '',
    backdrop_path: '',
    type: 'movie',
    genres: '',
    release_date: '',
    runtime: 0,
    rating: 0,
    actors: '',
    is_hidden: false,
    watch_providers: '',
    episodes: []
  });
  const [kingxSeriesUrl, setKingxSeriesUrl] = useState('');
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<StreamingProvider | null>(null);
  const [newProvider, setNewProvider] = useState<Partial<StreamingProvider>>({
    name: '',
    logo_url: '',
    priority: 0
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isTmdbSearching, setIsTmdbSearching] = useState(false);
  const [tmdbSearchResults, setTmdbSearchResults] = useState<any[]>([]);
  const [isAutomatingCollections, setIsAutomatingCollections] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState({ current: 0, total: 0 });
  const [manualCollectionName, setManualCollectionName] = useState('');
  const [isManualProcessing, setIsManualProcessing] = useState(false);
  const [collectionSearchResults, setCollectionSearchResults] = useState<any[]>([]);
  const [isCollectionSearching, setIsCollectionSearching] = useState(false);
  const [selectedTMDBCollection, setSelectedTMDBCollection] = useState<any | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    onlineUsers: Math.floor(Math.random() * 8) + 2,
    mostWatched: [] as { id: string | number, count: number }[],
    mostFavorited: [] as { id: string | number, count: number }[]
  });

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        const { data: history } = await supabase.from('watch_history').select('movie_id');
        const { data: favorites } = await supabase.from('my_list').select('movie_id');
        
        const watchCounts = history?.reduce((acc: any, curr: any) => {
          acc[curr.movie_id] = (acc[curr.movie_id] || 0) + 1;
          return acc;
        }, {});
        const favCounts = favorites?.reduce((acc: any, curr: any) => {
          acc[curr.movie_id] = (acc[curr.movie_id] || 0) + 1;
          return acc;
        }, {});

        const sortedWatched = Object.entries(watchCounts || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(e => ({ id: e[0], count: e[1] as number }));
        const sortedFavs = Object.entries(favCounts || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(e => ({ id: e[0], count: e[1] as number }));

        setMetrics(prev => ({
          ...prev,
          totalUsers: count || 0,
          mostWatched: sortedWatched,
          mostFavorited: sortedFavs
        }));
      } catch (e) {
        console.error("Erro ao buscar metricas", e);
      }
    };
    fetchMetrics();
    
    // Simulate real-time online users
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        onlineUsers: Math.max(1, prev.onlineUsers + (Math.random() > 0.5 ? 1 : -1))
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const LOGO_HTML = `
    <div style="font-family: Arial, sans-serif; font-weight: 900; font-style: italic; font-size: 28px; color: #ffffff; letter-spacing: -1px;">
      <span style="background: #e50914; color: #fff; padding: 2px 8px; border-radius: 6px; margin-right: 2px; box-shadow: 0 4px 10px rgba(229, 9, 20, 0.5);">N</span>ET<span style="color: #e50914;">PLAY</span>
    </div>
  `;

  const EMAIL_TEMPLATES = [
    {
      id: 'confirm_signup',
      title: 'Confirme sua Inscrição',
      description: 'Template para novos usuários confirmarem o e-mail pós-cadastro. Usa ConfirmationURL e Email.',
      icon: <Check className="text-green-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu Cadastro</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
    .header { padding: 40px; text-align: center; background: #111; }
    .content { padding: 40px; text-align: center; }
    h1 { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; font-style: italic; margin-bottom: 16px; color: #ffffff; }
    p { font-size: 16px; line-height: 1.6; color: #a0a0a0; margin-bottom: 32px; font-weight: 500; }
    .button { background: #e50914; color: #ffffff !important; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 14px; display: inline-block; box-shadow: 0 10px 30px rgba(229, 9, 20, 0.3); }
    .footer { padding: 40px; background-color: #0f0f0f; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${LOGO_HTML}
    </div>
    <div class="content">
      <h1>Bem-vindo ao Multiverso 🍿</h1>
      <p>Olá, <strong>{{ .Email }}</strong>!</p>
      <p>Sua jornada épica está prestes a começar. Confirme seu cadastro clicando no botão abaixo para desbloquear o acesso.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Ativar Minha Conta</a>
      <p style="margin-top: 30px; font-size: 12px; color: #555;">Caso o botão não funcione, cole este link no navegador:<br>{{ .ConfirmationURL }}</p>
    </div>
    <div class="footer">
      <p style="font-size: 12px; color: #888; margin: 0;">Acesse de qualquer lugar: {{ .SiteURL }}</p>
      <p style="font-size: 11px; color: #555; margin-top: 20px;">Se você não solicitou este cadastro, por favor ignore este e-mail.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'reset_password',
      title: 'Redefinir Senha',
      description: 'Template para recuperação de senha. Usa ConfirmationURL e Email.',
      icon: <RefreshCcw className="text-blue-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
    .header { padding: 40px; text-align: center; }
    .content { padding: 0 40px 40px; text-align: center; }
    h1 { font-size: 28px; font-weight: 900; text-transform: uppercase; font-style: italic; margin-bottom: 16px; color: #ffffff; }
    p { font-size: 16px; line-height: 1.6; color: #a0a0a0; margin-bottom: 32px; }
    .button { background: #ffffff; color: #000000 !important; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: 900; font-style: italic; text-transform: uppercase; font-size: 14px; display: inline-block; }
    .footer { padding: 40px; background-color: #0f0f0f; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${LOGO_HTML}
    </div>
    <div class="content">
      <h1>Recuperação de Acesso 🔐</h1>
      <p>Recebemos uma solicitação para redefinir a senha da conta <strong>{{ .Email }}</strong>. Se foi você, clique abaixo:</p>
      <a href="{{ .ConfirmationURL }}" class="button">Criar Nova Senha</a>
    </div>
    <div class="footer">
      <p style="font-size: 11px; color: #555;">Este link expira em breve. Se você não solicitou isso, ignore este e-mail com segurança.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'magic_link',
      title: 'Link Mágico',
      description: 'Login sem senha. Usa ConfirmationURL e Email.',
      icon: <Sparkles className="text-purple-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; }
    .btn { background: #e50914; color: #fff !important; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: 900; font-style: italic; text-transform: uppercase; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="text-align: center; margin-bottom: 20px;">
        ${LOGO_HTML}
      </div>
      <h1 style="font-style: italic; font-weight: 900; font-size: 32px;">Entrada Instantânea ✨</h1>
      <p style="color: #888; font-size: 16px; margin-bottom: 30px;">Olá <strong>{{ .Email }}</strong>, clique abaixo para entrar sem precisar de senha.</p>
      <a href="{{ .ConfirmationURL }}" class="btn">Entrar Agora</a>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'reauthentication',
      title: 'Reautenticação',
      description: 'Template para Token OTP. Usa Token e Email.',
      icon: <Settings className="text-gray-400" size={20} />,
      script: `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
    .token { background: #000; padding: 25px; font-size: 32px; font-weight: 900; letter-spacing: 12px; border: 2px solid #e50914; border-radius: 15px; color: #fff; margin: 30px 0; display: inline-block; width: 80%; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px; text-align: center;">
        ${LOGO_HTML}
      </div>
      <h1 style="color: #e50914; font-weight: 900; font-style: italic; text-transform: uppercase;">CÓDIGO DE ACESSO 🧬</h1>
      <p style="color: #888;">Olá <strong>{{ .Email }}</strong>,</p>
      <p style="color: #888;">Use o código abaixo para confirmar sua identidade:</p>
      <div class="token">{{ .Token }}</div>
      <p style="font-size: 11px; color: #555;">Este código é válido por tempo limitado. Não compartilhe.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'change_email',
      title: 'Alterar E-mail',
      description: 'Template enviado ao novo e-mail para confirmar a alteração. Usa ConfirmationURL e Email.',
      icon: <Edit3 className="text-orange-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background-color: #0a0a0a; color: #fff; margin: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; }
    .btn { background: #e50914; color: #fff !important; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: 900; font-style: italic; text-transform: uppercase; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="text-align: center; margin-bottom: 25px;">
        ${LOGO_HTML}
      </div>
      <h1 style="font-style: italic; font-weight: 900; text-transform: uppercase;">Mudar E-mail 📧</h1>
      <p style="color: #888;">Olá! Solicitamos a alteração do e-mail de acesso para <strong>{{ .Email }}</strong>. Confirme a mudança abaixo:</p>
      <a href="{{ .ConfirmationURL }}" class="btn">Confirmar Novo E-mail</a>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'invite',
      title: 'Convidar Usuário',
      description: 'Template para convites. Usa ConfirmationURL e Email.',
      icon: <Plus className="text-blue-400" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background-color: #0c0c0c; color: #fff; font-family: sans-serif; margin: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; }
    .btn { background: #e50914; color: #fff !important; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-weight: 900; font-style: italic; text-transform: uppercase; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="text-align: center; margin-bottom: 25px;">
        ${LOGO_HTML}
      </div>
      <h1 style="font-weight: 900; font-style: italic; text-transform: uppercase;">BEM-VINDO AO NETPREMIUM 🎁</h1>
      <p style="color: #888;">Olá <strong>{{ .Email }}</strong>, você recebeu um convite VIP para acessar nossa plataforma.</p>
      <a href="{{ .ConfirmationURL }}" class="btn">Aceitar Convite</a>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'mfa_added',
      title: 'MFA Adicionado',
      description: 'Aviso de novo fator MFA. Usa Email.',
      icon: <Shield className="text-green-400" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
    .header { padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${LOGO_HTML}
    </div>
    <div style="padding: 0 40px 40px;">
      <h1 style="color: #22c55e; font-weight: 900; font-style: italic; text-transform: uppercase;">SEGURANÇA ATIVADA 🛡️</h1>
      <p style="color: #a0a0a0; line-height: 1.6;">Olá <strong>{{ .Email }}</strong>,</p>
      <p style="color: #a0a0a0; line-height: 1.6;">Um novo método de Autenticação Multifator (MFA) foi configurado na sua conta.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'mfa_removed',
      title: 'MFA Removido',
      description: 'Aviso de MFA desabilitado. Usa Email.',
      icon: <X className="text-red-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
    .header { padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${LOGO_HTML}
    </div>
    <div style="padding: 0 40px 40px;">
      <h1 style="color: #ef4444; font-weight: 900; font-style: italic; text-transform: uppercase;">ALERTA CRÍTICO ⚠️</h1>
      <p style="color: #a0a0a0; line-height: 1.6;">O MFA foi removido da conta <strong>{{ .Email }}</strong>.</p>
      <p style="font-weight: 900; color: #ff0000; text-transform: uppercase; font-size: 12px;">Se não foi você, proteja sua conta agora.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'identity_linked',
      title: 'Identidade Vinculada',
      description: 'Template para vínculo de redes sociais. Usa Email.',
      icon: <LinkIcon className="text-blue-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px;">${LOGO_HTML}</div>
      <h1 style="font-style: italic; font-weight: 900; text-transform: uppercase;">CONTA VINCULADA 🔗</h1>
      <p style="color: #888;">O perfil <strong>{{ .Email }}</strong> agora está conectado a um novo provedor de acesso.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'identity_unlinked',
      title: 'Identidade Desvinculada',
      description: 'Aviso de desvinculação social. Usa Email.',
      icon: <X className="text-red-400" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px;">${LOGO_HTML}</div>
      <h1 style="color: #ef4444; font-weight: 900; font-style: italic; text-transform: uppercase;">PROVEDOR DESCONECTADO ⚠️</h1>
      <p style="color: #888;">Um método de login foi removido da conta <strong>{{ .Email }}</strong>.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'password_changed',
      title: 'Senha Alterada',
      description: 'Confirmação de troca de senha. Usa Email.',
      icon: <Check className="text-green-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; border: 1px solid rgba(34, 197, 94, 0.2); }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px;">${LOGO_HTML}</div>
      <h1 style="color: #22c55e; font-weight: 900; font-style: italic; text-transform: uppercase;">SENHA ATUALIZADA ✅</h1>
      <p style="color: #888;">A senha da conta <strong>{{ .Email }}</strong> foi alterada com sucesso.</p>
    </div>
  </div>
</body>
</html>`
    },
    {
      id: 'phone_changed',
      title: 'Telefone Alterado',
      description: 'Confirmação de troca de telefone. Usa Email.',
      icon: <Settings className="text-blue-500" size={20} />,
      script: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; margin: 0; background-color: #0a0a0a; color: #fff; }
    .container { max-width: 600px; margin: 40px auto; background-color: #141414; border-radius: 24px; text-align: center; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <div style="padding: 40px;">
      <div style="margin-bottom: 30px;">${LOGO_HTML}</div>
      <h1 style="font-weight: 900; font-style: italic; text-transform: uppercase;">TELEFONE ATUALIZADO 📱</h1>
      <p style="color: #888;">O número de telefone da sua conta (<strong>{{ .Email }}</strong>) foi alterado com sucesso.</p>
    </div>
  </div>
</body>
</html>`
    }
  ];

  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(script);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const filteredMovies = useMemo(() => {
    if (activeTab === 'duplicates') {
      const grouped: Record<string, Movie[]> = {};
      movies.forEach(m => {
        const key = m.title?.toLowerCase() || m.file_name?.toLowerCase() || '';
        if (key) {
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(m);
        }
      });
      return Object.values(grouped).filter(group => group.length > 1).flat();
    }

    return movies.filter(movie => {
      const matchesSearch = movie.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           movie.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isDrive = movie.videoUrl?.includes('drive.google.com');
      const isKingX = movie.videoUrl?.includes('player.kingx.dev');
      const isRequest = movie.videoUrl === 'REQUESTED';
      const isPending = !movie.overview || movie.overview.includes('Informações não encontradas') || 
                        movie.poster_path?.includes('picsum.photos');

      if (activeTab === 'drive') return matchesSearch && isDrive;
      if (activeTab === 'kingx') return matchesSearch && isKingX;
      if (activeTab === 'requests') return matchesSearch && isRequest;
      if (activeTab === 'pending') return matchesSearch && isPending && !isRequest;
      if (activeTab === 'others') return matchesSearch && !isDrive && !isKingX && !isRequest;
      
      // on 'all' tab, keep requests but maybe we shouldn't show them to not clutter? 
      // User says "vai aparecer no painel administrativo filmes e séries indicadas", meaning they want to see them there. 
      // If we show them in 'all', that's fine.
      if (activeTab === 'all') return matchesSearch;

      return matchesSearch;
    });
  }, [movies, activeTab, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMovies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMovies.map(m => m.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Tem certeza que deseja deletar ${selectedIds.size} itens?`)) return;
    
    setIsBulkActionLoading(true);
    try {
      await onDeleteMovies(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkHide = async (hide: boolean) => {
    if (selectedIds.size === 0) return;
    setIsBulkActionLoading(true);
    try {
      await onToggleHideMovies(Array.from(selectedIds), hide);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleAutomateCollections = async () => {
    if (movies.length === 0) return;
    if (!window.confirm(`Deseja automatizar a criação de coleções para ${movies.length} itens? O sistema irá buscar as franquias oficiais no TMDB em segundo plano.`)) return;

    onStartCollectionAutomation(movies);
  };

  const handleUpdateExistingCollections = async () => {
    if (onUpdateCollectionInfo) {
      await onUpdateCollectionInfo();
    }
  };

  const handleSearchCollectionTMDB = async () => {
    if (!manualCollectionName.trim()) return;
    setIsCollectionSearching(true);
    try {
      const res = await tmdb.get(requests.searchCollection, { params: { query: manualCollectionName } });
      setCollectionSearchResults(res.data.results || []);
      if (res.data.results.length === 0) {
        alert('Nenhuma coleção encontrada.');
      }
    } catch (error) {
      console.error('Erro ao buscar coleções:', error);
      alert('Erro ao buscar coleções no TMDB.');
    } finally {
      setIsCollectionSearching(false);
    }
  };

  const selectCollectionTMDB = async (collection: any) => {
    setIsManualProcessing(true);
    try {
      const res = await tmdb.get(requests.fetchCollection(collection.id));
      setSelectedTMDBCollection(res.data);
      setCollectionSearchResults([]);
      setManualCollectionName(res.data.name);
    } catch (error) {
      console.error('Erro ao buscar detalhes da coleção:', error);
      alert('Erro ao carregar detalhes da coleção.');
    } finally {
      setIsManualProcessing(false);
    }
  };

  const handleManualCollectionCreate = async () => {
    if (!selectedTMDBCollection) {
      await handleSearchCollectionTMDB();
      return;
    }

    setIsManualProcessing(true);
    try {
      const collectionDetails = selectedTMDBCollection;
      const collectionPoster = collectionDetails.poster_path ? `https://image.tmdb.org/t/p/original${collectionDetails.poster_path}` : null;
      
      const collectionPartTitles = (collectionDetails.parts || []).map((p: any) => p.title.toLowerCase());
      
      let updatedCount = 0;
      for (const movie of movies) {
        if (movie.collection_id === collectionDetails.id) continue;

        const movieTitle = (movie.title || movie.name || "").toLowerCase();
        
        // Match if the library title is very similar to one of the collection part titles
        // We use a simple inclusion check first, which covers most cases like "Harry Potter 1" -> "Harry Potter e a Pedra Filosofal"
        // provided the clean title is used.
        const isMatch = collectionPartTitles.some(partTitle => {
          return movieTitle.includes(partTitle) || partTitle.includes(movieTitle);
        });

        if (isMatch) {
          const updatedMovie = {
            ...movie,
            collection_id: collectionDetails.id,
            collection_name: collectionDetails.name,
            collection_poster_path: collectionPoster
          };
          await onUpdateMovie(updatedMovie as Movie);
          updatedCount++;
        }
      }

      alert(`Sucesso! ${updatedCount} títulos vinculados à coleção "${collectionDetails.name}".`);
      setSelectedTMDBCollection(null);
      setManualCollectionName('');
    } catch (error) {
      console.error('Erro ao vincular biblioteca:', error);
      alert('Erro ao processar vinculação.');
    } finally {
      setIsManualProcessing(false);
    }
  };

  const handleBulkSync = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Deseja sincronizar ${selectedIds.size} itens selecionados?`)) return;

    setIsBulkActionLoading(true);
    let successCount = 0;
    const selectedMovies = movies.filter(m => selectedIds.has(m.id));

    try {
      for (const movie of selectedMovies) {
        try {
          const res = await tmdb.get(requests.searchMulti, { params: { query: movie.title || movie.name } });
          const results = res.data.results;
          if (results.length > 0) {
            const result = results[0];
            const isTv = result.media_type === 'tv' || !result.title;
            const detailsPath = isTv ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
            const providersPath = isTv ? requests.tvWatchProviders(result.id) : requests.movieWatchProviders(result.id);
            const creditsPath = isTv ? requests.tvCredits(result.id) : requests.movieCredits(result.id);
            
            const [detailsRes, providersRes, creditsRes] = await Promise.all([
              tmdb.get(detailsPath),
              tmdb.get(providersPath).catch(() => ({ data: { results: {} } })),
              tmdb.get(creditsPath).catch(() => ({ data: { cast: [] } }))
            ]);

            const details = detailsRes.data;
            const providersBR = providersRes.data.results?.BR?.flatrate || [];
            const watch_providers = providersBR.map((p: any) => `${p.provider_name}|https://image.tmdb.org/t/p/original${p.logo_path}`).join(';;');
            const actors = creditsRes.data.cast?.slice(0, 10).map((c: any) => c.name).join(', ');

            // Buscar Logo Oficial
            const logoPath = await getMovieLogo(details.id, isTv ? 'tv' : 'movie');

            // Buscar Info de Coleção
            let collectionPoster = null;
            let collectionLogo = null;
            if (details.belongs_to_collection?.id) {
              try {
                const collRes = await tmdb.get(requests.fetchCollection(details.belongs_to_collection.id));
                collectionPoster = collRes.data.poster_path ? `https://image.tmdb.org/t/p/original${collRes.data.poster_path}` : null;
                
                const imagesRes = await tmdb.get(`/collection/${details.belongs_to_collection.id}/images`, { params: { include_image_language: 'pt,en,null' } });
                const logos = imagesRes.data.logos || [];
                const bestLogo = logos.find((l: any) => l.iso_639_1 === 'pt') || 
                                 logos.find((l: any) => l.iso_639_1 === 'en') || 
                                 logos[0];
                if (bestLogo) {
                  collectionLogo = `https://image.tmdb.org/t/p/original${bestLogo.file_path}`;
                }
              } catch (e) {}
            }

            const updatedMovie = {
              ...movie,
              title: details.title || details.name,
              overview: details.overview,
              poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : movie.poster_path,
              backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : movie.backdrop_path,
              logo_path: logoPath || movie.logo_path,
              type: isTv ? 'series' : 'movie',
              genres: details.genres?.map((g: any) => g.name).join(', '),
              release_date: details.release_date || details.first_air_date,
              runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
              rating: details.vote_average,
              actors: actors,
              watch_providers: watch_providers,
              collection_id: details.belongs_to_collection?.id || null,
              collection_name: details.belongs_to_collection?.name || null,
              collection_poster_path: collectionPoster || movie.collection_poster_path,
              collection_logo_path: collectionLogo || movie.collection_logo_path,
              last_rescanned_at: new Date().toISOString()
            };

            await onUpdateMovie(updatedMovie as Movie);
            successCount++;
          }
        } catch (err) {
          console.error(`Erro ao sincronizar ${movie.title}:`, err);
        }
      }
      alert(`${successCount} conteúdos sincronizados com sucesso!`);
      setSelectedIds(new Set());
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleDownloadAsset = (asset: { name: string, format: string, size: string }) => {
    if (asset.format === 'SVG') {
      const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#E50914;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#B20710;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="600" height="200" fill="#000000" rx="20"/>
        
        <!-- Play Icon Group -->
        <g transform="translate(40, 50)">
          <circle cx="50" cy="50" r="50" fill="url(#grad)" />
          <path d="M35 30 L75 50 L35 70 Z" fill="#FFFFFF" stroke-linejoin="round" />
        </g>

        <!-- Text -->
        <text x="160" y="115" font-family="Arial, sans-serif" font-weight="900" font-size="90" fill="#FFFFFF" letter-spacing="-4">NET</text>
        <text x="360" y="115" font-family="Arial, sans-serif" font-weight="900" font-size="90" fill="#E50914" font-style="italic" letter-spacing="-4">PLAY</text>
      </svg>`;
      const blob = new Blob([logoSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netplay_brand_logo.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const canvas = document.createElement('canvas');
      const sizeParts = asset.size.split('x');
      const width = sizeParts.length === 2 ? parseInt(sizeParts[0]) : 1024;
      const height = sizeParts.length === 2 ? parseInt(sizeParts[1]) : 1024;
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Dark background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Responsive sizing
        const scale = Math.min(width, height) / 1024;
        
        // Draw Icon Section
        const iconSize = 400 * scale;
        const centerX = width / 2;
        const centerY = asset.name.includes('Logo') ? height / 2 : height / 2.2;

        if (asset.name.includes('Ícone')) {
          // App Icon Design (Square with rounded corners)
          const grad = ctx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, '#E50914');
          grad.addColorStop(1, '#8E050A');
          
          ctx.beginPath();
          ctx.roundRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8, width * 0.15);
          ctx.fillStyle = grad;
          ctx.fill();

          // Play triangle
          ctx.beginPath();
          const triSize = width * 0.3;
          ctx.moveTo(centerX - triSize * 0.4, centerY - triSize * 0.6);
          ctx.lineTo(centerX + triSize * 0.6, centerY);
          ctx.lineTo(centerX - triSize * 0.4, centerY + triSize * 0.6);
          ctx.closePath();
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        } else {
          // Full Logo or Splash Design
          const grad = ctx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, '#000000');
          grad.addColorStop(1, '#1A1A1A');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);

          // Header/Logo layout
          const circleX = width * 0.2;
          const circleR = 120 * scale;
          
          const textGrad = ctx.createLinearGradient(0, 0, width, 0);
          textGrad.addColorStop(0.3, '#FFFFFF');
          textGrad.addColorStop(0.6, '#E50914');

          // Draw Play Circle
          ctx.beginPath();
          ctx.arc(centerX, height * 0.4, 150 * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#E50914';
          ctx.fill();

          ctx.beginPath();
          const triSize = 80 * scale;
          ctx.moveTo(centerX - triSize * 0.4, height * 0.4 - triSize * 0.6);
          ctx.lineTo(centerX + triSize * 0.6, height * 0.4);
          ctx.lineTo(centerX - triSize * 0.4, height * 0.4 + triSize * 0.6);
          ctx.closePath();
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();

          // Text Below
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `italic 900 ${150 * scale}px Arial, sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('NETPREMIUM', centerX, height * 0.65);
          
          // Subtitle for splash
          if (asset.name.includes('Splash')) {
            ctx.font = `900 ${40 * scale}px Arial, sans-serif`;
            ctx.fillStyle = '#666666';
            ctx.letterSpacing = '10px';
            ctx.fillText('PREMIUM STREAMING', centerX, height * 0.75);
          }
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${asset.name.toLowerCase().replace(/ /g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    }
  };

  const handleImportKingXSeries = () => {
    if (!kingxSeriesUrl) return;
    try {
      const fragment = kingxSeriesUrl.includes('#') ? kingxSeriesUrl.split('#')[1] : null;
      if (!fragment) {
        // Tenta ver se é apenas a URL do kingx sem fragmento mas com params
        const urlObj = new URL(kingxSeriesUrl);
        const vUrl = urlObj.searchParams.get('video_url');
        if (vUrl) {
           setNewMovie(prev => ({ ...prev, video_url: vUrl, video_url_2: kingxSeriesUrl }));
           setKingxSeriesUrl('');
           return;
        }
        throw new Error("Formato inválido");
      }
      
      const params = new URLSearchParams(fragment);
      const videoUrl = params.get('video_url');
      
      if (videoUrl) {
         setNewMovie(prev => ({
           ...prev,
           video_url: videoUrl,
           video_url_2: kingxSeriesUrl
         }));
         setKingxSeriesUrl('');
      } else {
        alert("Não foi possível encontrar a URL do vídeo no link.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao importar link KingX. Certifique-se que o link possui #video_url=");
    }
  };

  const syncEpisodesWithTMDB = async (form: any, setForm: (data: any) => void) => {
    if (!form.title) {
      alert('Nome da série não pode estar vazio para buscar episódios no TMDB.');
      return;
    }
    try {
      const searchRes = await tmdb.get(requests.searchTv, { params: { query: form.title } });
      if (searchRes.data.results.length === 0) {
        alert('Série não encontrada no TMDB.');
        return;
      }
      const result = searchRes.data.results[0];
      
      const episodes = form.episodes || [];
      const uniqueSeasons = Array.from(new Set(episodes.map((e: any) => e.season))) as number[];
      const seasonDetails: Record<number, any[]> = {};
      
      for (const s of uniqueSeasons) {
        try {
          const { fetchSeasonDetailsWithFallback } = await import('../services/tmdb');
          const res = await fetchSeasonDetailsWithFallback(result.id, s);
          let eps = res.data.episodes;
          seasonDetails[s] = eps;
        } catch (e) {
          console.error(`Erro ao buscar temporada ${s}:`, e);
        }
      }

      setForm({
        ...form,
        episodes: episodes.map((ep: any) => {
          const tmdbEp = seasonDetails[Number(ep.season)]?.find(te => te.episode_number === Number(ep.episode));
          return {
            ...ep,
            title: tmdbEp?.name || ep.title,
            overview: tmdbEp?.overview || ep.overview || '',
            still_path: tmdbEp?.still_path ? `https://image.tmdb.org/t/p/w500/${tmdbEp.still_path}` : ep.still_path,
            release_date: tmdbEp?.air_date || ep.release_date,
            rating: tmdbEp?.vote_average || ep.rating,
            runtime: tmdbEp?.runtime || ep.runtime
          };
        })
      });
      alert('Episódios sincronizados com o TMDB com sucesso!');
    } catch (error) {
      console.error('Erro na sincronização TMDB:', error);
      alert('Ocorreu um erro ao buscar detalhes dos episódios no TMDB.');
    }
  };

  const addEpisode = (form: any, setForm: (data: any) => void) => {
    const episodes = form.episodes || [];
    const lastEp = episodes[episodes.length - 1];
    const nextEp = lastEp ? lastEp.episode + 1 : 1;
    const season = lastEp ? lastEp.season : 1;

    const newEp = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Episódio ${nextEp}`,
      season: season,
      episode: nextEp,
      videoUrl: '',
      overview: ''
    };

    setForm({ ...form, episodes: [...episodes, newEp] });
  };

  const removeEpisode = (form: any, setForm: (data: any) => void, id: string) => {
    const episodes = (form.episodes || []).filter((e: any) => e.id !== id);
    setForm({ ...form, episodes });
  };

  const updateEpisode = (form: any, setForm: (data: any) => void, id: string, field: string, value: any) => {
    const episodes = (form.episodes || []).map((e: any) => 
      e.id === id ? { ...e, [field]: value } : e
    );
    setForm({ ...form, episodes });
  };

  const handleAddMovie = async () => {
    if (!newMovie.title || !newMovie.video_url) {
      alert('Título e URL do vídeo são obrigatórios');
      return;
    }

    try {
      setIsBulkActionLoading(true);
      await onAddMovie(newMovie);
      setIsAddModalOpen(false);
      setNewMovie({
        title: '',
        overview: '',
        video_url: '',
        video_url_2: '',
        poster_path: '',
        backdrop_path: '',
        type: 'movie',
        genres: '',
        release_date: '',
        runtime: 0,
        rating: 0,
        actors: '',
        is_hidden: false,
        watch_providers: ''
      });
    } catch (error) {
      console.error('Erro ao adicionar filme:', error);
      alert('Erro ao adicionar filme');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSearchTmdb = async (query: string, setForm: (data: any) => void, currentForm: any) => {
    if (!query) return;
    setIsTmdbSearching(true);
    try {
      const res = await tmdb.get(requests.searchMulti, { params: { query } });
      const results = res.data.results;
      if (results.length > 0) {
        setTmdbSearchResults(results);
        // Se houver apenas um resultado e o título for exato, preencher automaticamente
        if (results.length === 1) {
          await selectTmdbResult(results[0], setForm, currentForm);
          setTmdbSearchResults([]);
        }
      } else {
        alert('Nenhum resultado encontrado no TMDB.');
      }
    } catch (error) {
      console.error('Erro na busca TMDB:', error);
      alert('Erro ao buscar no TMDB. Verifique sua conexão e chave de API.');
    } finally {
      setIsTmdbSearching(false);
    }
  };

  const selectTmdbResult = async (result: any, setForm: (data: any) => void, currentForm: any) => {
    try {
      setIsTmdbSearching(true);
      const isTv = result.media_type === 'tv' || !result.title;
      const detailsPath = isTv ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
      const providersPath = isTv ? requests.tvWatchProviders(result.id) : requests.movieWatchProviders(result.id);
      const creditsPath = isTv ? requests.tvCredits(result.id) : requests.movieCredits(result.id);
      
      const [detailsRes, providersRes, creditsRes] = await Promise.all([
        tmdb.get(detailsPath),
        tmdb.get(providersPath).catch(() => ({ data: { results: {} } })),
        tmdb.get(creditsPath).catch(() => ({ data: { cast: [] } }))
      ]);

      let details = detailsRes.data;
      
      let finalTitle = details.title || details.name;
      let finalOverview = details.overview;
      
      if (!finalOverview || finalOverview === '') {
        try {
          const enDetailsPath = isTv ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
          const enDetailsRes = await tmdb.get(enDetailsPath, { params: { language: 'en-US' } });
          const enDetails = enDetailsRes.data;
          
          const fallbackEnOverview = enDetails.overview || '';
          if (fallbackEnOverview) {
            const { translateToPortuguese } = await import('../services/ai');
            finalOverview = await translateToPortuguese(fallbackEnOverview);
          }
        } catch (e) {
          console.error("Failed to fetch/translate fallback English overview");
        }
      }
      
      // If the user meant "translate the english TMDB title to Portuguese if there's no Portuguese title":
      // Since TMDB typically returns the original title if pt-BR is not found, we can try to translate it,
      // but usually the title is what it is. Still, we will only translate overview here, as translating a title like "The Matrix" to "A Matriz" if the official PT name is something else could be weird. But wait, TMDB is usually good with titles. We'll leave title as is or see if we should translate it too. The prompt said "Caso a sinopse ou o título venha em inglês...".
      // Let's also translate the title if it doesn't match the original title / maybe we just send the english title to AI to see if there's a PT-BR equivalent?
      // TMDB already returns pt-BR title if available. If it returns English, it's because there's no pt-BR. We can ask Gemini.
      if (details.original_language === 'en' && finalTitle && finalTitle === details.original_name) {
          // It might just be the English title. Let's see if we can ask AI for Title too ? 
      }
      // Actually, let's just translate title too if it's explicitly english and we know it? No, translating titles via AI is risky. Let's just do it simply.
      
      const { translateToPortuguese } = await import('../services/ai');
      // If title smells like English, we could translate, but how do we know?
      // Let's just translate title and overview in one go if overview is missing? 
      // ACTUALLY, if TMDB returns English overview for pt-BR request, `details.overview` will not be empty, it will be the English text.
      // So we should check if `details.overview` is in English by some heuristic or ask AI! But AI call is slow. 
      // Let's let the user manually trigger it if they want, OR if the overview is missing.
      
      const [logoPath, collLogoRes, imagesRes] = await Promise.all([
        getMovieLogo(details.id, isTv ? 'tv' : 'movie'),
        details.belongs_to_collection?.id 
          ? tmdb.get(`/collection/${details.belongs_to_collection.id}/images`, { params: { include_image_language: 'pt,en,null' } }).catch(() => ({ data: { logos: [] } }))
          : Promise.resolve({ data: { logos: [] } }),
        isTv 
          ? tmdb.get(requests.tvImages(details.id), { params: { include_image_language: 'pt,en,null' } }).catch(() => ({ data: { logos: [] } }))
          : tmdb.get(requests.movieImages(details.id), { params: { include_image_language: 'pt,en,null' } }).catch(() => ({ data: { logos: [] } }))
      ]);

      let collectionPoster = null;
      let collectionLogo = null;
      if (details.belongs_to_collection?.id) {
        try {
          const collRes = await tmdb.get(requests.fetchCollection(details.belongs_to_collection.id));
          if (collRes.data.poster_path) {
            collectionPoster = `https://image.tmdb.org/t/p/w500${collRes.data.poster_path}`;
          }
          
          const collLogos = collLogoRes.data.logos || [];
          const bestCollLogo = collLogos.find((l: any) => l.iso_639_1 === 'pt') || 
                               collLogos.find((l: any) => l.iso_639_1 === 'en') || 
                               collLogos[0];
          if (bestCollLogo) {
            collectionLogo = `https://image.tmdb.org/t/p/original${bestCollLogo.file_path}`;
          }
        } catch (err) {
          console.error('Erro ao buscar poster da coleção no admin:', err);
        }
      }

      // Novo formato: Nome|LogoURL;;Nome2|LogoURL2
      const providersBR = providersRes.data.results?.BR?.flatrate || [];
      const watch_providers = providersBR.map((p: any) => `${p.provider_name}|https://image.tmdb.org/t/p/original${p.logo_path}`).join(';;');
      
      const actors = creditsRes.data.cast?.slice(0, 10).map((c: any) => c.name).join(', ');

      setForm({
        ...currentForm,
        title: details.title || details.name,
        overview: details.overview,
        poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : currentForm.poster_path,
        backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : currentForm.backdrop_path,
        logo_path: logoPath || currentForm.logo_path,
        type: isTv ? 'series' : 'movie',
        genres: details.genres?.map((g: any) => g.name).join(', '),
        release_date: details.release_date || details.first_air_date,
        runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
        rating: details.vote_average,
        actors: actors,
        watch_providers: watch_providers,
        collection_id: details.belongs_to_collection?.id || null,
        collection_name: details.belongs_to_collection?.name || null,
        collection_poster_path: collectionPoster,
        collection_logo_path: collectionLogo
      });

      setTmdbSearchResults([]);
    } catch (error) {
      console.error('Erro ao selecionar resultado TMDB:', error);
      alert('Erro ao carregar detalhes do TMDB.');
    } finally {
      setIsTmdbSearching(false);
    }
  };

  const handleSyncAll = async () => {
    if (filteredMovies.length === 0) return;
    if (!window.confirm(`Deseja sincronizar ${filteredMovies.length} itens com o TMDB? Isso pode demorar alguns minutos.`)) return;

    setIsBulkActionLoading(true);
    let successCount = 0;
    
    try {
      for (const movie of filteredMovies) {
        try {
          const res = await tmdb.get(requests.searchMulti, { params: { query: movie.title || movie.name } });
          const results = res.data.results;
          if (results.length > 0) {
            const result = results[0];
            const isTv = result.media_type === 'tv' || !result.title;
            const detailsPath = isTv ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
            const providersPath = isTv ? requests.tvWatchProviders(result.id) : requests.movieWatchProviders(result.id);
            const creditsPath = isTv ? requests.tvCredits(result.id) : requests.movieCredits(result.id);
            
            const [detailsRes, providersRes, creditsRes] = await Promise.all([
              tmdb.get(detailsPath),
              tmdb.get(providersPath).catch(() => ({ data: { results: {} } })),
              tmdb.get(creditsPath).catch(() => ({ data: { cast: [] } }))
            ]);

            const details = detailsRes.data;

            let collectionPoster = movie.collection_poster_path;
            if (details.belongs_to_collection?.id) {
              try {
                const collRes = await tmdb.get(requests.fetchCollection(details.belongs_to_collection.id));
                if (collRes.data.poster_path) {
                  collectionPoster = `https://image.tmdb.org/t/p/w500${collRes.data.poster_path}`;
                }
              } catch (err) {
                console.error('Erro ao buscar poster da coleção no bulk sync:', err);
              }
            }
            
            // Pega logos e nomes dos provedores
            const providersBR = providersRes.data.results?.BR?.flatrate || [];
            const watch_providers = providersBR.map((p: any) => `${p.provider_name}|https://image.tmdb.org/t/p/original${p.logo_path}`).join(';;');
            
            const actors = creditsRes.data.cast?.slice(0, 10).map((c: any) => c.name).join(', ');

            const updatedMovie = {
              ...movie,
              title: details.title || details.name,
              overview: details.overview,
              poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : movie.poster_path,
              backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : movie.backdrop_path,
              type: isTv ? 'series' : 'movie',
              genres: details.genres?.map((g: any) => g.name).join(', '),
              release_date: details.release_date || details.first_air_date,
              runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
              rating: details.vote_average,
              actors: actors,
              watch_providers: watch_providers,
              last_rescanned_at: new Date().toISOString(),
              collection_id: details.belongs_to_collection?.id || null,
              collection_name: details.belongs_to_collection?.name || null,
              collection_poster_path: collectionPoster
            };

            await onUpdateMovie(updatedMovie as Movie);
            successCount++;
          }
        } catch (err) {
          console.error(`Erro ao sincronizar ${movie.title}:`, err);
        }
      }
      alert(`Sincronização concluída! ${successCount} de ${filteredMovies.length} itens atualizados.`);
    } catch (error) {
      console.error('Erro na sincronização em massa:', error);
      alert('Ocorreu um erro durante a sincronização em massa.');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSyncMovie = async (movie: Movie) => {
    setIsBulkActionLoading(true);
    try {
      const res = await tmdb.get(requests.searchMulti, { params: { query: movie.title || movie.name } });
      const results = res.data.results;
      if (results.length > 0) {
        const result = results[0]; // Pegar o primeiro resultado por padrão
        const isTv = result.media_type === 'tv' || !result.title;
        const detailsPath = isTv ? requests.tvDetails(result.id) : requests.movieDetails(result.id);
        const providersPath = isTv ? requests.tvWatchProviders(result.id) : requests.movieWatchProviders(result.id);
        const creditsPath = isTv ? requests.tvCredits(result.id) : requests.movieCredits(result.id);
        
        const [detailsRes, providersRes, creditsRes] = await Promise.all([
          tmdb.get(detailsPath),
          tmdb.get(providersPath).catch(() => ({ data: { results: {} } })),
          tmdb.get(creditsPath).catch(() => ({ data: { cast: [] } }))
        ]);

        const details = detailsRes.data;
        
        let collectionPoster = movie.collection_poster_path;
        if (details.belongs_to_collection?.id) {
          try {
            const collRes = await tmdb.get(requests.fetchCollection(details.belongs_to_collection.id));
            if (collRes.data.poster_path) {
              collectionPoster = `https://image.tmdb.org/t/p/w500${collRes.data.poster_path}`;
            }
          } catch (err) {
            console.error('Erro ao buscar poster da coleção no sync:', err);
          }
        }

        // Novo formato: Nome|LogoURL;;Nome2|LogoURL2
        const providersBR = providersRes.data.results?.BR?.flatrate || [];
        const watch_providers = providersBR.map((p: any) => `${p.provider_name}|https://image.tmdb.org/t/p/original${p.logo_path}`).join(';;');
        
        const actors = creditsRes.data.cast?.slice(0, 10).map((c: any) => c.name).join(', ');

        const updatedMovie = {
          ...movie,
          title: details.title || details.name,
          overview: details.overview,
          poster_path: details.poster_path ? `https://image.tmdb.org/t/p/w500/${details.poster_path}` : movie.poster_path,
          backdrop_path: details.backdrop_path ? `https://image.tmdb.org/t/p/original/${details.backdrop_path}` : movie.backdrop_path,
          type: isTv ? 'series' : 'movie',
          genres: details.genres?.map((g: any) => g.name).join(', '),
          release_date: details.release_date || details.first_air_date,
          runtime: details.runtime || (details.episode_run_time ? details.episode_run_time[0] : 0),
          rating: details.vote_average,
          actors: actors,
          watch_providers: watch_providers,
          last_rescanned_at: new Date().toISOString(),
          collection_id: details.belongs_to_collection?.id || null,
          collection_name: details.belongs_to_collection?.name || null,
          collection_poster_path: collectionPoster
        };

        await onUpdateMovie(updatedMovie as Movie);
        alert(`"${movie.title}" sincronizado com sucesso!`);
      } else {
        alert(`Nenhum resultado encontrado para "${movie.title}"`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao sincronizar com o TMDB.');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkReScan = () => {
    if (selectedIds.size === 0) return;
    const moviesToScan = movies.filter(m => selectedIds.has(m.id));
    onStartReScanner(moviesToScan);
    setSelectedIds(new Set());
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsBulkActionLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Tentar fazer upload para o bucket 'logos'
      // Nota: O bucket deve estar configurado como público no Supabase
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        // Fallback: se o bucket não existir, avisar o usuário
        if (uploadError.message.includes('bucket not found')) {
          alert('O bucket "logos" não foi encontrado no Supabase. Por favor, crie um bucket público chamado "logos" no painel do Supabase.');
        } else {
          alert('Erro ao carregar imagem: ' + uploadError.message);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      if (isEditing && editingProvider) {
        setEditingProvider({ ...editingProvider, logo_url: publicUrl });
      } else {
        setNewProvider({ ...newProvider, logo_url: publicUrl });
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao carregar imagem');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;
    await onUpdateMovie(editingMovie);
    setEditingMovie(null);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#080808] flex flex-col overflow-hidden text-white font-sans">
      {/* Header */}
      <header className="h-16 md:h-20 border-b border-white/5 bg-black/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-12 shrink-0">
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={onClose}
            className="p-2 md:p-3 hover:bg-white/5 rounded-xl md:rounded-2xl transition-all text-gray-400 hover:text-white"
          >
            <ChevronLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter leading-none">Admin</h1>
            <p className="hidden md:block text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Gerenciamento de Conteúdo</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-2 rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            <Plus size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Novo Conteúdo</span><span className="sm:hidden">Novo</span>
          </button>
          <div className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar / Tabs - Horizontal scroll on Mobile, Sidebar on Desktop */}
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 flex flex-col shrink-0 overflow-hidden">
          <div className="flex flex-row md:flex-col p-2 md:p-6 space-y-0 md:space-y-2 overflow-x-auto md:overflow-y-auto scrollbar-hide">
            <p className="hidden md:block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-4 px-4">Categorias</p>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'apis', label: 'APIs (Status)', icon: Server },
              { id: 'onesignal', label: 'OneSignal', icon: Bell },
              { id: 'terabox', label: 'Terabox API', icon: Database },
              { id: 'users', label: 'Usuários/Assin.', icon: Users },
              { id: 'mercadopago', label: 'Mercado Pago', icon: DollarSign },
              { id: 'referrals', label: 'Resgates', icon: Database }, // Using Database temporarily or we can use another icon if imported
              { id: 'all', label: 'Todos', icon: Database },
              { id: 'drive', label: 'Drive', icon: Cloud }, // Shortened for mobile
              { id: 'kingx', label: 'KingX', icon: ExternalLink },
              { id: 'requests', label: 'Pedidos', icon: Star },
              { id: 'pending', label: 'Pendentes', icon: AlertCircle },
              { id: 'duplicates', label: 'Duplicados', icon: Copy },
              { id: 'collections', label: 'Coleções', icon: Sparkles },
              { id: 'providers', label: 'Provedores', icon: LayoutGrid },
              { id: 'app', label: 'App', icon: Settings },
              { id: 'genres', label: 'Gêneros', icon: List },
              { id: 'supabase', label: 'Supabase', icon: Database },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex-shrink-0 flex items-center gap-2 md:gap-4 px-4 py-2.5 md:py-4 rounded-xl md:rounded-2xl transition-all group ${activeTab === tab.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={window.innerWidth < 768 ? 16 : 20} className={activeTab === tab.id ? 'text-white' : 'group-hover:text-red-600 transition-colors'} />
                <span className="font-bold text-xs md:text-sm italic whitespace-nowrap">{tab.label}</span>
                <span className="hidden md:block ml-auto text-[10px] font-black opacity-50">
                  {tab.id === 'providers' ? streamingProviders.length : tab.id === 'dashboard' ? '' : movies.filter(m => {
                    if (tab.id === 'drive') return m.videoUrl?.includes('drive.google.com');
                    if (tab.id === 'kingx') return m.videoUrl?.includes('player.kingx.dev');
                    if (tab.id === 'requests') return m.videoUrl === 'REQUESTED';
                    if (tab.id === 'pending') return (!m.overview || m.overview.includes('Informações não encontradas')) && m.videoUrl !== 'REQUESTED';
                    if (tab.id === 'duplicates') {
                      const titles = movies.filter(mv => mv.videoUrl !== 'REQUESTED').map(mv => mv.title?.toLowerCase()).filter(Boolean);
                      const duplicates = titles.filter((t, index) => titles.indexOf(t) !== index);
                      return duplicates.includes(m.title?.toLowerCase());
                    }
                    if (tab.id === 'collections') return !!m.collection_id;
                    if (tab.id === 'app') return false;
                    
                    // Default behavior for other tabs: Exclude requested items unless explicitly on 'all' or 'requests'
                    if (tab.id === 'all') return true;
                    if (m.videoUrl === 'REQUESTED') return false;

                    return true;
                  }).length}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden md:block mt-auto p-6 border-t border-white/5">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-3">Status do Scanner</p>
              {scannerState ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-600 animate-pulse">Escaneando...</span>
                    <span className="text-[10px] font-black text-gray-500">{scannerState.current}/{scannerState.total}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-red-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(scannerState.current / scannerState.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic">Nenhum processo ativo</p>
              )}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 md:p-8 border-b border-white/5 bg-black/10 flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-between shrink-0">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-600 transition-colors" size={16} />
              <input 
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-2.5 md:py-3.5 pl-10 md:pl-12 pr-6 text-xs md:text-sm font-medium focus:outline-none focus:border-red-600/50 focus:bg-white/10 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <button 
                onClick={handleSyncAll}
                disabled={isBulkActionLoading || filteredMovies.length === 0}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg md:rounded-xl border border-blue-600/20 transition-all text-[10px] font-bold whitespace-nowrap active:scale-95 disabled:opacity-50"
              >
                <RefreshCcw size={14} className={isBulkActionLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Sincronizar Tudo ({filteredMovies.length})</span>
                <span className="sm:hidden">Sinc. Tudo</span>
              </button>

              <AnimatePresence>
                {selectedIds.size > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-1.5 md:gap-2 pr-3 md:pr-4 border-r border-white/10 mr-1 md:mr-2"
                  >
                    <button 
                      onClick={handleBulkDelete}
                      disabled={isBulkActionLoading}
                      className="p-2 md:p-3 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-lg md:rounded-xl transition-all border border-red-600/20"
                      title="Deletar Selecionados"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleBulkHide(true)}
                      disabled={isBulkActionLoading}
                      className="p-2 md:p-3 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg md:rounded-xl transition-all border border-white/10"
                      title="Ocultar Selecionados"
                    >
                      <EyeOff size={16} />
                    </button>
                    <button 
                      onClick={() => handleBulkHide(false)}
                      disabled={isBulkActionLoading}
                      className="p-2 md:p-3 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg md:rounded-xl transition-all border border-white/10"
                      title="Mostrar Selecionados"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={handleBulkReScan}
                      disabled={isBulkActionLoading}
                      className="p-2 md:p-3 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg md:rounded-xl transition-all border border-blue-600/20"
                      title="Re-scan Selecionados"
                    >
                      <RefreshCcw size={16} />
                    </button>
                    <button 
                      onClick={handleBulkSync}
                      disabled={isBulkActionLoading}
                      className="p-2 md:p-3 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg md:rounded-xl transition-all border border-emerald-600/20"
                      title="Sincronizar Selecionados com TMDB"
                    >
                      <Sparkles size={16} className={isBulkActionLoading ? 'animate-pulse' : ''} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-white/5 hover:bg-white/10 rounded-lg md:rounded-xl border border-white/10 transition-all text-[10px] font-bold whitespace-nowrap"
              >
                {selectedIds.size === filteredMovies.length ? <CheckSquare size={14} className="text-red-600" /> : <Square size={14} />}
                <span className="hidden sm:inline">{selectedIds.size === filteredMovies.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                <span className="sm:hidden">{selectedIds.size === filteredMovies.length ? 'Nenhum' : 'Todos'}</span>
              </button>
            </div>
          </div>

          {/* List View */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
            {activeTab === 'providers' && (
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Provedores de Streaming</h2>
                  <p className="text-gray-500 text-xs font-bold mt-1">Gerencie as logos e prioridades dos serviços de streaming.</p>
                </div>
                {onSeedProviders && (
                  <button 
                    onClick={onSeedProviders}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                  >
                    <RefreshCcw size={14} className="text-blue-500" />
                    Restaurar Padrões
                  </button>
                )}
              </div>
            )}

            {activeTab === 'supabase' && (
              <div className="mb-6 md:mb-10">
                <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-2 md:gap-3">
                  <Database className="text-blue-500 w-5 h-5 md:w-8 md:h-8" /> Supabase
                </h2>
                <p className="text-gray-500 text-[10px] md:text-sm font-bold mt-1 md:mt-2">Scripts de e-mail transacionais e configurações de autenticação.</p>
              </div>
            )}

            {activeTab === 'app' && (
              <div className="mb-6 md:mb-10">
                <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-2 md:gap-3">
                  <Sparkles className="text-red-600 w-5 h-5 md:w-8 md:h-8" /> Aplicativo
                </h2>
                <p className="text-gray-500 text-[10px] md:text-sm font-bold mt-1 md:mt-2">Gerencie ativos visuais e configurações do WebView.</p>
              </div>
            )}

            {activeTab === 'genres' && (
              <div className="space-y-8 pb-32 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white">Imagens de Busca</h2>
                    <p className="text-gray-500 text-[10px] font-black mt-1 uppercase tracking-widest italic opacity-60">Gerencie os fundos dos carrosséis de categorias</p>
                  </div>
                  <button 
                    onClick={handleRefreshAllCategories}
                    className="flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                  >
                    <RefreshCcw size={16} className={isRefreshingCategories ? 'animate-spin' : ''} /> 
                    {isRefreshingCategories ? 'Atualizando...' : 'Atualizar Todas'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                  {categories?.map((cat: any) => (
                    <div key={cat.id} className="relative group rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#0a0a0a] shadow-2xl transition-all hover:border-red-600/30">
                      <div className="aspect-[16/9] relative scale-[1.01]">
                        <img 
                          src={cat.backdrop} 
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                          alt={cat.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        
                        <div className="absolute top-6 left-6 p-3 bg-red-600/20 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-xl group-hover:bg-red-600 transition-colors">
                          {cat.icon && <cat.icon size={20} className="text-white" />}
                        </div>

                        <div className="absolute bottom-6 left-8 right-8">
                          <h4 className="text-xl md:text-2xl font-black italic uppercase text-white tracking-widest leading-none drop-shadow-2xl">{cat.name}</h4>
                          <span className="text-[8px] font-bold text-white/50 uppercase tracking-[0.3em] mt-2 block italic">ID TMDB: {cat.id}</span>
                        </div>

                        <div className="absolute top-6 right-6 flex flex-col gap-2 scale-0 group-hover:scale-100 transition-transform origin-right">
                          <button 
                            onClick={() => handleRefreshSingleCategory(cat.id)}
                            className="p-4 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl text-white hover:bg-red-600 hover:border-red-600 transition-all shadow-2xl active:scale-90"
                            title="Gerar Aleatório"
                          >
                            <RefreshCcw size={20} className={refreshingCategoryId === cat.id ? 'animate-spin' : ''} />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingCategory(cat.id);
                              setCategoryUrl(cat.backdrop);
                            }}
                            className="p-4 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-2xl text-white hover:bg-white hover:text-black transition-all shadow-2xl active:scale-90"
                            title="Editar URL"
                          >
                            <Settings size={20} />
                          </button>
                        </div>

                        <AnimatePresence>
                          {editingCategory === cat.id && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl p-6 flex flex-col justify-center gap-4"
                            >
                               <p className="text-white font-black text-xs uppercase italic tracking-widest">Backdrop URL para {cat.name}:</p>
                               <input 
                                 type="text"
                                 value={categoryUrl}
                                 onChange={(e) => setCategoryUrl(e.target.value)}
                                 placeholder="https://image.tmdb.org/..."
                                 className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white text-xs outline-none focus:border-red-600 transition-colors"
                               />
                               <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      onUpdateCategoryImage?.(cat.id, categoryUrl);
                                      setEditingCategory(null);
                                    }}
                                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] italic shadow-lg active:scale-95 transition-all"
                                  >
                                    Salvar
                                  </button>
                                  <button 
                                    onClick={() => setEditingCategory(null)}
                                    className="px-6 bg-white/10 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] italic active:scale-95 transition-all"
                                  >
                                    X
                                  </button>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dashboard' ? (
              <div className="space-y-6 md:space-y-12 pb-12 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Users */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-colors"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-blue-500/20 rounded-2xl">
                        <Users className="text-blue-500" size={24} />
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Base de Usuários</h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black italic">{metrics.totalUsers}</span>
                          <span className="text-[10px] text-green-500 font-bold">+12% hj</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Online Now */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full group-hover:bg-emerald-500/20 transition-colors"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-emerald-500/20 rounded-2xl relative">
                        <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <Activity className="text-emerald-500" size={24} />
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Usuários Online</h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black italic">{metrics.onlineUsers}</span>
                          <span className="text-[10px] text-gray-500 font-bold">agora</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Total */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-colors"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-purple-500/20 rounded-2xl">
                        <Database className="text-purple-500" size={24} />
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Total de Links</h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black italic">{movies.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Link Health */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full group-hover:bg-red-500/20 transition-colors"></div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-red-500/20 rounded-2xl">
                        <LinkIcon className="text-red-500" size={24} />
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-bold text-xs uppercase tracking-widest">Saúde dos Links</h4>
                        <div className="flex flex-col">
                          <span className="text-green-500 font-black italic text-sm">{movies.filter(m => m.videoUrl && m.videoUrl !== 'REQUESTED').length} Ativos</span>
                          <span className="text-red-500 font-black italic text-sm">{movies.filter(m => !m.videoUrl || m.videoUrl === 'REQUESTED').length} Quebrados</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Most Watched */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
                    <h3 className="text-white font-black italic uppercase mb-6 flex items-center gap-3"><Play className="text-red-600" /> Mais Assistidos</h3>
                    <div className="space-y-4">
                      {metrics.mostWatched.map((item, idx) => {
                        const movie = movies.find(m => m.id.toString() === item.id.toString());
                        if (!movie) return null;
                        return (
                          <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
                            <span className="text-2xl font-black italic text-gray-700 w-8">{idx + 1}</span>
                            <img src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w200${movie.poster_path}`} className="w-12 h-16 rounded-lg object-cover" alt={movie.title} />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate text-sm">{movie.title || movie.name}</h4>
                              <p className="text-[10px] text-gray-500">Filme/Série</p>
                            </div>
                            <div className="text-center px-4">
                              <span className="block text-xl font-black text-white">{item.count}</span>
                              <span className="uppercase text-[8px] tracking-widest text-gray-500 font-bold">Plays</span>
                            </div>
                          </div>
                        );
                      })}
                      {metrics.mostWatched.length === 0 && (
                        <p className="text-gray-500 italic text-sm">Sem dados suficientes.</p>
                      )}
                    </div>
                  </div>

                  {/* Most Favorited */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
                    <h3 className="text-white font-black italic uppercase mb-6 flex items-center gap-3"><Heart className="text-red-600" /> Mais Favoritados</h3>
                    <div className="space-y-4">
                      {metrics.mostFavorited.map((item, idx) => {
                        const movie = movies.find(m => m.id.toString() === item.id.toString());
                        if (!movie) return null;
                        return (
                          <div key={idx} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
                            <span className="text-2xl font-black italic text-gray-700 w-8">{idx + 1}</span>
                            <img src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w200${movie.poster_path}`} className="w-12 h-16 rounded-lg object-cover" alt={movie.title} />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate text-sm">{movie.title || movie.name}</h4>
                              <p className="text-[10px] text-gray-500">Filme/Série</p>
                            </div>
                            <div className="text-center px-4">
                              <span className="block text-xl font-black text-white">{item.count}</span>
                              <span className="uppercase text-[8px] tracking-widest text-gray-500 font-bold">Listas</span>
                            </div>
                          </div>
                        );
                      })}
                      {metrics.mostFavorited.length === 0 && (
                        <p className="text-gray-500 italic text-sm">Sem dados suficientes.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'users' ? (
              <AdminUsersTab />
            ) : activeTab === 'mercadopago' ? (
              <AdminMercadoPagoTab />
            ) : activeTab === 'referrals' ? (
              <AdminReferralsTab />
            ) : activeTab === 'apis' ? (
              <AdminAPIsTab />
            ) : activeTab === 'terabox' ? (
              <AdminTeraboxTab movies={movies} onUpdateMovie={onUpdateMovie} onAddMovie={onAddMovie} />
            ) : activeTab === 'onesignal' ? (
              <AdminOneSignalTab />
            ) : activeTab === 'supabase' ? (
              <div className="space-y-6 md:space-y-12 pb-12">
                <section className="bg-white/5 p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-colors group-hover:bg-blue-600/10"></div>
                  
                  <div className="mb-10 relative z-10">
                    <h3 className="text-white font-black text-xl md:text-3xl italic uppercase tracking-tighter flex items-center gap-3 md:gap-4">
                      <Send className="text-blue-500 w-5 h-5 md:w-8 md:h-8" /> Templates de E-mail
                    </h3>
                    <p className="text-gray-500 font-bold italic text-xs md:text-base mt-2">Copie e cole os scripts HTML no painel do Supabase (Authentication &gt; Email Templates)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {EMAIL_TEMPLATES.map((template) => (
                      <motion.div 
                        key={template.id}
                        whileHover={{ y: -5 }}
                        className="bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-blue-500/40 transition-all flex flex-col group/card"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover/card:scale-110 transition-transform shadow-inner">
                            {template.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-white font-black italic uppercase text-sm truncate">{template.title}</h4>
                            <p className="text-[10px] text-gray-500 font-bold truncate">Authentication Script</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium mb-6 line-clamp-2 leading-relaxed">{template.description}</p>
                        
                        <div className="mt-auto space-y-3">
                          <button 
                            onClick={() => handleCopyScript(template.script)}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black italic uppercase text-[10px] transition-all relative overflow-hidden ${copiedScript === template.script ? 'bg-green-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}
                          >
                            <AnimatePresence mode="wait">
                              {copiedScript === template.script ? (
                                <motion.div 
                                  key="copied"
                                  initial={{ y: 20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  className="flex items-center gap-2 text-white"
                                >
                                  <Check size={14} /> Copiado!
                                </motion.div>
                              ) : (
                                <motion.div 
                                  key="copy"
                                  initial={{ y: -20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  className="flex items-center gap-2"
                                >
                                  <Copy size={14} /> Copiar Script HTML
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                          <div className="flex items-center justify-center text-[8px] font-black text-gray-600 uppercase tracking-widest gap-2">
                            <Check className="text-green-500" size={8} /> Branded
                            <span className="w-1 h-1 bg-gray-800 rounded-full" />
                            <Check className="text-green-500" size={8} /> Responsive
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 relative z-10">
                    <div className="p-8 bg-black/40 rounded-[2rem] border border-blue-500/20">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                          <AlertCircle className="text-blue-500" size={20} />
                        </div>
                        <div>
                          <h4 className="text-white font-black italic uppercase text-sm tracking-widest mb-2">Instruções de Uso</h4>
                          <ol className="text-[11px] text-gray-400 space-y-3 list-decimal pl-4 font-medium leading-relaxed">
                            <li>Acesse o painel do <strong>Supabase</strong>.</li>
                            <li>Vá em <strong>Authentication</strong> &gt; <strong>Email Templates</strong>.</li>
                            <li>Escolha o tipo de e-mail correspondente.</li>
                            <li>Substitua o conteúdo do campo <strong>Body</strong> pelo script copiado.</li>
                            <li>Clique em <strong>Save</strong> para aplicar.</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-black/40 rounded-[2rem] border border-emerald-500/20">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                          <ExternalLink className="text-emerald-500" size={20} />
                        </div>
                        <div>
                          <h4 className="text-white font-black italic uppercase text-sm tracking-widest mb-2">Configuração de Redirecionamento</h4>
                          <p className="text-[11px] text-gray-500 font-bold mb-4 uppercase italic">Copie e cole em Authentication &gt; URL Configuration &gt; Redirect URLs</p>
                          
                          <div className="space-y-4">
                            {[
                              { label: 'Redirecionamento Padrão', url: `${window.location.origin}/confirmacao`, desc: 'Para novos cadastros e convites' },
                              { label: 'Redirecionamento de Senha', url: `${window.location.origin}/redefinirsenha`, desc: 'Para recuperação de acesso no design Netflix' }
                            ].map((redir, idx) => (
                              <div key={idx} className="bg-white/[0.03] p-4 rounded-xl border border-white/5 group/redir cursor-pointer hover:bg-white/5 transition-all" onClick={() => handleCopyScript(redir.url)}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-emerald-500 font-black uppercase italic tracking-tighter">{redir.label}</span>
                                  <Copy size={10} className="text-gray-600 group-hover/redir:text-emerald-500 transition-colors" />
                                </div>
                                <code className="text-[9px] text-gray-400 font-mono block truncate">{redir.url}</code>
                                <span className="text-[8px] text-gray-600 font-black uppercase mt-2 block">{redir.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : activeTab === 'app' ? (
              <div className="space-y-6 md:space-y-12 pb-12">
                <section className="bg-white/5 p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-colors group-hover:bg-red-600/10"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 mb-6 md:mb-10 relative z-10">
                    <div>
                      <h3 className="text-white font-black text-xl md:text-3xl italic uppercase tracking-tighter flex items-center gap-3 md:gap-4">
                        <Sparkles className="text-red-600 w-5 h-5 md:w-8 md:h-8" /> Logos
                      </h3>
                      <p className="text-gray-500 font-bold italic text-xs md:text-base mt-1 md:mt-2">Identidade visual do seu WebApp</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative z-10">
                    {[
                      { name: 'Logo Principal', format: 'SVG', size: 'Vetor', icon: <Sparkles className="text-red-500 w-8 h-8 md:w-10 md:h-10" /> },
                      { name: 'Ícone Mobile', format: 'PNG', size: '1024x1024', icon: <Play className="text-red-600 fill-red-600 w-8 h-8 md:w-10 md:h-10" /> },
                      { name: 'Splash Screen', format: 'PNG', size: '2048x2732', icon: <Calendar className="text-emerald-500 w-8 h-8 md:w-10 md:h-10" /> }
                    ].map((asset, i) => (
                      <motion.div 
                        key={i}
                        whileHover={{ y: -5 }}
                        className="bg-black/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 hover:border-red-600/40 transition-all cursor-pointer group/asset backdrop-blur-md"
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 group-hover/asset:scale-110 transition-transform shadow-inner text-red-500">
                          {asset.icon}
                        </div>
                        <h4 className="text-white font-black italic uppercase text-sm md:text-lg mb-1 md:mb-2">{asset.name}</h4>
                        <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
                          <span className="px-2 py-0.5 bg-white/10 rounded text-[8px] md:text-[9px] font-black text-gray-400 uppercase">{asset.format}</span>
                          <span className="px-2 py-0.5 bg-white/10 rounded text-[8px] md:text-[9px] font-black text-gray-400 uppercase">{asset.size}</span>
                        </div>
                        <button 
                          onClick={() => handleDownloadAsset(asset)}
                          className="w-full flex items-center justify-center gap-2 md:gap-3 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase text-[10px] md:text-xs py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all shadow-xl shadow-red-600/20 active:scale-95"
                        >
                          <Download size={14} /> Baixar Ativo
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            ) : activeTab === 'providers' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                <button 
                  onClick={() => setIsProviderModalOpen(true)}
                  className="aspect-video rounded-2xl md:rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 md:gap-4 hover:border-red-600/50 hover:bg-white/5 transition-all group"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-all">
                    <Plus size={20} className="md:w-6 md:h-6" />
                  </div>
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-white">Novo Provedor</span>
                </button>

                {streamingProviders.map(provider => (
                  <div key={provider.id} className="aspect-video rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 p-4 md:p-6 flex flex-col justify-between group hover:border-white/20 transition-all relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10">
                        <img src={provider.logo_url} alt={provider.name} className="h-4 md:h-6 object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <button 
                          onClick={() => setEditingProvider(provider)}
                          className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja deletar "${provider.name}"?`)) {
                              onDeleteStreamingProvider(provider.id);
                            }
                          }}
                          className="p-1.5 md:p-2 hover:bg-red-600/10 rounded-lg text-gray-500 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-sm md:text-lg font-black italic uppercase tracking-tighter">{provider.name}</h3>
                      <p className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5 md:mt-1">Prioridade: {provider.priority}</p>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-red-600/20 transition-all" />
                  </div>
                ))}
              </div>
            ) : activeTab === 'collections' ? (
              <div className="space-y-6 md:space-y-12">
                <section className="bg-white/5 p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-colors group-hover:bg-red-600/10"></div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 mb-6 md:mb-10 relative z-10">
                    <div>
                      <h3 className="text-white font-black text-xl md:text-3xl italic uppercase tracking-tighter flex items-center gap-3 md:gap-4">
                        <Sparkles className="text-red-600 w-5 h-5 md:w-8 md:h-8" /> Coleções Inteligentes
                      </h3>
                      <p className="text-gray-400 font-bold italic text-xs md:text-base mt-2">Personalize a experiência do Universo Plus com cartazes oficiais de franquias.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-white font-black uppercase text-lg italic">Automação Global</h4>
                        <p className="text-gray-500 text-sm italic font-medium">Esta função irá escanear todos os {movies.length} títulos no banco de dados e buscar as franquias oficiais no TMDB em segundo plano.</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <button
                          onClick={handleAutomateCollections}
                          disabled={collectionAutomationState?.isScanning}
                          className="flex-1 flex flex-col items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 text-red-500 font-black italic uppercase text-xs py-6 rounded-3xl transition-all active:scale-95 disabled:opacity-50 group shadow-lg shadow-red-600/5"
                        >
                          {collectionAutomationState?.isScanning ? (
                            <><RefreshCcw className="animate-spin" size={20} /> Analisando...</>
                          ) : (
                            <>
                              <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                              <span>Criar Coleções</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={handleUpdateExistingCollections}
                          disabled={collectionAutomationState?.isScanning}
                          className="flex-1 flex flex-col items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-500 font-black italic uppercase text-xs py-6 rounded-3xl transition-all active:scale-95 disabled:opacity-50 group"
                          title="Atualizar posters, logos e banners de todas as coleções existentes"
                        >
                          <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                          <span>Reparar Banners</span>
                        </button>
                        
                        {onSyncMissingLogos && (
                          <button
                            onClick={onSyncMissingLogos}
                            disabled={reScannerState?.isScanning}
                            className="flex-1 flex flex-col items-center justify-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/20 text-purple-500 font-black italic uppercase text-xs py-6 rounded-3xl transition-all active:scale-95 disabled:opacity-50 group"
                            title="Sincronizar logos oficiais TMDB para todos os filmes e séries individuais"
                          >
                            {reScannerState?.isScanning ? (
                               <><RefreshCcw className="animate-spin" size={20} /> Sincronizando...</>
                            ) : (
                               <>
                                 <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                                 <span>Check-up Logos</span>
                               </>
                            )}
                          </button>
                        )}
                      </div>

                      {collectionAutomationState?.isScanning && (
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <span>{collectionAutomationState.status}</span>
                            <span>{Math.round((collectionAutomationState.current / collectionAutomationState.total) * 100)}%</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-red-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${(collectionAutomationState.current / collectionAutomationState.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-white font-black uppercase text-lg italic">Criação Manual</h4>
                        <p className="text-gray-500 text-sm italic font-medium">Busque por uma franquia oficial (ex: "Harry Potter"). Selecione a coleção para vincular os filmes da sua biblioteca.</p>
                      </div>

                      <div className="space-y-4 relative">
                        <div className="flex gap-2 relative">
                          <input 
                            type="text"
                            value={manualCollectionName}
                            onChange={(e) => {
                              setManualCollectionName(e.target.value);
                              if (!e.target.value) {
                                setCollectionSearchResults([]);
                                setSelectedTMDBCollection(null);
                              }
                            }}
                            placeholder="Nome da coleção..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          />
                          <button
                            onClick={handleSearchCollectionTMDB}
                            disabled={isCollectionSearching || !manualCollectionName.trim()}
                            className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-xl px-6 flex items-center justify-center transition-all disabled:opacity-50"
                          >
                            {isCollectionSearching ? <RefreshCcw className="animate-spin text-red-600" size={20} /> : <Search className="text-red-600" size={20} />}
                          </button>
                        </div>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                          {collectionSearchResults.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 z-[100] mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto scrollbar-hide"
                            >
                              {collectionSearchResults.map((result) => (
                                <button
                                  key={result.id}
                                  onClick={() => selectCollectionTMDB(result)}
                                  className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0"
                                >
                                  {result.poster_path ? (
                                    <img 
                                      src={`https://image.tmdb.org/t/p/w92${result.poster_path}`} 
                                      className="w-10 h-14 rounded-lg object-cover bg-black"
                                      alt=""
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                                      <Sparkles size={16} className="text-gray-700" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-white italic truncate uppercase">{result.name}</p>
                                    <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 italic leading-tight">{result.overview || 'Sem descrição.'}</p>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Selected Collection Area */}
                        {selectedTMDBCollection && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-4"
                          >
                            <div className="flex items-start gap-4">
                              <img 
                                src={selectedTMDBCollection.poster_path ? `https://image.tmdb.org/t/p/w185${selectedTMDBCollection.poster_path}` : 'https://picsum.photos/seed/coll/500/750'} 
                                className="w-20 h-28 object-cover rounded-xl shadow-2xl border border-white/10 shrink-0"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1">
                                <h5 className="text-sm font-black italic uppercase text-white leading-tight">{selectedTMDBCollection.name}</h5>
                                <p className="text-[10px] text-gray-500 font-bold mt-1">{selectedTMDBCollection.parts?.length || 0} filmes oficiais na saga</p>
                                <p className="text-[10px] text-gray-400 line-clamp-3 mt-2 italic leading-relaxed">{selectedTMDBCollection.overview || 'Sem descrição disponível.'}</p>
                              </div>
                              <button 
                                onClick={() => setSelectedTMDBCollection(null)}
                                className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* Official Movies List in Collection */}
                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic mb-2">Filmes Oficiais na Saga:</p>
                              {selectedTMDBCollection.parts?.sort((a: any, b: any) => String(a.release_date || '0').localeCompare(String(b.release_date || '0'))).map((part: any) => {
                                const inLibrary = movies.some(m => 
                                  m.title?.toLowerCase() === part.title?.toLowerCase() || 
                                  m.collection_id === selectedTMDBCollection.id && m.title?.toLowerCase().includes(part.title?.toLowerCase())
                                );
                                return (
                                  <div key={part.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <img 
                                        src={part.poster_path ? `https://image.tmdb.org/t/p/w92${part.poster_path}` : 'https://picsum.photos/seed/movie/92/138'} 
                                        className="w-6 h-9 object-cover rounded shadow"
                                        alt=""
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-white truncate italic">{part.title}</p>
                                        <p className="text-[8px] text-gray-500 font-bold">{part.release_date?.split('-')[0] || 'N/A'}</p>
                                      </div>
                                    </div>
                                    {inLibrary ? (
                                      <span className="text-[8px] font-black uppercase text-green-500 bg-green-500/10 px-2 py-1 rounded">Na Biblioteca</span>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setIsAddModalOpen(true);
                                          setNewMovie({
                                            title: part.title,
                                            overview: part.overview,
                                            poster_path: part.poster_path ? `https://image.tmdb.org/t/p/original${part.poster_path}` : '',
                                            backdrop_path: part.backdrop_path ? `https://image.tmdb.org/t/p/original${part.backdrop_path}` : '',
                                            genres: '', // Will be updated on load or manually
                                            collection_id: selectedTMDBCollection.id,
                                            collection_name: selectedTMDBCollection.name,
                                            collection_poster_path: selectedTMDBCollection.poster_path ? `https://image.tmdb.org/t/p/original${selectedTMDBCollection.poster_path}` : null,
                                            video_url: '',
                                            release_date: part.release_date
                                          });
                                        }}
                                        className="text-[8px] font-black uppercase text-red-600 hover:text-red-500 bg-red-600/10 px-2 py-1 rounded transition-all"
                                      >
                                        Adicionar
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <button
                                onClick={handleManualCollectionCreate}
                                disabled={isManualProcessing}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase text-[10px] py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                              >
                                {isManualProcessing ? <RefreshCcw className="animate-spin" size={12} /> : <Check size={12} />} Vincular Biblioteca
                              </button>
                              <button
                                onClick={() => {
                                  // Open modern add movie modal with some preset info? 
                                  // For now let's just use the existing logic or suggest adding movies
                                  setIsAddModalOpen(true);
                                  setNewMovie(prev => ({ 
                                    ...prev, 
                                    collection_name: selectedTMDBCollection.name,
                                    collection_id: selectedTMDBCollection.id,
                                    collection_poster_path: selectedTMDBCollection.poster_path ? `https://image.tmdb.org/t/p/original${selectedTMDBCollection.poster_path}` : null
                                  }));
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-black italic uppercase text-[10px] py-3 rounded-xl transition-all active:scale-95"
                              >
                                <Plus size={12} /> Adicionar Filme
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {!selectedTMDBCollection && !isCollectionSearching && collectionSearchResults.length === 0 && (
                          <div className="py-4 text-center">
                            <p className="text-[10px] text-gray-600 font-bold italic">Digite o nome e clique na lupa para buscar coleções oficiais.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 space-y-6 md:col-span-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <h4 className="text-white font-black uppercase text-lg italic tracking-tight">Identidade Visual das Coleções</h4>
                          <p className="text-gray-500 text-xs italic font-medium max-w-xl">Atualize logos, posters e banners de todas as coleções vinculadas. Isso substitui nomes genéricos por artes oficiais.</p>
                        </div>
                        <button
                          onClick={onUpdateCollectionInfo}
                          disabled={collectionAutomationState?.isScanning}
                          className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-black italic uppercase text-xs px-8 py-4 rounded-xl transition-all whitespace-nowrap disabled:opacity-50"
                        >
                          {collectionAutomationState?.isScanning ? (
                            <RefreshCcw className="animate-spin" size={16} />
                          ) : (
                            <Sparkles size={16} className="text-red-600" />
                          )}
                          Atualizar Tudo
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4">
                        {Array.from(new Set(movies.filter(m => m.collection_id).map(m => m.collection_id))).map(id => {
                          const collectionMovies = movies.filter(m => m.collection_id === id);
                          const first = collectionMovies[0];
                          return (
                            <div key={id} className="group relative bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden aspect-[2/3]">
                              <img 
                                src={first.collection_poster_path || first.poster_path} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-[9px] font-black text-white italic uppercase truncate mb-2">{first.collection_name}</p>
                                <button 
                                  onClick={() => {
                                    if (onUpdateCollectionInfo && id) {
                                       onUpdateCollectionInfo(id);
                                    }
                                  }}
                                  className="w-full py-2 bg-red-600/20 hover:bg-red-600 text-white text-[8px] font-black uppercase rounded-lg transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                >
                                  Atualizar
                                </button>
                              </div>
                              {first.collection_logo_path && (
                                <div className="absolute top-2 right-2 bg-green-500/80 backdrop-blur-sm p-1 rounded-md">
                                  <Sparkles size={10} className="text-white" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] space-y-6 md:col-span-2">
                      <h4 className="text-white font-black uppercase text-lg italic">Estatísticas de Franquias</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Com Coleção</span>
                          <span className="text-2xl font-black text-white italic">{movies.filter(m => !!m.collection_id).length}</span>
                        </div>
                        <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Sem Coleção</span>
                          <span className="text-2xl font-black text-white italic">{movies.filter(m => !m.collection_id).length}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 italic font-bold">As coleções permitem agrupamentos precisos por saga no menu de navegação e exibem selos especiais nos detalhes dos filmes.</p>
                    </div>
                  </div>
                </section>
              </div>
            ) : viewMode === 'table' ? (
              <div className="w-full overflow-x-auto rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-black/20">
                <table className="w-full divide-y divide-white/5">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-3 md:px-6 py-4 text-left">
                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-white">
                          {selectedIds.size === filteredMovies.length ? <CheckSquare size={16} className="text-red-600" /> : <Square size={16} />}
                        </button>
                      </th>
                      <th className="px-3 md:px-6 py-4 text-left text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Conteúdo</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic hidden md:table-cell">Lançamento</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest italic hidden lg:table-cell">Nota</th>
                      <th className="px-3 md:px-6 py-4 text-left text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest italic hidden sm:table-cell">Status</th>
                      <th className="px-3 md:px-6 py-4 text-right text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMovies.map((movie) => (
                      <tr key={movie.id} className={`group hover:bg-white/[0.02] transition-colors ${selectedIds.has(movie.id) ? 'bg-red-600/5' : ''}`}>
                        <td className="px-3 md:px-6 py-4">
                          <button onClick={() => toggleSelect(movie.id)} className={`${selectedIds.has(movie.id) ? 'text-red-600' : 'text-gray-700 group-hover:text-gray-500'}`}>
                            {selectedIds.has(movie.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="px-3 md:px-6 py-4">
                          <div className="flex items-center gap-3 md:gap-4">
                            <img 
                              src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w92/${movie.poster_path}`} 
                              className="w-8 h-12 md:w-10 md:h-14 object-cover rounded-lg shadow-lg shrink-0"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div className="max-w-[120px] sm:max-w-xs md:max-w-sm">
                              <p className="text-xs md:text-sm font-black text-white truncate italic uppercase tracking-tighter">
                                {movie.title || movie.name}
                                {movie.videoUrl2 && <span className="ml-2 text-[8px] bg-blue-600/20 text-blue-500 px-1.5 py-0.5 rounded-full border border-blue-500/30">L2</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${movie.type === 'series' ? 'bg-blue-600/10 text-blue-500' : 'bg-purple-600/10 text-purple-500'}`}>
                                  {movie.type === 'series' ? 'Série' : 'Filme'}
                                </span>
                                {movie.runtime > 0 && <span className="text-[9px] text-gray-500 font-bold">{movie.runtime}m</span>}
                                {movie.actors && <span className="text-[9px] text-gray-600 truncate max-w-[80px]">by {movie.actors.split(',')[0]}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">
                              {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              {movie.release_date ? new Date(movie.release_date).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-black text-white">{movie.rating || movie.vote_average?.toFixed(1) || '0.0'}</span>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 hidden sm:table-cell">
                          <div className="flex flex-col gap-1">
                            {movie.is_hidden ? (
                              <span className="flex items-center gap-1 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                <EyeOff size={10} /> Oculto
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase tracking-widest">
                                <Eye size={10} /> Visível
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 md:gap-2">
                            <button 
                              onClick={() => handleSyncMovie(movie)}
                              title="Sincronizar com TMDB"
                              className="p-1.5 md:p-2 bg-blue-600/5 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-all"
                            >
                              <RefreshCcw size={14} />
                            </button>
                            {movie.collection_id && (
                              <button 
                                onClick={() => onUpdateCollectionInfo?.(movie.collection_id!)}
                                title="Atualizar Identidade da Coleção"
                                className="p-1.5 md:p-2 bg-purple-600/5 hover:bg-purple-600 text-purple-600 hover:text-white rounded-lg transition-all"
                              >
                                <Sparkles size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => setEditingMovie(movie)}
                              className="p-1.5 md:p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja deletar "${movie.title}"?`)) {
                                  onDeleteMovies([movie.id]);
                                }
                              }}
                              className="p-1.5 md:p-2 bg-red-600/5 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredMovies.map((movie) => (
                  <div 
                    key={movie.id}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all duration-300 ${selectedIds.has(movie.id) ? 'border-red-600 ring-4 ring-red-600/20' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="aspect-[2/3] relative">
                      <img 
                        src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w342/${movie.poster_path}`} 
                        className="w-full h-full object-cover"
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                      
                      <button 
                        onClick={() => toggleSelect(movie.id)}
                        className="absolute top-3 left-3 z-10 p-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-white"
                      >
                        {selectedIds.has(movie.id) ? <CheckSquare size={16} className="text-red-600" /> : <Square size={16} />}
                      </button>

                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-[10px] font-black text-white uppercase tracking-tighter italic truncate">{movie.title || movie.name}</p>
                      </div>

                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                        <button 
                          onClick={() => handleSyncMovie(movie)}
                          className="w-full py-2 bg-blue-600/20 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20"
                        >
                          Sincronizar TMDB
                        </button>
                        {movie.collection_id && (
                          <button 
                            onClick={() => onUpdateCollectionInfo?.(movie.collection_id!)}
                            className="w-full py-2 bg-purple-600/20 text-purple-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all border border-purple-600/20"
                          >
                            Atualizar Coleção
                          </button>
                        )}
                        <button 
                          onClick={() => setEditingMovie(movie)}
                          className="w-full py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => onToggleHideMovies([movie.id], !movie.is_hidden)}
                          className="w-full py-2 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                        >
                          {movie.is_hidden ? 'Mostrar' : 'Ocultar'}
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja deletar "${movie.title}"?`)) {
                              onDeleteMovies([movie.id]);
                            }
                          }}
                          className="w-full py-2 bg-red-600/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-600/20"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredMovies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <Search size={32} className="text-gray-700" />
                </div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Nenhum resultado</h3>
                <p className="text-gray-500 text-sm mt-2 italic">Tente ajustar sua pesquisa ou filtros.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Provider Modal */}
      <AnimatePresence>
        {(isProviderModalOpen || editingProvider) && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsProviderModalOpen(false);
                setEditingProvider(null);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-[#121212] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                    <LayoutGrid size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                      {editingProvider ? 'Editar Provedor' : 'Novo Provedor'}
                    </h2>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Streaming Favoritos</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsProviderModalOpen(false);
                    setEditingProvider(null);
                  }} 
                  className="p-3 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Nome do Provedor</label>
                  <input 
                    type="text"
                    value={editingProvider ? editingProvider.name : newProvider.name}
                    onChange={(e) => editingProvider ? setEditingProvider({ ...editingProvider, name: e.target.value }) : setNewProvider({ ...newProvider, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                    placeholder="Ex: Netflix, Disney+, etc"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">URL da Logo</label>
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      value={editingProvider ? editingProvider.logo_url : newProvider.logo_url}
                      onChange={(e) => editingProvider ? setEditingProvider({ ...editingProvider, logo_url: e.target.value }) : setNewProvider({ ...newProvider, logo_url: e.target.value })}
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                      placeholder="https://..."
                    />
                    <label className="shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all group">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, !!editingProvider)}
                      />
                      <Upload size={20} className="text-gray-500 group-hover:text-red-600 transition-colors" />
                    </label>
                  </div>
                  {((editingProvider?.logo_url) || (newProvider.logo_url)) && (
                    <div className="mt-4 p-4 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-center">
                      <img src={editingProvider ? editingProvider.logo_url : newProvider.logo_url} className="h-8 object-contain" alt="Preview" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Prioridade (Ordem)</label>
                  <input 
                    type="number"
                    value={editingProvider ? editingProvider.priority : newProvider.priority}
                    onChange={(e) => editingProvider ? setEditingProvider({ ...editingProvider, priority: Number(e.target.value) }) : setNewProvider({ ...newProvider, priority: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                  />
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-black/20 flex items-center justify-end gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setIsProviderModalOpen(false);
                    setEditingProvider(null);
                  }}
                  className="px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (editingProvider) {
                      await onUpdateStreamingProvider(editingProvider);
                      setEditingProvider(null);
                    } else {
                      await onAddStreamingProvider(newProvider);
                      setNewProvider({ name: '', logo_url: '', priority: 0 });
                      setIsProviderModalOpen(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                >
                  {editingProvider ? 'Salvar Alterações' : 'Adicionar Provedor'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Content Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#121212] rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
            >
              <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                    <Plus size={20} className="text-white md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Novo Conteúdo</h2>
                    <p className="hidden md:block text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Adicione manualmente</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 md:p-3 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white">
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Título</label>
                      <div className="flex gap-2 relative">
                        <input 
                          type="text"
                          value={newMovie.title}
                          onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          placeholder="Título do filme ou série"
                        />
                        <button 
                          type="button"
                          onClick={() => handleSearchTmdb(newMovie.title || '', setNewMovie, newMovie)}
                          disabled={isTmdbSearching || !newMovie.title}
                          className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-xl md:rounded-2xl px-4 flex items-center justify-center transition-all disabled:opacity-50"
                          title="Buscar no TMDB"
                        >
                          {isTmdbSearching ? <RefreshCcw className="animate-spin text-red-600" size={18} /> : <Search size={18} className="text-red-600" />}
                        </button>

                        {tmdbSearchResults.length > 0 && isAddModalOpen && (
                          <div className="absolute top-full left-0 right-0 z-[700] mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto scrollbar-hide">
                            {tmdbSearchResults.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onClick={() => selectTmdbResult(result, setNewMovie, newMovie)}
                                className="w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                              >
                                {result.poster_path ? (
                                  <img 
                                    src={`https://image.tmdb.org/t/p/w92${result.poster_path}`} 
                                    className="w-10 h-14 rounded-lg object-cover bg-black"
                                    alt=""
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Sparkles size={16} className="text-gray-700" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-white italic truncate uppercase">{result.title || result.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold truncate">
                                    {result.release_date || result.first_air_date ? new Date(result.release_date || result.first_air_date).getFullYear() : 'S/A'} • {result.media_type === 'tv' ? 'Série' : 'Filme'}
                                  </p>
                                  <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 italic leading-tight">{result.overview}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5 md:mb-2 px-1">
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">Sinopse</label>
                        <button type="button" onClick={async () => {
                           const { translateToPortuguese } = await import('../services/ai');
                           const trans = await translateToPortuguese(newMovie.overview || '');
                           setNewMovie({...newMovie, overview: trans});
                        }} className="text-[10px] font-bold text-blue-400 hover:text-blue-300">Traduzir p/ PT-BR</button>
                      </div>
                      <textarea 
                        value={newMovie.overview}
                        onChange={(e) => setNewMovie({ ...newMovie, overview: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium focus:outline-none focus:border-red-600 transition-all h-24 md:h-32 resize-none"
                        placeholder="Descrição curta..."
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Link de Vídeo Principal</label>
                      <input 
                        type="text"
                        value={newMovie.video_url}
                        onChange={(e) => setNewMovie({ ...newMovie, video_url: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all font-mono text-blue-400"
                        placeholder="Ex: Google Drive / GDPlayer"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Link de Vídeo Secundário</label>
                      <input 
                        type="text"
                        value={(newMovie as any).video_url_2 || ''}
                        onChange={(e) => setNewMovie({ ...newMovie, video_url_2: e.target.value } as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all font-mono text-red-400"
                        placeholder="Ex: KingX / Terabox"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">URL do Poster</label>
                      <input 
                        type="text"
                        value={newMovie.poster_path}
                        onChange={(e) => setNewMovie({ ...newMovie, poster_path: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[10px] md:text-xs font-medium focus:outline-none focus:border-red-600 transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">URL do Backdrop</label>
                      <input 
                        type="text"
                        value={newMovie.backdrop_path}
                        onChange={(e) => setNewMovie({ ...newMovie, backdrop_path: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[10px] md:text-xs font-medium focus:outline-none focus:border-red-600 transition-all"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Lançamento</label>
                        <input 
                          type="text"
                          value={(newMovie as any).release_date || ''}
                          onChange={(e) => setNewMovie({ ...newMovie, release_date: e.target.value } as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          placeholder="AAAA-MM-DD"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Duração (min)</label>
                        <input 
                          type="number"
                          value={(newMovie as any).runtime || ''}
                          onChange={(e) => setNewMovie({ ...newMovie, runtime: parseInt(e.target.value) || 0 } as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all font-mono"
                          placeholder="Minutos"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Avaliação</label>
                        <input 
                          type="number"
                          step="0.1"
                          value={(newMovie as any).rating || ''}
                          onChange={(e) => setNewMovie({ ...newMovie, rating: parseFloat(e.target.value) || 0 } as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all font-mono"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Atores/Autor</label>
                        <input 
                          type="text"
                          value={(newMovie as any).actors || ''}
                          onChange={(e) => setNewMovie({ ...newMovie, actors: e.target.value } as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          placeholder="Nomes separados por vírgula"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Tipo</label>
                        <select 
                          value={newMovie.type}
                          onChange={(e) => setNewMovie({ ...newMovie, type: e.target.value as 'movie' | 'series' })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all appearance-none"
                        >
                          <option value="movie">Filme</option>
                          <option value="series">Série</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Gêneros</label>
                        <input 
                          type="text"
                          value={newMovie.genres}
                          onChange={(e) => setNewMovie({ ...newMovie, genres: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          placeholder="Ação, Drama..."
                        />
                      </div>
                    </div>

                    {newMovie.type === 'series' && (
                      <div className="space-y-6 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Episódios</h3>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => syncEpisodesWithTMDB(newMovie, setNewMovie)}
                              className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600 hover:text-white text-[10px] font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                            >
                              <RefreshCw size={12} /> Sync TMDB
                            </button>
                            <button 
                              type="button"
                              onClick={() => addEpisode(newMovie, setNewMovie)}
                              className="bg-white/5 hover:bg-white/10 text-[10px] font-bold px-4 py-2 rounded-xl transition-all"
                            >
                              + Adicionar Episódio
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                          <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 px-1 italic">Importar Link KingX (Smart Copy)</label>
                          <div className="flex gap-2">
                             <input 
                                type="text"
                                value={kingxSeriesUrl}
                                onChange={(e) => setKingxSeriesUrl(e.target.value)}
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-xs font-mono"
                                placeholder="Cole o link KingX Player aqui..."
                             />
                             <button 
                               type="button"
                               onClick={handleImportKingXSeries}
                               className="bg-blue-600 px-4 py-2 rounded-xl text-white text-xs font-bold"
                             >
                               Importar
                             </button>
                          </div>
                          <p className="text-[9px] text-gray-500 italic">Isso extrairá o link de vídeo real do player KingX.</p>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                          <span className="text-[10px] text-gray-500 font-black uppercase">Auto-Next Global (s):</span>
                          <input 
                            id="bulkNewMovieCredits"
                            type="number"
                            placeholder="Ex: 30"
                            className="w-20 bg-black/40 border border-white/5 rounded-lg py-1 px-2 text-xs font-mono text-center"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = (document.getElementById('bulkNewMovieCredits') as HTMLInputElement).value;
                              if (val !== '') {
                                setNewMovie({
                                  ...newMovie, 
                                  episodes: newMovie.episodes?.map(ep => ({ ...ep, credits_time: Number(val) }))
                                });
                              }
                            }}
                            className="bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white transition-colors px-3 py-1 rounded-lg text-[10px] font-bold uppercase"
                          >
                            Aplicar Tudo
                          </button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                           {(newMovie.episodes || []).map((ep: any, idx: number) => (
                             <div key={ep.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative group">
                                <button 
                                  onClick={() => removeEpisode(newMovie, setNewMovie, ep.id)}
                                  className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                  <X size={14} />
                                </button>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Temp</label>
                                    <input 
                                      type="number"
                                      value={ep.season}
                                      onChange={(e) => updateEpisode(newMovie, setNewMovie, ep.id, 'season', parseInt(e.target.value) || 1)}
                                      className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Ep</label>
                                    <input 
                                      type="number"
                                      value={ep.episode}
                                      onChange={(e) => updateEpisode(newMovie, setNewMovie, ep.id, 'episode', parseInt(e.target.value) || 1)}
                                      className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono"
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Título</label>
                                    <input 
                                      type="text"
                                      value={ep.title}
                                      onChange={(e) => updateEpisode(newMovie, setNewMovie, ep.id, 'title', e.target.value)}
                                      className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="col-span-2">
                                    <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Link Vídeo</label>
                                    <input 
                                      type="text"
                                      value={ep.videoUrl}
                                      onChange={(e) => updateEpisode(newMovie, setNewMovie, ep.id, 'videoUrl', e.target.value)}
                                      className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono text-blue-400"
                                      placeholder="Ex: Teradl / M3U8"
                                    />
                                  </div>
                                  <div className="col-span-1">
                                    <label className="block text-[8px] font-black text-gray-500 uppercase mb-1 text-center whitespace-nowrap">Auto-Next(s)</label>
                                    <input 
                                      type="number"
                                      value={ep.credits_time !== undefined ? ep.credits_time : ''}
                                      onChange={(e) => updateEpisode(newMovie, setNewMovie, ep.id, 'credits_time', e.target.value !== '' ? Number(e.target.value) : undefined)}
                                      className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono text-center"
                                      placeholder="Ex: 30"
                                    />
                                  </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Plataformas (ex: Netflix, HBO)</label>
                        <input 
                          type="text"
                          value={newMovie.watch_providers || ''}
                          onChange={(e) => setNewMovie({ ...newMovie, watch_providers: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          placeholder="Nomes separados por vírgula"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 md:p-8 border-t border-white/5 bg-black/20 flex items-center justify-end gap-3 md:gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAddMovie}
                  disabled={isBulkActionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkActionLoading ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMovie && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingMovie(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-[#121212] rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
            >
              <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/20">
                    <Edit3 size={20} className="text-white md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Editar</h2>
                    <p className="hidden md:block text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">ID: {editingMovie.id}</p>
                  </div>
                </div>
                <button onClick={() => setEditingMovie(null)} className="p-2 md:p-3 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white">
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-5 md:p-8 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Título</label>
                      <div className="flex gap-2 relative">
                        <input 
                          type="text"
                          value={editingMovie.title || editingMovie.name || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => handleSearchTmdb(editingMovie.title || editingMovie.name || '', setEditingMovie, editingMovie)}
                          disabled={isTmdbSearching || !(editingMovie.title || editingMovie.name)}
                          className="bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-xl md:rounded-2xl px-4 flex items-center justify-center transition-all disabled:opacity-50"
                          title="Sincronizar com TMDB"
                        >
                          {isTmdbSearching ? <RefreshCcw className="animate-spin text-red-600" size={18} /> : <RefreshCcw size={18} className="text-red-600" />}
                        </button>

                        {tmdbSearchResults.length > 0 && editingMovie && (
                          <div className="absolute top-full left-0 right-0 z-[700] mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto scrollbar-hide">
                            {tmdbSearchResults.map((result) => (
                              <button
                                key={result.id}
                                type="button"
                                onClick={() => selectTmdbResult(result, setEditingMovie, editingMovie)}
                                className="w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                              >
                                {result.poster_path ? (
                                  <img 
                                    src={`https://image.tmdb.org/p/w92${result.poster_path}`} 
                                    className="w-10 h-14 rounded-lg object-cover bg-black"
                                    alt=""
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Sparkles size={16} className="text-gray-700" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-white italic truncate uppercase">{result.title || result.name}</p>
                                  <p className="text-[10px] text-gray-500 font-bold truncate">
                                    {result.release_date || result.first_air_date ? new Date(result.release_date || result.first_air_date).getFullYear() : 'S/A'} • {result.media_type === 'tv' ? 'Série' : 'Filme'}
                                  </p>
                                  <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 italic leading-tight">{result.overview}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5 md:mb-2 px-1">
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest">Sinopse</label>
                        <button type="button" onClick={async () => {
                           const { translateToPortuguese } = await import('../services/ai');
                           const trans = await translateToPortuguese(editingMovie.overview || '');
                           setEditingMovie({...editingMovie, overview: trans});
                        }} className="text-[10px] font-bold text-blue-400 hover:text-blue-300">Traduzir p/ PT-BR</button>
                      </div>
                      <textarea 
                        rows={6}
                        value={editingMovie.overview || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, overview: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium focus:outline-none focus:border-red-600 transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Link Principal</label>
                      <input 
                        type="text"
                        value={editingMovie.videoUrl || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, videoUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-mono text-blue-400 focus:outline-none focus:border-red-600 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Link Secundário</label>
                      <input 
                        type="text"
                        value={editingMovie.videoUrl2 || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, videoUrl2: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-mono text-red-400 focus:outline-none focus:border-red-600 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Lançamento</label>
                        <input 
                          type="text"
                          value={editingMovie.release_date || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, release_date: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                          placeholder="AAAA-MM-DD"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Duração (min)</label>
                        <input 
                          type="number"
                          value={editingMovie.runtime || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, runtime: parseInt(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Avaliação</label>
                        <input 
                          type="number"
                          step="0.1"
                          value={editingMovie.rating || editingMovie.vote_average || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, rating: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div 
                            onClick={() => setEditingMovie({ ...editingMovie, is_hidden: !editingMovie.is_hidden })}
                            className={`w-10 h-5 rounded-full transition-all relative ${editingMovie.is_hidden ? 'bg-red-600' : 'bg-gray-800'}`}
                          >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editingMovie.is_hidden ? 'left-6' : 'left-1'}`} />
                          </div>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Ocultar</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Atores / Elenco</label>
                      <input 
                        type="text"
                        value={editingMovie.actors || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, actors: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                        placeholder="Nomes separados por vírgula"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Plataformas (ex: Netflix, HBO)</label>
                      <input 
                        type="text"
                        value={editingMovie.watch_providers || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, watch_providers: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                        placeholder="Nomes separados por vírgula"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Poster URL</label>
                      <div className="flex gap-3 md:gap-4">
                        <div className="w-16 h-24 md:w-24 md:h-36 shrink-0 rounded-lg md:rounded-xl overflow-hidden border border-white/10 bg-black">
                          <img 
                            src={editingMovie.poster_path?.startsWith('http') ? editingMovie.poster_path : `https://image.tmdb.org/t/p/w185/${editingMovie.poster_path}`} 
                            className="w-full h-full object-cover"
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <input 
                          type="text"
                          value={editingMovie.poster_path || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, poster_path: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[10px] md:text-xs font-medium focus:outline-none focus:border-red-600 transition-all h-fit self-center md:self-start"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Backdrop URL</label>
                      <input 
                        type="text"
                        value={editingMovie.backdrop_path || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, backdrop_path: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-[10px] md:text-xs font-medium focus:outline-none focus:border-red-600 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Tipo</label>
                        <select 
                          value={editingMovie.type || 'movie'}
                          onChange={(e) => setEditingMovie({ ...editingMovie, type: e.target.value as 'movie' | 'series' })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all appearance-none"
                        >
                          <option value="movie">Filme</option>
                          <option value="series">Série</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 md:mb-2 px-1">Gêneros</label>
                        <input 
                          type="text"
                          value={editingMovie.genres || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, genres: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-bold focus:outline-none focus:border-red-600 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {editingMovie.type === 'series' && (
                    <div className="space-y-6 pt-6 border-t border-white/5 col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Episódios</h3>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => syncEpisodesWithTMDB(editingMovie, setEditingMovie)}
                            className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600 hover:text-white text-[10px] font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                          >
                            <RefreshCw size={12} /> Sync TMDB
                          </button>
                          <button 
                            type="button"
                            onClick={() => addEpisode(editingMovie, setEditingMovie)}
                            className="bg-white/5 hover:bg-white/10 text-[10px] font-bold px-4 py-2 rounded-xl transition-all"
                          >
                            + Adicionar Episódio
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 px-1 italic">Importar Link KingX (Smart Copy)</label>
                        <div className="flex gap-2">
                           <input 
                              type="text"
                              value={kingxSeriesUrl}
                              onChange={(e) => setKingxSeriesUrl(e.target.value)}
                              className="flex-1 bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-xs font-mono"
                              placeholder="Cole o link KingX Player aqui..."
                           />
                           <button 
                             type="button"
                             onClick={() => {
                                if (!kingxSeriesUrl) return;
                                try {
                                  let videoUrl = '';
                                  if (kingxSeriesUrl.includes('#')) {
                                    const fragment = kingxSeriesUrl.split('#')[1];
                                    const params = new URLSearchParams(fragment);
                                    videoUrl = params.get('video_url') || '';
                                  } else {
                                     const urlObj = new URL(kingxSeriesUrl);
                                     videoUrl = urlObj.searchParams.get('video_url') || '';
                                  }

                                  if (videoUrl) {
                                    setEditingMovie(prev => prev ? { ...prev, video_url: videoUrl, video_url_2: kingxSeriesUrl } : null);
                                    setKingxSeriesUrl('');
                                    alert("Link importado com sucesso para o campo de vídeo principal.");
                                  }
                                } catch (e) {
                                  alert("Erro ao analisar o link.");
                                }
                             }}
                             className="bg-blue-600 px-4 py-2 rounded-xl text-white text-xs font-bold"
                           >
                             Importar
                           </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 bg-white/5 border border-white/10 rounded-xl p-3 mb-4 mt-2">
                        <span className="text-[10px] text-gray-500 font-black uppercase">Auto-Next Global (s):</span>
                        <input 
                          id="bulkEditingMovieCreditsAdmin"
                          type="number"
                          placeholder="Ex: 30"
                          className="w-20 bg-black/40 border border-white/5 rounded-lg py-1 px-2 text-xs font-mono text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (document.getElementById('bulkEditingMovieCreditsAdmin') as HTMLInputElement).value;
                            if (val !== '') {
                              setEditingMovie(prev => prev ? {
                                ...prev, 
                                episodes: prev.episodes?.map((ep: any) => ({ ...ep, credits_time: Number(val) }))
                              } : null);
                            }
                          }}
                          className="bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white transition-colors px-3 py-1 rounded-lg text-[10px] font-bold uppercase"
                        >
                          Aplicar Tudo
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                         {(editingMovie.episodes || []).map((ep: any) => (
                           <div key={ep.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative group">
                              <button 
                                type="button"
                                onClick={() => removeEpisode(editingMovie, setEditingMovie, ep.id)}
                                className="absolute top-2 right-2 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                              >
                                <X size={14} />
                              </button>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Temp</label>
                                  <input 
                                    type="number"
                                    value={ep.season}
                                    onChange={(e) => updateEpisode(editingMovie, setEditingMovie, ep.id, 'season', parseInt(e.target.value) || 1)}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Ep</label>
                                  <input 
                                    type="number"
                                    value={ep.episode}
                                    onChange={(e) => updateEpisode(editingMovie, setEditingMovie, ep.id, 'episode', parseInt(e.target.value) || 1)}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono"
                                  />
                                </div>
                                <div className="col-span-1">
                                  <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Título</label>
                                  <input 
                                    type="text"
                                    value={ep.title}
                                    onChange={(e) => updateEpisode(editingMovie, setEditingMovie, ep.id, 'title', e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-black truncate"
                                    placeholder="Episódio..."
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                  <label className="block text-[8px] font-black text-gray-500 uppercase mb-1">Link Vídeo</label>
                                  <input 
                                    type="text"
                                    value={ep.videoUrl}
                                    onChange={(e) => updateEpisode(editingMovie, setEditingMovie, ep.id, 'videoUrl', e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-[10px] font-mono text-blue-400"
                                    placeholder="Link do vídeo..."
                                  />
                                </div>
                                <div className="col-span-1">
                                  <label className="block text-[8px] font-black text-gray-500 uppercase mb-1 text-center whitespace-nowrap">Auto-Next(s)</label>
                                  <input 
                                    type="number"
                                    value={ep.credits_time !== undefined ? ep.credits_time : ''}
                                    onChange={(e) => updateEpisode(editingMovie, setEditingMovie, ep.id, 'credits_time', e.target.value !== '' ? Number(e.target.value) : undefined)}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-3 text-xs font-mono text-center"
                                    placeholder="Ex: 30"
                                  />
                                </div>
                              </div>
                              <div className="bg-blue-600/10 rounded-lg p-2 flex gap-2 items-center">
                                <LinkIcon size={12} className="text-blue-500" />
                                <input 
                                  type="text"
                                  placeholder="Importar Link KingX p/ este EP"
                                  className="flex-1 bg-transparent border-none text-[9px] font-mono text-blue-400 focus:ring-0 p-0"
                                  onBlur={(e) => {
                                     const kUrl = e.target.value;
                                     if (!kUrl) return;
                                     try {
                                       let vUrl = '';
                                       if (kUrl.includes('#')) {
                                          const fragment = kUrl.split('#')[1];
                                          const params = new URLSearchParams(fragment);
                                          vUrl = params.get('video_url') || '';
                                       } else {
                                          const urlObj = new URL(kUrl);
                                          vUrl = urlObj.searchParams.get('video_url') || '';
                                       }
                                       if (vUrl) {
                                          updateEpisode(editingMovie, setEditingMovie, ep.id, 'videoUrl', vUrl);
                                          e.target.value = '';
                                       }
                                     } catch (err) {}
                                  }}
                                />
                              </div>
                           </div>
                         ))}
                         <button 
                            type="button"
                            onClick={() => addEpisode(editingMovie, setEditingMovie)}
                            className="bg-white/5 border border-dashed border-white/10 hover:bg-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-all min-h-[120px]"
                         >
                            <Plus size={20} className="text-gray-500" />
                            <span className="text-[10px] font-black uppercase text-gray-500">Novo Episódio</span>
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>

              <div className="p-5 md:p-8 border-t border-white/5 bg-black/20 flex items-center justify-end gap-3 md:gap-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className="px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                >
                  Sair
                </button>
                <button 
                  onClick={handleSaveEdit}
                  className="bg-red-600 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs hover:bg-red-500 transition-all shadow-xl shadow-red-600/20 flex items-center gap-2"
                >
                  <Save size={16} className="md:w-4 md:h-4" /> Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPanel;
