import React, { useState } from 'react';
import { Bell, Send, Check, AlertCircle } from 'lucide-react';

export const AdminOneSignalTab: React.FC = () => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const onesignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;

  const handleTestNotification = async () => {
    setIsSending(true);
    setTestStatus(null);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Teste de OneSignal',
          message: 'Notificação teste enviada do painel de administração!',
        }),
      });

      if (response.ok) {
        setTestStatus('Notificação enviada com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta:', errorData);
        setTestStatus('Falha ao enviar: ' + (errorData.error || 'Erro desconhecido. Verifique se ONESIGNAL_REST_API_KEY e VITE_ONESIGNAL_APP_ID estão configurados.'));
      }
    } catch (error) {
      console.error('Erro:', error);
      setTestStatus('Erro de rede ao enviar notificação.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-12">
      <section className="bg-white/5 p-6 md:p-12 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full -mr-48 -mt-48 transition-colors group-hover:bg-red-600/10"></div>
        
        <div className="mb-10 relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center border border-red-600/30">
            <Bell className="text-red-500 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-black text-xl md:text-3xl italic uppercase tracking-tighter">
              OneSignal Push Notifications
            </h3>
            <p className="text-gray-500 font-bold italic text-sm mt-1">Configuração e Testes</p>
          </div>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="bg-black/40 border border-white/5 p-6 rounded-2xl">
            <h4 className="text-white font-bold mb-4">Chaves de API Configuradas:</h4>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">VITE_ONESIGNAL_APP_ID (Frontend/Backend)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    readOnly 
                    value={onesignalAppId || 'Não configurado nas variáveis de ambiente'} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/50"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Esta chave deve ser pública (no arquivo .env) e também configurada na plataforma.</p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 block">ONESIGNAL_REST_API_KEY (Backend)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="password" 
                    readOnly 
                    value="*************************" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/50"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Esta chave é secreta e só fica acessível no servidor (Node/Express). Configurada via Secrets da hospedagem.</p>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 p-6 rounded-2xl">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-red-500" /> Disparo de Teste
            </h4>
            <p className="text-sm text-gray-400 mb-6">Esta ação usará o servidor Node.js para enviar uma notificação web push para todos os inscritos (Subscribed Users).</p>
            
            <button 
              onClick={handleTestNotification}
              disabled={isSending}
              className="bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600 hover:text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSending ? 'Enviando...' : 'Enviar Notificação de Teste'}
              {!isSending && <Bell className="w-4 h-4 text-current" />}
            </button>

            {testStatus && (
              <div className={`mt-4 p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${testStatus.includes('sucesso') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {testStatus.includes('sucesso') ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {testStatus}
              </div>
            )}
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl">
            <h4 className="text-blue-400 font-bold mb-2">Supabase Webhook Automation</h4>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-2">
              <li>Na ferramenta Supabase vá em: <strong>Database &gt; Webhooks</strong> e crie.</li>
              <li><strong>Name:</strong> <code>onesignal_movies</code> ou algo de sua preferência (sem espaços).</li>
              <li><strong>Table:</strong> Escolha <code>movies</code> ou <code>series</code> e marque eventos <strong>Insert</strong>.</li>
              <li><strong>Type:</strong> HTTP Request</li>
              <li><strong>Method:</strong> POST</li>
              <li><strong>URL (Copie este valor):</strong> <code className="bg-black/50 px-2 py-1 rounded text-red-400 break-all">{window.location.origin}/api/webhooks/supabase/onesignal</code></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
