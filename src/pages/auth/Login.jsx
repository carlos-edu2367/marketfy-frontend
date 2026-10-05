import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Lock, ArrowRight } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import toast from 'react-hot-toast';

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
      // Sanitiza a senha antes de enviar
      const safePassword = truncateTo72Bytes(data.password);

      await login(data.email, safePassword);
      navigate('/dashboard');
    } catch (error) {
      toast.error("Email ou senha incorretos.");
    }
  };

  return (
    <div className="mf-grid-bg min-h-screen flex items-center justify-center bg-brand-yellow p-4">
      <div className="max-w-md w-full bg-white rounded-[28px] border-2 border-brand-ink shadow-sticker-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size={56} to="/" /></div>
          <h1 className="sr-only">Marketfy</h1>
          <p className="text-gray-600 font-medium mt-2">Sistema de Gestão para Mercados</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            variant="ink" 
            size="lg" 
            className="w-full mt-4 font-black rounded-xl"
            isLoading={isSubmitting}
            type="submit"
          >
            Acessar Sistema <ArrowRight size={18} />
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
           <span className="text-gray-500">Não tem conta? </span>
           <Link to="/register" className="text-brand-ink font-black underline decoration-brand-yellow decoration-4 underline-offset-2 hover:bg-brand-yellow">
             Criar conta grátis
           </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Marketfy. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
