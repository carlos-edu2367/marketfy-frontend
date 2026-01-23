import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Lock, Store, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    try {
      console.log("Tentando login...", data.email);
      await login(data.email, data.password);
      
      // Verificação rápida de acesso
      try {
         await api.get('/identity/plans'); 
         navigate('/dashboard');
      } catch (e) {
         // Se der erro ao buscar planos, mas login foi ok, manda pro dashboard igual
         navigate('/dashboard');
      }

    } catch (error) {
      console.error("Erro no login:", error);
      const msg = error.response?.data?.detail || 'Credenciais inválidas. Verifique email e senha.';
      toast.error(msg);
    }
  };

  const onError = (errors) => {
    console.log("Erros de validação login:", errors);
    // Não mostramos toast aqui para não poluir, os campos já ficam vermelhos
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-xl border border-gray-100">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-yellow rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm text-brand-dark">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SGM Marketfy</h1>
          <p className="text-gray-500 mt-2">Sistema de Gestão para Mercados</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          <Input 
            label="Email" 
            icon={User} 
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input 
            label="Senha" 
            type="password" 
            icon={Lock} 
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button 
            variant="primary" 
            size="lg" 
            className="w-full mt-4 font-bold"
            isLoading={isSubmitting}
            type="submit"
          >
            Acessar Sistema <ArrowRight size={18} />
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
           <span className="text-gray-500">Não tem conta? </span>
           <Link to="/register" className="text-brand-dark font-bold hover:underline">
             Criar conta grátis
           </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Neectify Tecnologia
        </div>
      </div>
    </div>
  );
}