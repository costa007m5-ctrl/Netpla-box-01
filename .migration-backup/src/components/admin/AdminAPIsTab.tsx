import React, { useEffect, useState } from 'react';
import { Server, CheckCircle2, XCircle } from 'lucide-react';

interface EnvStatus {
  hasUrl: boolean;
  hasKey: boolean;
  hasMPToken: boolean;
  NODE_ENV: string;
  host: string;
}

export function AdminAPIsTab() {
  const [status, setStatus] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/debug-env')
      .then(res => {
        if (!res.ok) throw new Error('API request failed');
        return res.json();
      })
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 md:space-y-12 pb-12">
      <div className="text-center md:text-left space-y-4">
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500 tracking-tighter uppercase font-mono">
          <Server className="inline-block w-8 h-8 md:w-12 md:h-12 mr-4 md:mr-6 -mt-2 md:-mt-4 text-teal-400" />
          Status das APIs
        </h2>
        <p className="text-lg md:text-xl text-gray-400 font-medium max-w-3xl">
          Verifique se as variáveis de ambiente das APIs estão corretas no lado do servidor.
        </p>
      </div>

      <section className="bg-white/5 p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="relative z-10">
          <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider flex items-center">
            Variáveis do Servidor
          </h3>
          
          {loading ? (
            <div className="text-gray-400 text-center py-8">Carregando status...</div>
          ) : error ? (
            <div className="text-red-400 text-center py-8 bg-red-500/10 rounded-2xl border border-red-500/20">
              Erro ao verificar APIs: {error}
            </div>
          ) : status ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatusCard 
                name="Supabase URL" 
                active={status.hasUrl} 
                desc="VITE_SUPABASE_URL ou SUPABASE_URL"
              />
              <StatusCard 
                name="Supabase Service Role" 
                active={status.hasKey} 
                desc="SUPABASE_SERVICE_ROLE_KEY"
              />
              <StatusCard 
                name="Mercado Pago Token" 
                active={status.hasMPToken} 
                desc="MERCADO_PAGO_ACCESS_TOKEN"
              />
              
              <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                <span className="text-gray-400 text-sm font-medium mb-1">Ambiente / Host</span>
                <span className="text-white font-mono text-sm break-all">{status.NODE_ENV || 'development'} ({status.host})</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function StatusCard({ name, active, desc }: { name: string; active: boolean; desc: string }) {
  return (
    <div className={`p-5 rounded-2xl border flex items-start gap-4 transition-all duration-300 ${active ? 'bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]'}`}>
      <div className="mt-1">
        {active ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : <XCircle className="w-6 h-6 text-red-500" />}
      </div>
      <div>
        <h4 className={`text-lg font-bold mb-1 ${active ? 'text-green-300' : 'text-red-400'}`}>{name}</h4>
        <p className="text-sm text-gray-400">{desc}</p>
        <p className={`text-xs mt-2 font-bold ${active ? 'text-green-500' : 'text-red-500'}`}>
          {active ? 'ATIVO NO SERVIDOR' : 'FALTANDO (ERRO)'}
        </p>
      </div>
    </div>
  );
}
