import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Database, Link as LinkIcon, CheckCircle2, ShieldCheck, Play, Video, RefreshCw, FolderSearch, Plus, Save, Search, Zap } from 'lucide-react';
import Hls from 'hls.js';
import { Movie } from '../../types';
import tmdb from '../../services/tmdb';

const GENRE_MAP: { [key: number]: string } = {
  28: "Ação", 12: "Aventura", 16: "Animação", 35: "Comédia", 80: "Crime",
  99: "Documentário", 18: "Drama", 10751: "Família", 14: "Fantasia",
  36: "História", 27: "Terror", 10402: "Música", 9648: "Mistério",
  10749: "Romance", 878: "Ficção Científica", 10770: "Cinema TV",
  53: "Suspense", 10752: "Guerra", 37: "Faroeste",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics"
};

function cleanForTmdb(filename: string): string {
  let s = filename.replace(/\.(mp4|mkv|avi|webm|ts|mov)$/i, '');
  s = s.replace(/[\(\[]\d{4}[\)\]]/g, '');
  s = s.replace(/720p|1080p|4k|2160p|480p|360p/gi, '');
  s = s.replace(/WEB-DL|WEBRip|BluRay|HDRip|x264|x265|HEVC|AAC|DTS/gi, '');
  s = s.replace(/[\.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

export default function AdminTeraboxTab({ movies, onUpdateMovie, onAddMovie }: { movies: Movie[], onUpdateMovie: Function, onAddMovie: Function }) {

  // ── Single-content add ──────────────────────────────────────────
  const [singleUrl, setSingleUrl] = useState('');
  const [singleFetching, setSingleFetching] = useState(false);
  const [singleResult, setSingleResult] = useState<{ filename: string; tmdb: any; rawUrl: string } | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [singleAdding, setSingleAdding] = useState(false);
  const [singleTmdbQuery, setSingleTmdbQuery] = useState('');
  const [singleTmdbResults, setSingleTmdbResults] = useState<any[]>([]);
  const [singleTmdbSearching, setSingleTmdbSearching] = useState(false);

  // ── Folder scanner ──────────────────────────────────────────────
  const [folderUrl, setFolderUrl] = useState('');
  const [folderScanning, setFolderScanning] = useState(false);
  const [folderResults, setFolderResults] = useState<any[]>([]);
  const [scanningStatus, setScanningStatus] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const [conflict, setConflict] = useState<{
    newMovie: Partial<Movie>;
    existingMovie: Movie;
    resolve: (decision: 'replace' | 'skip') => void;
  } | null>(null);

  // ── Mass updater ────────────────────────────────────────────────
  const [updatingMode, setUpdatingMode] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  // ── Quick tester ────────────────────────────────────────────────
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ────────────────────────────────────────────────────────────────
  // Single-content helpers
  // ────────────────────────────────────────────────────────────────
  const handleFetchSingle = async () => {
    if (!singleUrl) return;
    setSingleFetching(true);
    setSingleError(null);
    setSingleResult(null);
    setSingleTmdbResults([]);

    try {
      const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(singleUrl)}&quality=1080p`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na API');

      const vid = data.list && data.list.length > 0 ? data.list[0] : data;
      const filename = vid.filename || vid.name || 'Vídeo';

      const searchName = cleanForTmdb(filename);
      setSingleTmdbQuery(searchName);

      const tmdbRes = await tmdb.get(`/search/multi?query=${encodeURIComponent(searchName)}`);
      const tmdbMatch = tmdbRes.data.results?.[0] || null;

      setSingleResult({ filename, tmdb: tmdbMatch, rawUrl: singleUrl });
    } catch (err: any) {
      setSingleError(err.message);
    } finally {
      setSingleFetching(false);
    }
  };

  const handleSearchTmdb = async () => {
    if (!singleTmdbQuery) return;
    setSingleTmdbSearching(true);
    try {
      const tmdbRes = await tmdb.get(`/search/multi?query=${encodeURIComponent(singleTmdbQuery)}`);
      setSingleTmdbResults(tmdbRes.data.results?.slice(0, 8) || []);
    } catch {
    } finally {
      setSingleTmdbSearching(false);
    }
  };

  const handleAddSingle = async () => {
    if (!singleResult) return;
    setSingleAdding(true);
    const t = singleResult.tmdb;
    const type = t ? (t.media_type === 'tv' ? 'series' : 'movie') : 'movie';
    const genreNames = t?.genre_ids ? t.genre_ids.map((id: number) => GENRE_MAP[id] || '').filter(Boolean).join(', ') || 'Outros' : 'Outros';

    const newMovie: Partial<Movie> = {
      title: t ? (t.title || t.name) : singleResult.filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, ''),
      name: t ? (t.name || t.title) : singleResult.filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, ''),
      original_name: t?.original_name || t?.original_title,
      overview: t?.overview || 'Adicionado via Terabox',
      backdrop_path: t?.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : 'https://picsum.photos/seed/terabox/1920/1080',
      poster_path: t?.poster_path ? `https://image.tmdb.org/t/p/original${t.poster_path}` : 'https://picsum.photos/seed/terabox/500/750',
      type,
      genres: genreNames,
      videoUrl: singleResult.rawUrl,
      file_name: singleResult.filename,
      release_date: t?.release_date || t?.first_air_date,
      vote_average: t?.vote_average,
    };

    try {
      await onAddMovie(newMovie);
      alert(`"${newMovie.title}" adicionado!`);
      setSingleResult(null);
      setSingleUrl('');
      setSingleTmdbResults([]);
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setSingleAdding(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Folder scanner
  // ────────────────────────────────────────────────────────────────
  const handleScanFolder = async () => {
    if (!folderUrl) return;
    setFolderScanning(true);
    setScanningStatus('Extraindo lista da pasta...');
    setFolderResults([]);

    try {
      const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(folderUrl)}&quality=1080p`);
      const data = await res.json();
      if (!res.ok) throw new Error(`${data.error}: ${data.details || ''}`);

      let list = data.list || [];
      if (!list.length && data.url) list = [data];

      setScanningStatus(`Rastreando ${list.length} arquivos no TMDB...`);

      const TERABOX_DOMAINS = ['terabox.com', 'teraboxapp.com', 'dubox.com', 'nephobox.com',
        '1024terabox.com', 'freeterabox.com', '4funbox.com', 'mirrobox.com',
        'momerybox.com', 'teraboxlink.com', 'terafileshare.com'];
      const isTeraboxShare = (u?: string) =>
        !!u && TERABOX_DOMAINS.some(d => u.includes(d));

      const mapped = [];
      for (const item of list) {
        const filename = item.filename || item.name || 'Desconhecido';

        // Priority:
        // 1. recommended_url (fast_stream HLS token) → plays directly via HLS.js
        // 2. surl/share_url that is a raw Terabox domain → player resolves fresh token at play time
        // 3. dlink/normal_dlink (direct download) → goes through /api/video-proxy as last resort
        const rawUrl =
          item.recommended_url ||
          (isTeraboxShare(item.surl) ? item.surl : null) ||
          (isTeraboxShare(item.share_url) ? item.share_url : null) ||
          item.dlink || item.normal_dlink || item.url || folderUrl;

        const searchName = cleanForTmdb(filename);
        const resSearch = await tmdb.get(`/search/multi?query=${encodeURIComponent(searchName)}`);
        const bestMatch = resSearch.data.results?.[0] || null;

        mapped.push({ imported_filename: filename, url: rawUrl, tmdb_match: bestMatch, selected: true });
      }

      setFolderResults(mapped);
      setScanningStatus('Concluído. Revise e adicione.');
    } catch (err: any) {
      alert('Erro na varredura: ' + err.message);
      setScanningStatus('Erro na varredura.');
    } finally {
      setFolderScanning(false);
    }
  };

  const handleSaveScanned = async () => {
    const toSave = folderResults.filter(r => r.selected);
    if (!toSave.length) return alert('Nenhum item selecionado.');
    setSaveLoading(true);
    let errorCount = 0;
    const getYear = (date?: string) => date ? new Date(date).getFullYear() : null;

    try {
      for (const item of toSave) {
        const t = item.tmdb_match;
        const type = t ? (t.media_type === 'tv' ? 'series' : 'movie') : 'movie';
        const genreNames = t?.genre_ids ? t.genre_ids.map((id: number) => GENRE_MAP[id] || '').filter(Boolean).join(', ') || 'Outros' : 'Outros';

        const newMovie: Partial<Movie> = {
          title: t ? (t.title || t.name) : item.imported_filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, ''),
          name: t ? (t.name || t.title) : item.imported_filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, ''),
          original_name: t?.original_name || t?.original_title,
          overview: t?.overview || 'Adicionado via Terabox API',
          backdrop_path: t?.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : 'https://picsum.photos/seed/terabox/1920/1080',
          poster_path: t?.poster_path ? `https://image.tmdb.org/t/p/original${t.poster_path}` : 'https://picsum.photos/seed/terabox/500/750',
          type,
          genres: genreNames,
          videoUrl: item.url,
          file_name: item.imported_filename,
          release_date: t?.release_date || t?.first_air_date,
        };

        const existing = movies.find(m => {
          const matchTitle = (m.title || m.name)?.toLowerCase() === (newMovie.title || newMovie.name)?.toLowerCase();
          const matchYear = getYear(m.release_date || m.first_air_date) === getYear(newMovie.release_date);
          return matchTitle && matchYear;
        });

        if (existing) {
          setScanningStatus(`Conflito: ${newMovie.title} já existe.`);
          const decision = await new Promise<'replace' | 'skip'>((resolve) => {
            setConflict({ newMovie, existingMovie: existing, resolve });
          });
          setConflict(null);
          if (decision === 'skip') continue;
          try { await onUpdateMovie({ ...existing, ...newMovie, id: existing.id }); } catch { errorCount++; }
          continue;
        }

        try { await onAddMovie(newMovie); } catch { errorCount++; }
      }

      if (errorCount === 0) { alert('Conteúdos adicionados!'); setFolderResults([]); setFolderUrl(''); }
      else alert(`${toSave.length - errorCount} adicionados, ${errorCount} erros.`);
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Mass updater (legacy)
  // ────────────────────────────────────────────────────────────────
  const isRawTerabox = (url: string | undefined): boolean =>
    !!url && ['terabox.com', 'teraboxapp.com', 'dubox.com', 'nephobox.com', '1024terabox.com',
              'freeterabox.com', '4funbox.com', 'mirrobox.com', 'momerybox.com',
              'teraboxlink.com', 'terafileshare.com'].some(d => url.includes(d));

  const teraboxMovies = movies.filter(m => isRawTerabox(m.videoUrl) || m.episodes?.some(ep => isRawTerabox(ep.videoUrl)));

  const getDirectLinkFromApi = async (url: string) => {
    const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(url)}&quality=1080p`);
    const data = await res.json();
    if (!res.ok) throw new Error(`${data.error}: ${data.details || ''}`);
    const vid = data.list && data.list.length > 0 ? data.list[0] : data;
    return vid.recommended_url || vid.fast_stream_url?.['1080p'] || vid.fast_stream_url?.['720p'] ||
           vid.fast_stream_url?.['480p'] || vid.fast_stream_url?.['360p'] ||
           vid.normal_dlink || vid.url || vid.stream_url || vid.dlink || url;
  };

  const processUpdateSingle = async (movie: Movie) => {
    try {
      let needsUpdate = false;
      let newVideoUrl = movie.videoUrl;
      let newEpisodes = movie.episodes ? [...movie.episodes] : [];
      let updatedCount = 0;

      if (isRawTerabox(movie.videoUrl)) {
        try {
          const newUrl = await getDirectLinkFromApi(movie.videoUrl!);
          if (newUrl && newUrl !== movie.videoUrl) { newVideoUrl = newUrl; needsUpdate = true; updatedCount++; }
        } catch (e: any) { console.log(`Pulo: ${movie.title} - ${e.message}`); }
      }

      if (movie.episodes) {
        for (let i = 0; i < newEpisodes.length; i++) {
          const ep = newEpisodes[i];
          if (isRawTerabox(ep.videoUrl)) {
            try {
              const newUrl = await getDirectLinkFromApi(ep.videoUrl!);
              if (newUrl && newUrl !== ep.videoUrl) { newEpisodes[i] = { ...ep, videoUrl: newUrl }; needsUpdate = true; updatedCount++; }
            } catch (e: any) { console.log(`Pulo ep ${ep.episode}: ${e.message}`); }
          }
        }
      }

      if (needsUpdate) {
        await onUpdateMovie({ ...movie, videoUrl: newVideoUrl, episodes: newEpisodes });
        setUpdateLog(prev => [`[OK] ${movie.title || movie.name} (${updatedCount} links).`, ...prev]);
      } else {
        setUpdateLog(prev => [`[Ignorado] ${movie.title || movie.name}`, ...prev]);
      }
    } catch (e: any) {
      setUpdateLog(prev => [`[ERRO] ${movie.title || movie.name}: ${e.message}`, ...prev]);
    }
  };

  const handleUpdateAll = async () => {
    if (!confirm(`Processar ${teraboxMovies.length} itens?`)) return;
    setUpdating(true);
    setUpdateLog([]);
    for (const movie of teraboxMovies) {
      await processUpdateSingle(movie);
      await new Promise(r => setTimeout(r, 2500));
    }
    setUpdating(false);
  };

  // ────────────────────────────────────────────────────────────────
  // Quick tester
  // ────────────────────────────────────────────────────────────────
  const handleTest = async () => {
    if (!testUrl) return;
    setLoading(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(testUrl)}&quality=1080p`);
      const data = await res.json();
      if (!res.ok) throw new Error(`${data.error}: ${data.details || ''}`);
      setTestResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const videoUrlToPlay = React.useMemo(() => {
    if (!testResult) return null;
    const vid = testResult.list && testResult.list.length > 0 ? testResult.list[0] : testResult;
    const url = vid.recommended_url || vid.fast_stream_url?.['1080p'] || vid.fast_stream_url?.['720p'] ||
                vid.fast_stream_url?.['480p'] || vid.fast_stream_url?.['360p'] ||
                vid.normal_dlink || vid.stream_url || vid.url || vid.src || vid.dlink;
    if (url && (url.includes('workers.dev') || url.includes('.m3u8') || url.includes('fast_stream'))) {
      return url;
    }
    return url;
  }, [testResult]);

  useEffect(() => {
    if (!videoUrlToPlay || !videoRef.current) return;
    let hls: Hls | null = null;
    if (videoUrlToPlay.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(videoUrlToPlay);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = videoUrlToPlay;
      }
    } else {
      videoRef.current.src = videoUrlToPlay;
    }
    return () => { if (hls) hls.destroy(); };
  }, [videoUrlToPlay]);

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-8">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-cyan-400">
          <Database size={36} /> Terabox Pro API
        </h2>
        <p className="text-gray-400 text-sm mt-2">
          Adicione conteúdo pelo link do Terabox — o link de stream é gerado automaticamente toda vez que o usuário apertar play.
        </p>
      </div>

      {/* Status */}
      <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="text-cyan-400" size={24} />
          <h3 className="text-xl font-bold">Como funciona</h3>
        </div>
        <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> API XAPIverse ativa
        </div>
        <p className="text-sm text-gray-400">
          Você armazena o link original do Terabox (ex: <code className="text-cyan-400">https://1024terabox.com/s/...</code>).
          Quando o usuário apertar play, o servidor gera um link de stream fresco automaticamente via <code className="text-cyan-300">/api/stream-url</code>.
          Sem tokens expirados, sem re-uploads.
        </p>
      </div>

      {/* ── Adicionar Conteúdo Individual ──────────────────────── */}
      <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30 rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-green-400">
          <Plus size={20} /> Adicionar Conteúdo Individual
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Cole um link de arquivo do Terabox. O sistema busca a info no TMDB e adiciona ao catálogo com o link original armazenado.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={singleUrl}
            onChange={e => setSingleUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetchSingle()}
            placeholder="https://1024terabox.com/s/..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500"
          />
          <button
            onClick={handleFetchSingle}
            disabled={singleFetching || !singleUrl}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          >
            {singleFetching ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            Buscar
          </button>
        </div>

        {singleError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-4">{singleError}</div>
        )}

        {singleResult && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <div className="flex gap-4">
              {singleResult.tmdb?.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w92${singleResult.tmdb.poster_path}`}
                  className="w-14 rounded-lg flex-shrink-0"
                  alt=""
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 mb-1">Arquivo detectado</div>
                <div className="text-xs text-gray-400 truncate mb-2">{singleResult.filename}</div>
                {singleResult.tmdb ? (
                  <>
                    <div className="text-sm font-bold text-white">{singleResult.tmdb.title || singleResult.tmdb.name}</div>
                    <div className="text-xs text-gray-400">{singleResult.tmdb.release_date || singleResult.tmdb.first_air_date} · {singleResult.tmdb.media_type === 'tv' ? 'Série' : 'Filme'}</div>
                  </>
                ) : (
                  <div className="text-xs text-yellow-400">Não encontrado no TMDB — será adicionado pelo nome do arquivo</div>
                )}
              </div>
            </div>

            {/* TMDB manual search */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={singleTmdbQuery}
                onChange={e => setSingleTmdbQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchTmdb()}
                placeholder="Buscar outro resultado no TMDB..."
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSearchTmdb}
                disabled={singleTmdbSearching}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all"
              >
                {singleTmdbSearching ? <RefreshCw size={12} className="animate-spin" /> : 'Procurar'}
              </button>
            </div>

            {singleTmdbResults.length > 0 && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {singleTmdbResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setSingleResult({ ...singleResult, tmdb: r }); setSingleTmdbResults([]); }}
                    className="w-full flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-left"
                  >
                    {r.poster_path
                      ? <img src={`https://image.tmdb.org/t/p/w45${r.poster_path}`} className="w-8 rounded" alt="" />
                      : <div className="w-8 h-12 bg-white/10 rounded" />
                    }
                    <div>
                      <div className="text-xs font-bold text-white">{r.title || r.name}</div>
                      <div className="text-[10px] text-gray-400">{r.release_date || r.first_air_date} · {r.media_type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleAddSingle}
              disabled={singleAdding}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {singleAdding ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Adicionar ao Catálogo
            </button>
          </div>
        )}
      </div>

      {/* ── Grid: Pasta + Atualizador ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-green-400">
            <FolderSearch size={20} /> Adicionar por Pasta
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Cole o link de uma pasta do Terabox. O sistema lista todos os arquivos, busca no TMDB e deixa você escolher quais adicionar.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={folderUrl}
              onChange={e => setFolderUrl(e.target.value)}
              placeholder="Link da pasta Terabox..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
            <button
              onClick={handleScanFolder}
              disabled={folderScanning || !folderUrl}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
            >
              {folderScanning ? <RefreshCw size={14} className="animate-spin" /> : <FolderSearch size={14} />}
              Escanear
            </button>
          </div>
          {scanningStatus && <div className="mt-3 text-xs text-green-400 font-bold">{scanningStatus}</div>}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-yellow-400">
            <RefreshCw size={20} /> Converter Links Antigos
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Conteúdos adicionados antes da nova API (links brutos do Terabox sem geração automática de stream).
            <strong className="text-yellow-400"> {teraboxMovies.length} itens encontrados.</strong>
          </p>
          <button
            onClick={() => setUpdatingMode(!updatingMode)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2"
          >
            Abrir Ferramenta de Conversão
          </button>
        </div>
      </div>

      {/* Folder results */}
      {folderResults.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-green-400">Resultados ({folderResults.length} arquivos)</h3>
            <button
              onClick={handleSaveScanned}
              disabled={saveLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {saveLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Adicionar Selecionados
            </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {folderResults.map((res, i) => (
              <div key={i} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  checked={res.selected}
                  onChange={(e) => { const copy = [...folderResults]; copy[i].selected = e.target.checked; setFolderResults(copy); }}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{res.imported_filename}</div>
                  <div className="text-xs text-gray-400 truncate mt-1">
                    TMDB: {res.tmdb_match ? (res.tmdb_match.title || res.tmdb_match.name) : <span className="text-red-400">Não encontrado</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mass updater */}
      {updatingMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-yellow-500">Links Terabox Antigos</h3>
            <button
              onClick={handleUpdateAll}
              disabled={updating || teraboxMovies.length === 0}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
            >
              {updating ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Converter Todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {teraboxMovies.map((m, i) => (
                <div key={i} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                  <img src={m.backdrop_path || m.poster_path} className="w-16 h-10 object-cover rounded" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{m.title || m.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{m.videoUrl}</div>
                  </div>
                  <button
                    onClick={async () => { setUpdating(true); await processUpdateSingle(m); setUpdating(false); }}
                    disabled={updating}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
                  >
                    <RefreshCw size={14} className="text-yellow-500" />
                  </button>
                </div>
              ))}
              {teraboxMovies.length === 0 && <div className="text-sm text-gray-500 p-4">Nenhum conteúdo com link bruto do Terabox.</div>}
            </div>
            <div className="bg-black/60 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-gray-300 h-96 overflow-y-auto">
              <div className="text-yellow-500 font-bold mb-2 uppercase">Log</div>
              {updateLog.map((log, i) => (
                <div key={i} className={`mb-1 ${log.includes('[ERRO]') ? 'text-red-400' : log.includes('Ignorado') ? 'text-gray-500' : 'text-green-400'}`}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick tester */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <LinkIcon className="text-gray-400" size={20} /> Testador Rápido
        </h3>
        <p className="text-sm text-gray-400 mb-4">Teste a extração de stream de qualquer link Terabox sem adicionar ao catálogo.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testUrl}
            onChange={e => setTestUrl(e.target.value)}
            placeholder="https://terabox.com/..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleTest}
            disabled={loading || !testUrl}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={18} />}
            Testar
          </button>
        </div>

        {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

        {videoUrlToPlay && (
          <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-black">
            <div className="bg-white/5 p-3 flex items-center gap-2 border-b border-white/10">
              <Video size={16} className="text-cyan-400" />
              <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Preview</span>
            </div>
            <video ref={videoRef} controls className="w-full aspect-video outline-none" autoPlay />
          </div>
        )}

        {testResult && (
          <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl overflow-x-auto">
            <h4 className="font-bold text-gray-300 mb-2 text-sm uppercase">Resultado bruto da API</h4>
            <pre className="text-xs text-green-400 whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Conflict modal */}
      {conflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 bg-gradient-to-r from-red-500/10 to-transparent">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                <RefreshCw className="text-red-500" /> Conteúdo Existente
              </h3>
              <p className="text-gray-400 text-sm mt-1">Já existe um conteúdo com o mesmo nome. O que deseja fazer?</p>
            </div>
            <div className="p-8 grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">No catálogo</div>
                <div className="relative aspect-[2/3] rounded-3xl overflow-hidden border-2 border-white/5">
                  <img src={conflict.existingMovie.poster_path} className="w-full h-full object-cover opacity-50 grayscale" alt="" />
                </div>
                <div className="text-sm font-bold text-gray-300">{conflict.existingMovie.title || conflict.existingMovie.name}</div>
              </div>
              <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest text-green-500 font-bold">Novo</div>
                <div className="relative aspect-[2/3] rounded-3xl overflow-hidden border-2 border-green-500/30">
                  <img src={conflict.newMovie.poster_path} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="text-sm font-bold text-white">{conflict.newMovie.title || conflict.newMovie.name}</div>
              </div>
            </div>
            <div className="p-8 bg-white/5 flex flex-col md:flex-row gap-4">
              <button
                onClick={() => conflict.resolve('replace')}
                className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest italic hover:scale-105 transition-all text-sm"
              >
                Substituir
              </button>
              <button
                onClick={() => conflict.resolve('skip')}
                className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest italic hover:bg-white/10 transition-all text-sm"
              >
                Pular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
