import React, { useState, useEffect } from 'react';
import { X, QrCode, CreditCard, FileText, CheckCircle2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initMercadoPago } from '@mercadopago/sdk-react';
import { supabase } from '../lib/supabase';

if (import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY) {
  initMercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
}

interface PaymentCheckoutModalProps {
  planTitle: string;
  planPrice: number;
  planId: string;
  onClose: () => void;
  onSubmit: (method: string, payer: any) => Promise<any>;
}

export default function PaymentCheckoutModal({ planTitle, planPrice, planId, onClose, onSubmit }: PaymentCheckoutModalProps) {
  const [method, setMethod] = useState<'pix' | 'bolbradesco' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    cpf: '',
    phone: '',
    zipCode: '',
    streetName: '',
    streetNumber: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  useEffect(() => {
    const fetchBillingInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
      }
      if (user?.user_metadata?.billing_info) {
        setFormData(prev => ({ ...prev, ...user.user_metadata.billing_info }));
      }
    };
    fetchBillingInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save billing info to user_metadata
      await supabase.auth.updateUser({
        data: { billing_info: formData }
      });

      const payer = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        identification: {
          type: 'CPF',
          number: formData.cpf.replace(/\D/g, '')
        },
        address: {
          zip_code: formData.zipCode.replace(/\D/g, ''),
          street_name: formData.streetName,
          street_number: formData.streetNumber,
          neighborhood: formData.neighborhood,
          city: formData.city,
          federal_unit: formData.state
        }
      };

      const data = await onSubmit(method === 'credit_card' ? 'preference' : method, payer);
      if (data?.error) {
        throw new Error(data.details || data.error);
      }
      
      if (data?.point_of_interaction?.transaction_data) {
        setSuccessData(data);
      } else if (data?.transaction_details?.external_resource_url) {
        setSuccessData(data);
      } else if (data?.init_point) {
        setSuccessData(data);
      } else if (method !== 'credit_card') {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message ? `Erro ao gerar pagamento: ${error.message}` : 'Erro ao gerar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  if (successData) {
    const pixData = successData.point_of_interaction?.transaction_data;
    const boletoUrl = successData.transaction_details?.external_resource_url;
    const initPoint = successData.init_point;

    return (
      <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111] max-w-md w-full rounded-3xl border border-white/10 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full"></div>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 z-10"><X size={20} /></button>
          
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6 relative z-10" />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2 relative z-10">Pedido Gerado!</h2>
          <p className="text-sm font-bold text-gray-400 mb-8 relative z-10">
            {initPoint ? `Continue para o Mercado Pago para liberar o seu ${planTitle}.` : `Efetue o pagamento para liberar seu ${planTitle}.`}
          </p>

          {pixData && (
            <div className="space-y-6 relative z-10">
              <div className="bg-white p-4 rounded-xl inline-block">
                <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">PIX Copia e Cola</p>
                <div className="flex items-center gap-2 bg-black border border-white/10 rounded-xl p-3">
                  <input type="text" readOnly value={pixData.qr_code} className="bg-transparent flex-1 text-xs text-white outline-none" />
                  <button onClick={() => copyToClipboard(pixData.qr_code)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white"><Copy size={16} /></button>
                </div>
              </div>
            </div>
          )}

          {boletoUrl && (
            <div className="space-y-6 relative z-10">
              <FileText size={48} className="text-gray-400 mx-auto" />
              <p className="text-xs text-gray-400">Seu boleto foi gerado com sucesso. O pagamento pode levar até 2 dias úteis para ser compensado.</p>
              <a href={boletoUrl} target="_blank" rel="noreferrer" className="block w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">
                Imprimir / Ver Boleto
              </a>
            </div>
          )}

          {initPoint && (
            <div className="space-y-6 relative z-10">
               <a href={initPoint} target="_blank" rel="noreferrer" className="block w-full py-4 bg-[#009EE3] hover:bg-[#0089C5] text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors">
                 Pagar com Mercado Pago
               </a>
               <p className="text-xs text-gray-400">Caso a nova aba não tenha aberto automaticamente, clique no botão acima.</p>
            </div>
          )}

          <p className="text-xs text-green-400 font-bold mt-8 relative z-10 animate-pulse">Aguardando pagamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[#111] max-w-xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 p-6 md:p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white p-2 z-10"><X size={20} /></button>
        
        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-1 mt-2">Checkout</h2>
        <p className="text-sm font-bold text-gray-500 mb-6">{planTitle} - R$ {planPrice.toFixed(2).replace('.', ',')}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setMethod('pix')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${method === 'pix' ? 'border-[#00B1EA] bg-[#00B1EA]/10 text-[#00B1EA]' : 'border-white/5 hover:border-white/20 text-gray-400'}`}>
              <QrCode size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">PIX</span>
            </button>
            <button type="button" onClick={() => setMethod('bolbradesco')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${method === 'bolbradesco' ? 'border-gray-300 bg-gray-500/10 text-white' : 'border-white/5 hover:border-white/20 text-gray-400'}`}>
              <FileText size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest">Boleto</span>
            </button>
            <button type="button" onClick={() => setMethod('credit_card')} className={`col-span-2 p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${method === 'credit_card' ? 'border-red-600 bg-red-600/10 text-red-500' : 'border-white/5 hover:border-white/20 text-gray-400'}`}>
              <CreditCard size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Cartão de Crédito (Checkout)</span>
            </button>
          </div>

          <AnimatePresence>
            <motion.div key="common-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4 pt-4 border-t border-white/5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Dados de Pagamento</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Nome</label>
                  <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Sobrenome</label>
                  <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">CPF</label>
                  <input required type="text" placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Celular</label>
                  <input required type="text" placeholder="(11) 90000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                </div>
              </div>

              {method === 'bolbradesco' && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-6 mb-2">Endereço (Boleto)</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">CEP</label>
                      <input required={method === 'bolbradesco'} type="text" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Rua</label>
                      <input required={method === 'bolbradesco'} type="text" value={formData.streetName} onChange={e => setFormData({...formData, streetName: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Número</label>
                      <input required={method === 'bolbradesco'} type="text" value={formData.streetNumber} onChange={e => setFormData({...formData, streetNumber: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Bairro</label>
                      <input required={method === 'bolbradesco'} type="text" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Cidade</label>
                      <input required={method === 'bolbradesco'} type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600" />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">UF</label>
                      <input required={method === 'bolbradesco'} type="text" placeholder="SP" maxLength={2} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-red-600 uppercase" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {method === 'credit_card' && (
              <motion.div key="cc-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4 mt-4">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                  <p className="text-sm font-bold text-gray-300">Você será redirecionado para o ambiente seguro do Mercado Pago.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={loading} className="w-full py-4 mt-8 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-white/50 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : method === 'credit_card' ? 'Ir para o Checkout' : 'Gerar Pagamento'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
