import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Mail, Lock, FileText, ArrowRight, Gift, Check} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  cpf: z.string().min(11, 'CPF inválido (mínimo 11 números)'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export default function Register() {
  const { registerUser, login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [activatingTrial, setActivatingTrial] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data) => {
    try {
      console.log("Iniciando registro...", data);
      
      // 1. Cria o usuário
      await registerUser(data);
      toast.success('Conta criada com sucesso!');
      
      // 2. Faz Login Automático
      console.log("Realizando login automático...");
      await login(data.email, data.password);
      
      // 3. Abre Modal de Oferta de Trial em vez de redirecionar direto
      setShowTrialModal(true);

    } catch (error) {
      console.error("Erro no registro:", error);
      const msg = error.response?.data?.detail || 'Erro ao criar conta. Verifique os dados.';
      toast.error(msg);
    }
  };

  // Callback para erros de validação (se o form não estiver enviando)
  const onError = (errors) => {
    console.log("Erros de validação:", errors);
    toast.error("Verifique os campos em vermelho.");
  };

  const handleAcceptTrial = async () => {
      setActivatingTrial(true);
      try {
          // Chama a rota específica solicitada
          await api.post('/auth/trial');
          
          // Atualiza dados do usuário no contexto para refletir o plano novo
          await refreshUser();
          
          toast.success("Parabéns! Seus 14 dias grátis começaram.");
          navigate('/dashboard');
      } catch (error) {
          console.error("Erro ao ativar trial:", error);
          toast.error("Não foi possível ativar o trial. Redirecionando...");
          navigate('/dashboard');
      } finally {
          setActivatingTrial(false);
      }
  };

  const handleDeclineTrial = () => {
      navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* BACKGROUND DECORATION */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-3xl"></div>
          <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-100 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Crie sua conta</h1>
          <p className="text-gray-500 mt-2">Comece a gerenciar seu negócio hoje.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          <Input 
            label="Nome Completo" 
            icon={User} 
            placeholder="Seu nome"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input 
            label="Email" 
            type="email"
            icon={Mail} 
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input 
            label="CPF" 
            icon={FileText} 
            placeholder="000.000.000-00"
            error={errors.cpf?.message}
            {...register('cpf')}
          />
          <Input 
            label="Senha" 
            type="password" 
            icon={Lock} 
            placeholder="••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full mt-6 font-bold"
            isLoading={isSubmitting}
            type="submit"
          >
            Criar Conta <ArrowRight size={18} />
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Já tem uma conta? <Link to="/login" className="text-brand-dark font-bold hover:underline">Fazer Login</Link>
        </div>
      </div>

      {/* MODAL DE OFERTA TRIAL (Pós-Registro) */}
      {showTrialModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                  <div className="bg-brand-yellow p-8 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg text-brand-dark relative z-10">
                          <Gift size={40} strokeWidth={2.5} />
                      </div>
                      <h2 className="text-3xl font-black text-brand-dark relative z-10">Presente de Boas-vindas!</h2>
                      <p className="text-brand-dark/80 font-bold mt-2 relative z-10">Experimente o plano PRO sem compromisso.</p>
                  </div>
                  
                  <div className="p-8">
                      <div className="space-y-4 mb-8">
                          <div className="flex items-center gap-3 text-gray-700">
                              <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={16} strokeWidth={3} /></div>
                              <span className="font-medium">Acesso total ao Dashboard Financeiro</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-700">
                              <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={16} strokeWidth={3} /></div>
                              <span className="font-medium">Emissão de NFC-e Ilimitada</span>
                          </div>
                          <div className="flex items-center gap-3 text-gray-700">
                              <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={16} strokeWidth={3} /></div>
                              <span className="font-medium">Gestão de Estoque Avançada</span>
                          </div>
                      </div>

                      <div className="flex flex-col gap-3">
                          <Button 
                              size="xl" 
                              className="w-full font-black text-lg shadow-xl shadow-yellow-200"
                              onClick={handleAcceptTrial}
                              isLoading={activatingTrial}
                          >
                              QUERO 14 DIAS GRÁTIS
                          </Button>
                          <button 
                              onClick={handleDeclineTrial}
                              className="text-gray-400 font-bold text-sm hover:text-gray-600 py-2 transition-colors"
                          >
                              Não, obrigado. Quero o plano básico.
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}