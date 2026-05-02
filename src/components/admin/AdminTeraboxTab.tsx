import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Database, Link as LinkIcon, CheckCircle2, ShieldCheck, Play, Video, RefreshCw, FolderSearch, Plus, Save } from 'lucide-react';
import Hls from 'hls.js';
import { Movie } from '../../types';
import tmdb from '../../services/tmdb';

export default function AdminTeraboxTab({ movies, onUpdateMovie, onAddMovie }: { movies: Movie[], onUpdateMovie: Function, onAddMovie: Function }) {
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For Mass Import / Scanner
  const [folderUrl, setFolderUrl] = useState('');
  const [folderScanning, setFolderScanning] = useState(false);
  const [folderResults, setFolderResults] = useState<any[]>([]);
  const [scanningStatus, setScanningStatus] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // For Mass Update
  const [updatingMode, setUpdatingMode] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTest = async () => {
    if (!testUrl) return;
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(testUrl)}`);
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
    let vid = testResult.list && testResult.list.length > 0 ? testResult.list[0] : testResult;
    return vid.fast_stream_url?.['1080p'] || vid.fast_stream_url?.['720p'] || vid.fast_stream_url?.['480p'] || vid.fast_stream_url?.['360p'] || vid.normal_dlink || vid.stream_url || vid.url || vid.video_url || vid.src || (vid.data && vid.data.url) || vid.dlink;
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
    
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoUrlToPlay]);

  // Mass Import / Scan Folder
  const handleScanFolder = async () => {
    if (!folderUrl) return;
    setFolderScanning(true);
    setScanningStatus('Extraindo lista da pasta...');
    setFolderResults([]);
    
    try {
      const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(folderUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(`${data.error}: ${data.details || ''}`);
      
      let list = data.list || [];
      if (!list.length && data.url) {
        list = [data]; // single file fallback
      }

      setScanningStatus(`Rastreando ${list.length} arquivos no TMDB...`);

      const mapped = [];
      for (const item of list) {
        const filename = item.filename || item.name || 'Desconhecido';
        const urlToSave = item.fast_stream_url?.['1080p'] || item.fast_stream_url?.['720p'] || item.fast_stream_url?.['480p'] || item.fast_stream_url?.['360p'] || item.normal_dlink || item.url || item.dlink || item.stream_url || folderUrl;

        // Improve TMDB matching by removing years, qualities, and extensions
        let searchName = filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, '');
        searchName = searchName.replace(/[\(\[]\d{4}[\)\]]/g, ''); // Removes (2024) or [2024]
        searchName = searchName.replace(/720p|1080p|4k|2160p/gi, '');
        searchName = searchName.replace(/WEB-DL|WEBRip|BluRay|HDRip|x264|x265|HEVC/gi, '');
        searchName = searchName.replace(/[\.\-_]/g, ' ').replace(/\s+/g, ' ').trim();
        
        const resSearch = await tmdb.get(`/search/multi?query=${encodeURIComponent(searchName)}`);
        const searchRes = resSearch.data.results || [];
        let bestMatch = searchRes && searchRes.length > 0 ? searchRes[0] : null;

        mapped.push({
          imported_filename: filename,
          url: urlToSave,
          tmdb_match: bestMatch,
          selected: true
        });
      }

      setFolderResults(mapped);
      setScanningStatus('Concluído. Revise os itens e adicione.');
    } catch (err: any) {
      alert("Erro na varredura: " + err.message);
      setScanningStatus('Erro na varredura.');
    } finally {
      setFolderScanning(false);
    }
  };

  const handleSaveScanned = async () => {
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

    const toSave = folderResults.filter(r => r.selected);
    if (!toSave.length) return alert('Nenhum item selecionado.');
    
    setSaveLoading(true);
    let errorCount = 0;
    try {
      for (const item of toSave) {
        const t = item.tmdb_match;
        const type = t ? (t.media_type === 'tv' ? 'series' : 'movie') : 'movie';
        
        let genreNames = 'Outros';
        if (t && t.genre_ids) {
          genreNames = t.genre_ids.map((id: number) => GENRE_MAP[id]).filter(Boolean).join(', ') || 'Outros';
        }

        const newMovie: Partial<Movie> = {
          title: t ? (t.title || t.name) : item.imported_filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, ''),
          name: t ? (t.name || t.title) : item.imported_filename.replace(/\.(mp4|mkv|avi|webm|ts)$/i, ''),
          original_name: t ? (t.original_name || t.original_title) : undefined,
          overview: t ? t.overview : 'Adicionado via Terabox API (Info não encontrada)',
          backdrop_path: t?.backdrop_path ? `https://image.tmdb.org/t/p/original${t.backdrop_path}` : 'https://picsum.photos/seed/terabox/1920/1080',
          poster_path: t?.poster_path ? `https://image.tmdb.org/t/p/original${t.poster_path}` : 'https://picsum.photos/seed/terabox/500/750',
          type,
          genres: genreNames,
          videoUrl: item.url,
          videoUrl2: item.url,
          file_name: item.imported_filename
        };
        try {
          await onAddMovie(newMovie);
        } catch(e) {
          errorCount++;
        }
      }
      if (errorCount === 0) {
        alert("Conteúdos adicionados com sucesso!");
        setFolderResults([]);
        setFolderUrl('');
      } else {
        alert(`${toSave.length - errorCount} adicionados, ${errorCount} erros (alguns podem ser duplicados).`);
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Mass Update Links
  const teraboxMovies = movies.filter(m => {
    const isRawTerabox = (url: string | undefined): boolean => {
      return !!url && (url.includes('terabox.com') || url.includes('teraboxapp.com') || url.includes('dubox.com') || url.includes('nephobox.com') || url.includes('1024terabox.com') || url.includes('freeterabox.com') || url.includes('4funbox.com') || url.includes('mirrobox.com') || url.includes('momerybox.com') || url.includes('teraboxlink.com') || url.includes('terafileshare.com'));
    };
    const isTera = isRawTerabox(m.videoUrl);
    const hasTeraEpisodes = m.episodes?.some(ep => isRawTerabox(ep.videoUrl));
    return isTera || hasTeraEpisodes;
  });

  const getDirectLinkFromApi = async (url: string) => {
    const res = await fetch(`/api/terabox-pro?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(`${data.error}: ${data.details || ''}`);
    let vid = data.list && data.list.length > 0 ? data.list[0] : data;
    return vid.fast_stream_url?.['1080p'] || vid.fast_stream_url?.['720p'] || vid.fast_stream_url?.['480p'] || vid.fast_stream_url?.['360p'] || vid.normal_dlink || vid.url || vid.stream_url || vid.dlink || url;
  };

  const processUpdateSingle = async (movie: Movie) => {
    try {
      let needsUpdate = false;
      let newVideoUrl = movie.videoUrl;
      let newEpisodes = movie.episodes ? [...movie.episodes] : [];
      let updatedCount = 0;

      const isRawTerabox = (url: string | undefined): boolean => {
        return !!url && (url.includes('terabox.com') || url.includes('teraboxapp.com') || url.includes('dubox.com') || url.includes('nephobox.com') || url.includes('1024terabox.com') || url.includes('freeterabox.com') || url.includes('4funbox.com') || url.includes('mirrobox.com') || url.includes('momerybox.com') || url.includes('teraboxlink.com') || url.includes('terafileshare.com'));
      };

      if (isRawTerabox(movie.videoUrl)) {
         try {
           const newUrl = await getDirectLinkFromApi(movie.videoUrl!);
           if (newUrl && newUrl !== movie.videoUrl) {
              newVideoUrl = newUrl;
              needsUpdate = true;
              updatedCount++;
           }
         } catch(e: any) {
           console.log(`Pulo (Filme): ${movie.title} - ${e.message}`);
         }
      }

      if (movie.episodes) {
         for (let i = 0; i < newEpisodes.length; i++) {
           const ep = newEpisodes[i];
           if (isRawTerabox(ep.videoUrl)) {
              try {
                const newUrl = await getDirectLinkFromApi(ep.videoUrl!);
                if (newUrl && newUrl !== ep.videoUrl) {
                    newEpisodes[i] = { ...ep, videoUrl: newUrl };
                    needsUpdate = true;
                    updatedCount++;
                }
              } catch(e: any) {
                console.log(`Pulo (Ep ${ep.episode}): ${movie.title} - ${e.message}`);
              }
           }
         }
      }

      if (needsUpdate) {
         await onUpdateMovie({ ...movie, videoUrl: newVideoUrl, episodes: newEpisodes });
         setUpdateLog(prev => [`[OK] ${movie.title || movie.name} atualizado (${updatedCount} links).`, ...prev]);
      } else {
         setUpdateLog(prev => [`[Ignorado] ${movie.title || movie.name} (Links inalterados)`, ...prev]);
      }
    } catch (e: any) {
      setUpdateLog(prev => [`[ERRO] ${movie.title || movie.name}: ${e.message}`, ...prev]);
    }
  };

  const handleUpdateAll = async () => {
    if (!confirm(`Tem certeza que deseja processar ${teraboxMovies.length} filmes usando a API XAPIverse? Esta ação irá converter os links de origem para links diretos.`)) return;
    
    setUpdating(true);
    setUpdateLog([]);
    for (const movie of teraboxMovies) {
       await processUpdateSingle(movie);
       // Add a delay to avoid rate limiting
       await new Promise(r => setTimeout(r, 2500));
    }
    setUpdating(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-cyan-400">
          <Database size={36} /> Terabox Pro API
        </h2>
        <p className="text-gray-400 text-sm mt-2">
          Integração automática para links Terabox e KingX usando a API XAPIverse.
        </p>
      </div>

      <div className="bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="text-cyan-400" size={24} />
            <h3 className="text-xl font-bold">Status da Configuração</h3>
        </div>
        <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Ativo e Configurado no Servidor
        </div>
        <p className="text-sm text-gray-400 mt-2">
          O servidor está configurado para utilizar a chave de API <code>xAPIverse-Key</code>.
          O endpoint local <code>/api/terabox-pro</code> processará os links automaticamente no player e ferramentas abaixo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Scanner de Pastas */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
            <FolderSearch size={20} />
            Rastreio de Novos Conteúdos
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Cole um link de pasta do Terabox. O sistema fará a varredura (rastreio) e adicionará os arquivos encontrados automaticamente.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={folderUrl}
              onChange={e => setFolderUrl(e.target.value)}
              placeholder="Link da Pasta Terabox..."
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

        {/* Atualizador em Massa */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-yellow-400">
            <RefreshCw size={20} />
            Atualizar Links Antigos
          </h3>
          <p className="text-xs text-gray-400 mb-4">
             Converta links do KingX/Terabox no seu catálogo para os novos links diretos gerados pela API XAPIverse.
             <strong> {teraboxMovies.length} itens encontados.</strong>
          </p>
          <button
            onClick={() => setUpdatingMode(!updatingMode)}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2"
          >
            Abrir Ferramenta de Atualização
          </button>
        </div>
      </div>

      {folderResults.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-green-400">Resultados da Varredura ({folderResults.length})</h3>
             <button
                onClick={handleSaveScanned}
                disabled={saveLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
             >
                {saveLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                Adicionar Selecionados ao Catálogo
             </button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
             {folderResults.map((res, i) => (
                <div key={i} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                   <input 
                     type="checkbox" 
                     checked={res.selected}
                     onChange={(e) => {
                        const copy = [...folderResults];
                        copy[i].selected = e.target.checked;
                        setFolderResults(copy);
                     }}
                     className="w-4 h-4 rounded"
                   />
                   <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{res.imported_filename}</div>
                      <div className="text-xs text-gray-400 truncate mt-1">Match TMDB: {res.tmdb_match ? (res.tmdb_match.title || res.tmdb_match.name) : <span className="text-red-400">Não encontrado</span>}</div>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {updatingMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-yellow-500">Filmes/Séries com Terabox</h3>
             <button
                onClick={handleUpdateAll}
                disabled={updating || teraboxMovies.length === 0}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
             >
                {updating ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Otimizar Todos os Links
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
                        onClick={async () => {
                          setUpdating(true);
                          await processUpdateSingle(m);
                          setUpdating(false);
                        }}
                        disabled={updating}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
                        title="Atualizar link Individual"
                     >
                        <RefreshCw size={14} className="text-yellow-500" />
                     </button>
                  </div>
               ))}
               {teraboxMovies.length === 0 && <div className="text-sm text-gray-500 p-4">Nenhum conteúdo com Terabox/KingX.</div>}
            </div>
            <div className="bg-black/60 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-gray-300 h-96 overflow-y-auto">
               <div className="text-yellow-500 font-bold mb-2 uppercase">Log de Operações</div>
               {updateLog.map((log, i) => (
                  <div key={i} className={`mb-1 ${log.includes('[ERRO]') ? 'text-red-400' : log.includes('Ignorado') ? 'text-gray-500' : 'text-green-400'}`}>{log}</div>
               ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <LinkIcon className="text-gray-400" size={20} />
          Testador Rápido de Player
        </h3>
        <p className="text-sm text-gray-400 mb-4">Teste extrair e rodar um vídeo diretamente nesta tela.</p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={testUrl}
            onChange={e => setTestUrl(e.target.value)}
            placeholder="Ex: https://terabox.com/..."
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

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {videoUrlToPlay && (
          <div className="mt-8 rounded-xl overflow-hidden border border-white/10 bg-black">
            <div className="bg-white/5 p-3 flex items-center gap-2 border-b border-white/10">
              <Video size={16} className="text-cyan-400" />
              <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Preview do Vídeo</span>
            </div>
            <video 
              ref={videoRef}
              controls 
              className="w-full aspect-video outline-none"
              autoPlay
            />
          </div>
        )}

        {testResult && (
          <div className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl overflow-x-auto">
            <h4 className="font-bold text-gray-300 mb-2 text-sm uppercase">Resultado da Extração Bruto</h4>
            <pre className="text-xs text-green-400 whitespace-pre-wrap">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}

