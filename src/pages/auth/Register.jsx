import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Mail, Lock, FileText, ArrowRight, Check, ShieldCheck, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  cpf: z.string().min(11, 'CPF inválido (mínimo 11 números)'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  acceptedTerms: z.boolean().refine((value) => value === true, {
    message: 'É preciso aceitar os Termos e a Política de Privacidade.',
  }),
});

// Guarda a intencao de plano vinda da landing (?plan=&cycle=) para retomar
// depois que o cadastro e o trial forem concluidos.
function storePlanIntent(searchParams) {
  const plan = searchParams.get('plan');
  const cycle = searchParams.get('cycle');
  if (plan) {
    try {
      sessionStorage.setItem('marketfy_plan_intent', JSON.stringify({ plan, cycle: cycle || 'monthly' }));
    } catch {
      // sessionStorage indisponivel (modo privado, etc.) — segue sem guardar a intencao.
    }
  }
}

export default function Register() {
  const { registerUser, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptedTerms: false },
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
    const safePassword = truncateTo72Bytes(data.password);
    const userData = { name: data.name, email: data.email, cpf: data.cpf };

    try {
      await registerUser({ ...userData, password: safePassword });
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Erro ao criar conta.';
      toast.error(msg);
      return;
    }

    storePlanIntent(searchParams);

    try {
      await login(data.email, safePassword);
    } catch (error) {
      console.error(error);
      toast.success('Conta criada! Faça login para continuar.');
      navigate('/login');
      return;
    }

    // Ativa o trial de 14 dias diretamente: quem clicou em "Testar gratis"
    // ja decidiu, entao nao ha uma segunda decisao (modal) depois do cadastro.
    try {
      await api.post('/auth/trial', {});
      toast.success('Conta criada! Seu teste grátis de 14 dias já está ativo.');
    } catch {
      // Se o trial nao puder ser ativado (ex.: politica de elegibilidade),
      // o usuario segue para o dashboard e escolhe um plano em /plans.
      toast.success('Conta criada!');
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-10">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-2xl shadow-xl overflow-hidden">

        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Crie sua conta</h1>
            <p className="text-gray-500 mt-2">14 dias grátis, sem cartão de crédito.</p>
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
              placeholder="Somente números"
              inputMode="numeric"
              error={errors.cpf?.message}
              {...register('cpf')}
            />
            <p className="-mt-3 text-xs text-gray-400">Usamos o CPF para emitir suas notas fiscais (NFC-e).</p>
            <Input
              label="Senha"
              type="password"
              icon={Lock}
              placeholder="Mínimo 6 caracteres"
              error={errors.password?.message}
              {...register('password')}
            />

            <label className="flex items-start gap-2.5 pt-1 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-dark focus:ring-brand-yellow"
                {...register('acceptedTerms')}
              />
              <span>
                Li e aceito os <Link to="/termos" target="_blank" className="font-bold text-brand-dark hover:underline">Termos de Uso</Link>{' '}
                e a <Link to="/privacidade" target="_blank" className="font-bold text-brand-dark hover:underline">Política de Privacidade</Link>.
              </span>
            </label>
            {errors.acceptedTerms && (
              <span className="block text-xs text-red-500 font-medium">{errors.acceptedTerms.message}</span>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-2 font-bold"
              isLoading={isSubmitting}
              type="submit"
            >
              Começar meu teste grátis <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
             <span className="text-gray-500">Já tem uma conta? </span>
             <Link to="/login" className="text-brand-dark font-bold hover:underline">
               Fazer Login
             </Link>
          </div>
        </div>

        <div className="hidden md:flex flex-col justify-center gap-5 bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-2 text-brand-yellow font-black text-lg mb-2">
            <Store size={22} /> Marketfy
          </div>
          <h2 className="text-xl font-bold leading-snug">O que você ganha nos 14 dias de teste:</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-brand-yellow/15 p-1.5 rounded-lg text-brand-yellow shrink-0"><Check size={16} strokeWidth={3} /></div>
              <span className="text-sm text-slate-200">PDV offline, estoque, fiado e financeiro liberados</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-brand-yellow/15 p-1.5 rounded-lg text-brand-yellow shrink-0"><Check size={16} strokeWidth={3} /></div>
              <span className="text-sm text-slate-200">Emissão de NFC-e incluída no período de teste</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-brand-yellow/15 p-1.5 rounded-lg text-brand-yellow shrink-0"><ShieldCheck size={16} strokeWidth={3} /></div>
              <span className="text-sm text-slate-200">Sem cartão de crédito e sem fidelidade</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
