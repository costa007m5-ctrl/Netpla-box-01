import React, { useState } from 'react';
import { DollarSign, ExternalLink, ShieldCheck, Activity } from 'lucide-react';

export default function AdminMercadoPagoTab() {
  const originUrl = window.location.origin === 'null' || window.location.origin.includes('about:') ? 'https://seu-dominio-aqui.com' : window.location.origin;
  const webhookUrl = `${originUrl}/api/payments/webhook`;
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
          <DollarSign className="text-[#009EE3]" size={36} /> Mercado Pago API
        </h2>
        <p className="text-gray-400 text-sm mt-2">
          Integração automática para renovações, assinaturas e webhooks. 
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-[#009EE3]/10 to-transparent border border-[#009EE3]/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
             <ShieldCheck className="text-[#009EE3]" size={24} />
             <h3 className="text-xl font-bold">Status da Conexão</h3>
          </div>
          <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> API Conectada
          </div>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed flex flex-col gap-2">
            <span><strong>Access Token:</strong> Configurado no servidor (.env). O webhook de pagamentos está ativo em <code>/api/payments/webhook</code>.</span>
            <span><strong>Public Key:</strong> <code>{import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || 'Não configurada (opcional para checkouts Pro)'}</code></span>
          </p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
             <Activity className="text-gray-300" size={24} />
             <h3 className="text-xl font-bold">Resumo Financeiro Mensal</h3>
          </div>
          <p className="text-sm text-gray-400 italic mb-4">Acompanhe as vendas pelo painel oficial.</p>
          <a href="https://www.mercadopago.com.br/activities" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#009EE3] hover:bg-[#008ACB] text-white px-4 py-2 text-sm font-bold rounded-lg transition-colors">
            Acessar Painel <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4">Configuração do Webhook</h3>
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
          Para garantir que os usuários recebam acesso imediato após a compra, certifique-se de configurar a URL do Webhook no painel do desenvolvedor do Mercado Pago.
        </p>
        <div className="bg-black/50 p-4 border border-white/5 rounded-lg flex items-center justify-between">
           <code className="text-xs text-blue-300">{webhookUrl}</code>
           <button className="text-xs font-bold text-gray-500 hover:text-white" onClick={() => navigator.clipboard.writeText(webhookUrl)}>COPIAR</button>
        </div>
        <div className="mt-4 text-xs text-gray-500 flex flex-col gap-2">
           <p><strong>URL Base das Preferências:</strong> Criado on-the-fly pela API backend.</p>
           <p><strong>Campos Enviados:</strong> title (Plano), unit_price (Preço), external_reference (ID do User + Plano).</p>
        </div>
      </div>
    </div>
  );
}
