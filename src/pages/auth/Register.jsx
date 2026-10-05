import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { User, Mail, Lock, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { savePlanIntent } from '../../lib/planIntent';
import { track } from '../../lib/analytics';
import { readCheckoutFsid, rememberCheckoutFsid } from '../../lib/funnels';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  acceptedTerms: z.boolean().refine((value) => value === true, {
    message: 'É preciso aceitar os Termos e a Política de Privacidade.',
  }),
});

export default function Register() {
  const { registerUser, login, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    // Valida ao sair do campo e revalida a cada tecla: a borda vermelha some assim que o valor fica válido.
    mode: 'onTouched',
    reValidateMode: 'onChange',
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
    const fsid = searchParams.get('fsid') || readCheckoutFsid();
    if (fsid) rememberCheckoutFsid(fsid);
    const userData = { name: data.name, email: data.email, ...(fsid ? { funnel_session_id: fsid } : {}) };

    try {
      await registerUser({ ...userData, password: safePassword });
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Erro ao criar conta.';
      toast.error(msg);
      return;
    }

    track('register_submitted', { has_plan_intent: Boolean(searchParams.get('plan')) });

    savePlanIntent({ planId: searchParams.get('plan'), cycle: searchParams.get('cycle') });

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
      track('trial_activated');
      // O login rodou antes do trial: recarrega o usuário para que ele já tenha plano
      // e o guard do painel não o mande de volta para /plans.
      await refreshUser().catch(() => {});
      toast.success('Conta criada! Seu teste grátis de 14 dias já está ativo.');
    } catch (trialError) {
      // Se o trial nao puder ser ativado (ex.: politica de elegibilidade),
      // o usuario segue para o dashboard e escolhe um plano em /plans.
      toast.success('Conta criada!');
      const reason = trialError?.response?.data?.detail;
      if (typeof reason === 'string') toast(reason, { icon: 'ℹ️' });
    }
    navigate('/dashboard');
  };

  return (
    <div className="mf-grid-bg min-h-screen flex items-center justify-center bg-brand-yellow p-4 py-10">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-[28px] border-2 border-brand-ink shadow-sticker-lg overflow-hidden">

        <div className="p-8">
          <div className="mb-6">
            <div className="mb-5 md:hidden"><Logo size={40} /></div>
            <h1 className="text-3xl font-black text-brand-ink">Crie sua conta</h1>
            <p className="text-gray-600 font-medium mt-2">14 dias grátis, sem cartão de crédito.</p>
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
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-ink accent-brand-ink focus:ring-brand-yellow"
                {...register('acceptedTerms')}
              />
              <span>
                Li e aceito os <Link to="/termos" target="_blank" className="font-bold text-brand-ink underline decoration-brand-yellow decoration-2">Termos de Uso</Link>{' '}
                e a <Link to="/privacidade" target="_blank" className="font-bold text-brand-ink underline decoration-brand-yellow decoration-2">Política de Privacidade</Link>.
              </span>
            </label>
            {errors.acceptedTerms && (
              <span className="block text-xs text-red-500 font-medium">{errors.acceptedTerms.message}</span>
            )}

            <Button
              variant="ink"
              size="lg"
              className="w-full mt-2 font-black rounded-xl"
              isLoading={isSubmitting}
              type="submit"
            >
              Começar meu teste grátis <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
             <span className="text-gray-500">Já tem uma conta? </span>
             <Link to="/login" className="text-brand-ink font-black underline decoration-brand-yellow decoration-4 underline-offset-2 hover:bg-brand-yellow">
               Fazer Login
             </Link>
          </div>
        </div>

        <div className="hidden md:flex flex-col justify-center gap-5 bg-brand-ink p-8 text-white border-l-2 border-brand-ink">
          <Logo tone="light" size={44} className="mb-2" />
          <h2 className="text-2xl font-black leading-snug">O que você ganha nos 14 dias de teste:</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-brand-yellow p-1.5 rounded-lg text-brand-ink shrink-0"><Check size={16} strokeWidth={3} /></div>
              <span className="text-sm text-white/85">PDV offline, estoque, fiado e financeiro liberados</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-brand-yellow p-1.5 rounded-lg text-brand-ink shrink-0"><Check size={16} strokeWidth={3} /></div>
              <span className="text-sm text-white/85">Emissão de NFC-e incluída no período de teste</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-brand-yellow p-1.5 rounded-lg text-brand-ink shrink-0"><ShieldCheck size={16} strokeWidth={3} /></div>
              <span className="text-sm text-white/85">Sem cartão de crédito e sem fidelidade</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
