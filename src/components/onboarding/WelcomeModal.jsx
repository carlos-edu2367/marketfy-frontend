import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { X, Gift, CheckCircle, TrendingUp, Package, PieChart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Verifica se já viu o modal
    const hasSeen = localStorage.getItem(`welcome_seen_${user?.id}`);
    if (!hasSeen && user) {
        // Pequeno delay para animação de entrada ficar suave
        setTimeout(() => setIsOpen(true), 1000);
    }
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    if (user?.id) {
        localStorage.setItem(`welcome_seen_${user.id}`, 'true');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in">
        
        {/* Lado Esquerdo - Visual */}
        <div className="bg-brand-yellow w-full md:w-5/12 p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 0 L100 100 L0 100 Z" fill="white" />
                </svg>
            </div>
            
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-6 text-brand-dark">
                    <Gift size={32} />
                </div>
                <h2 className="text-3xl font-black text-brand-dark leading-tight mb-2">
                    Bem-vindo ao Marketfy!
                </h2>
                <p className="text-brand-dark/80 font-medium">
                    Seu período de teste Premium começou. Aproveite tudo sem limites.
                </p>
            </div>

            <div className="relative z-10 mt-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-dark/60 mb-1">Seu Plano Atual</p>
                    <p className="text-2xl font-black text-brand-dark">PRO Trial 14 Dias</p>
                </div>
            </div>
        </div>

        {/* Lado Direito - Conteúdo */}
        <div className="flex-1 p-8 md:p-10 bg-white relative">
            <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={24} />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-6">O que você pode fazer agora:</h3>

            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="bg-blue-50 p-3 rounded-xl h-fit text-blue-600">
                        <Package size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Gerenciar Estoque</h4>
                        <p className="text-sm text-gray-500 mt-1">Cadastre produtos, ajuste quantidades e use o leitor de código de barras.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-green-50 p-3 rounded-xl h-fit text-green-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Vender no PDV</h4>
                        <p className="text-sm text-gray-500 mt-1">Abra o caixa, realize vendas rápidas e emita comprovantes fiscais ou simples.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="bg-purple-50 p-3 rounded-xl h-fit text-purple-600">
                        <PieChart size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Acompanhar Finanças</h4>
                        <p className="text-sm text-gray-500 mt-1">Veja seu lucro, despesas e fluxo de caixa em tempo real no Dashboard.</p>
                    </div>
                </div>
            </div>

            <div className="mt-10 flex justify-end">
                <Button onClick={handleClose} size="lg" className="px-8 font-bold shadow-lg shadow-yellow-200">
                    Começar a Usar <CheckCircle size={18} className="ml-2" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}