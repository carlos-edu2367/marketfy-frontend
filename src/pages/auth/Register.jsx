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

  // Função para truncar a senha em 72 bytes (limite do bcrypt)
  const truncateTo72Bytes = (str) => {
    const encoder = new TextEncoder();
    let result = str;
    while (encoder.encode(result).length > 72) {
      result = result.slice(0, -1);
    }
    return result;
  };

  const onSubmit = async (data) => {
    try {
      // 1. Sanitiza a senha
      const safePassword = truncateTo72Bytes(data.password);
      const userData = { ...data, password: safePassword };

      // 2. Registra o usuário com a senha tratada
      await registerUser(userData);
      
      // 3. Realiza o login automático para obter o token e exibir o modal de Trial
      try {
          await login(data.email, safePassword);
          setShowTrialModal(true);
      } catch (e) {
          toast.success("Conta criada! Faça login para continuar.");
          navigate('/login');
      }

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Erro ao criar conta.";
      toast.error(msg);
    }
  };

  // CORREÇÃO: Atualizado para nova rota e body vazio
  const handleAcceptTrial = async () => {
    try {
        setActivatingTrial(true);
        // POST /auth/trial - Body vazio ({})
        await api.post('/auth/trial', {});
        
        await refreshUser(); // Atualiza contexto com o novo plano
        toast.success("TRIAL PRO ATIVADO! Bem-vindo(a)!");
        navigate('/dashboard');
        
    } catch (error) {
        console.error(error);
        const msg = error.response?.data?.detail;
        
        // Se já tiver usado trial (400) ou outro erro, avisa e manda pro dashboard
        if (msg) toast.error(msg);
        else toast.error("Erro ao ativar trial.");
        
        navigate('/dashboard');
    } finally {
        setActivatingTrial(false);
    }
  };

  const handleDeclineTrial = () => {
    navigate('/plans'); // Se recusou trial, manda escolher um plano pago ou ver as opções
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Crie sua Conta</h1>
          <p className="text-gray-500 mt-2">Comece a gerenciar seu mercado hoje</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input 
            label="Nome Completo" 
            icon={User} 
            placeholder="Seu nome"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input 
            label="Email" 
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
            placeholder="Mínimo 6 caracteres"
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
            Criar Conta Grátis <ArrowRight size={18} />
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
           <span className="text-gray-500">Já tem uma conta? </span>
           <Link to="/login" className="text-brand-dark font-bold hover:underline">
             Fazer Login
           </Link>
        </div>
      </div>

      {/* MODAL DE OFERTA TRIAL */}
      {showTrialModal && (
          <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl animate-scale-in relative">
                  <div className="bg-brand-yellow p-6 text-center">
                      <Gift size={48} className="mx-auto text-slate-900 mb-2" />
                      <h2 className="text-2xl font-black text-slate-900 uppercase">Presente de Boas-vindas!</h2>
                  </div>
                  
                  <div className="p-8">
                      <p className="text-center text-gray-600 mb-6 text-lg">
                          Você ganhou <strong>14 Dias de Acesso PRO</strong> para testar todas as funcionalidades sem compromisso!
                      </p>
                      
                      <div className="space-y-3 bg-gray-50 p-4 rounded-xl mb-8">
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