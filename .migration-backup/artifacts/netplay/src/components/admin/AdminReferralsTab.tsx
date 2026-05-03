import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Loader2 } from 'lucide-react';

export default function AdminReferralsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const tokenResp = await supabase.auth.getSession();
      const access_token = tokenResp.data.session?.access_token;
      
      const res = await fetch('/api/admin/referrals/requests', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      } else {
        const err = await res.json().catch(()=>({}));
        if (err.error?.includes('service key not configured')) {
            setApiError('A chave SUPABASE_SERVICE_ROLE_KEY não está configurada no backend.');
        } else if (err.error?.includes('missing') || err.error?.includes('42P01')) {
            setApiError('A tabela referral_requests não existe no banco. Por favor, crie-a rodando o SQL fornecido abaixo.');
        } else {
            setApiError(err.error || 'Erro desconhecido');
        }
      }
    } catch {
      setApiError('Não foi possível conectar ao backend local.');
    }
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const tokenResp = await supabase.auth.getSession();
      const access_token = tokenResp.data.session?.access_token;
      
      const res = await fetch('/api/admin/referrals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
        body: JSON.stringify({ requestId: id, status })
      });
      if (res.ok) {
        fetchRequests();
      } else {
        alert('Erro ao atualizar status');
      }
    } catch {
      alert('Erro general');
    }
  };

  if (loading) return <div className="text-white p-4">Carregando resgates...</div>;

  return (
    <div>
      <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6">Resgates de Indicação</h2>
      
      {apiError && (
        <div className="mb-6 p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Aviso de Sistema:</strong> {apiError}
          {apiError.includes('tabela') && (
            <div className="mt-4 p-4 bg-black rounded whitespace-pre overflow-x-auto text-xs text-gray-300 font-mono">
{`CREATE TABLE referral_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  whatsapp TEXT,
  referral_count INTEGER,
  credits INTEGER,
  free_months INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
            </div>
          )}
        </div>
      )}

      <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/50 text-xs uppercase font-bold tracking-widest">
            <tr>
              <th className="p-4 rounded-tl-xl">Usuário</th>
              <th className="p-4">WhatsApp</th>
              <th className="p-4">Indicações</th>
              <th className="p-4">Recompensa</th>
              <th className="p-4">Status</th>
              <th className="p-4 rounded-tr-xl">Ação</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="p-4 font-bold">{r.email || r.user_id}</td>
                <td className="p-4 font-mono text-xs">{r.whatsapp || '-'}</td>
                <td className="p-4">{r.referral_count}</td>
                <td className="p-4 text-green-400 font-bold">
                  {r.free_months > 0 ? `${r.free_months} Mês Grátis` : `R$ ${r.credits},00`}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs uppercase tracking-widest font-bold ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : r.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {r.status === 'pending' ? 'Pendente' : r.status === 'approved' ? 'Aprovado' : 'Recusado'}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(r.id, 'approved')} className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors" title="Aprovar e Conceder">
                        <Check size={16} />
                      </button>
                      <button onClick={() => updateStatus(r.id, 'denied')} className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors" title="Recusar">
                        <X size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && !apiError && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                  Nenhum resgate solicitado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
