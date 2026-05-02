import React from 'react';
import { RefreshCw, X, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { Movie } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DuplicateResolveModalProps {
  newMovie: any;
  existingId: string | number;
  onResolve: (action: 'substitute' | 'continue') => void;
}

export default function DuplicateResolveModal({ newMovie, existingId, onResolve }: DuplicateResolveModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md animate-fade-in">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0f0f0f] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative"
      >
        <div className="p-8 border-b border-white/5 bg-gradient-to-r from-red-500/10 to-transparent flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
               <AlertTriangle className="text-red-500" />
               Conflito de Conteúdo
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Este título já existe no seu catálogo com o mesmo ano.
            </p>
          </div>
          <button 
            onClick={() => onResolve('continue')} 
            className="p-3 hover:bg-white/5 rounded-full text-gray-500"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
           <div className="flex items-center justify-center gap-6 md:gap-12 mb-8">
               <div className="flex flex-col items-center gap-3">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold italic">No Catálogo</div>
                  <div className="w-32 md:w-40 aspect-[2/3] rounded-3xl overflow-hidden border-2 border-white/5 shadow-lg relative">
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Layers className="text-white/30" size={32} />
                     </div>
                  </div>
                  <div className="text-sm font-bold text-gray-400 text-center max-w-[120px] truncate">{newMovie.title}</div>
               </div>

               <div className="flex items-center justify-center">
                  <ArrowRight className="text-white/20" size={32} />
               </div>

               <div className="flex flex-col items-center gap-3">
                  <div className="text-[10px] uppercase tracking-widest text-green-500 font-bold italic">Novo Escaneado</div>
                  <div className="w-32 md:w-40 aspect-[2/3] rounded-3xl overflow-hidden border-2 border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                     <img src={newMovie.poster_path} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  </div>
                  <div className="text-sm font-bold text-white text-center max-w-[120px] truncate">{newMovie.title}</div>
               </div>
           </div>

           <div className="space-y-4">
              <button
                onClick={() => onResolve('substitute')}
                className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest italic hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                Substituir Existente
              </button>
              
              <button
                onClick={() => onResolve('continue')}
                className="w-full bg-white/5 border border-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-widest italic hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
              >
                Continuar (Pular Arquivo)
              </button>
           </div>
           
           <p className="text-center text-[10px] text-gray-500 mt-6 uppercase tracking-widest font-bold">
             A substituição atualizará o link do vídeo e as informações do TMDB do conteúdo existente.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
