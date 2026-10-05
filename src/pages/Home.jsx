import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  WifiOff, ShoppingCart,
  BarChart3, FileText, CheckCircle, ArrowRight,
  Package, DollarSign, ShieldCheck, ChevronDown,
  AlertTriangle, BookOpen,
  TrendingUp, Wallet, Settings, Bell, Search, Users
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import Logo, { LogoMark, LogoBadge } from '../components/brand/Logo';
import { usePublicPlans } from '../hooks/usePublicPlans';
import { getCompanyInfo } from '../lib/company';
import { getRecommendedPlanId } from '../lib/pricing';
import BillingCycleToggle from '../components/billing/BillingCycleToggle';
import PlanCard from '../components/billing/PlanCard';
import PlanIncludesStrip from '../components/billing/PlanIncludesStrip';
import CookieConsentBanner from '../components/CookieConsentBanner';
import { track } from '../lib/analytics';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [cycleKey, setCycleKey] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const { plans, loading: plansLoading } = usePublicPlans();
  const company = getCompanyInfo();

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const recommendedPlanId = getRecommendedPlanId(plans);

  useEffect(() => {
    track('landing_viewed');
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-brand-ink scroll-smooth">

      {/* --- HEADER / NAVBAR --- */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-brand-ink bg-brand-yellow">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6">
          <Logo size={42} />

          <nav className="hidden items-center gap-8 text-sm font-bold md:flex">
            <a href="#funcionalidades" className="decoration-2 underline-offset-4 hover:underline">Funcionalidades</a>
            <a href="#planos" className="decoration-2 underline-offset-4 hover:underline">Planos</a>
            <a href="#faq" className="decoration-2 underline-offset-4 hover:underline">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-brand-ink/10">Entrar</Link>
            <Button as={Link} to="/register" variant="ink" size="sm" className="rounded-xl px-4 font-bold">
              Testar grátis
            </Button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="mf-grid-bg relative overflow-hidden bg-brand-yellow px-5 pb-24 pt-14 sm:px-6 lg:pt-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div className="z-10 text-center lg:text-left">
            <div className="mf-rise inline-flex items-center gap-2 rounded-full border-2 border-brand-ink bg-white px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow-sticker">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-green motion-reduce:animate-none" />
              Sistema Online &amp; Offline
            </div>

            <h1 className="mf-rise mb-6 mt-6 text-balance text-5xl font-black leading-[1.02] sm:text-6xl lg:text-[4.5rem]" style={{ animationDelay: '.08s' }}>
              O caixa do seu mercado{' '}
              <span className="whitespace-nowrap bg-brand-ink px-3 text-brand-yellow [box-decoration-break:clone]">não para</span>
              . Nem quando a internet cai.
            </h1>

            <p className="mf-rise mx-auto mb-9 max-w-xl text-lg font-medium leading-relaxed text-brand-ink/75 sm:text-xl lg:mx-0" style={{ animationDelay: '.16s' }}>
              PDV, estoque, fiado e emissão de NFC-e em um só sistema. Se a conexão cair no meio de uma venda, o Marketfy continua vendendo e sincroniza tudo depois.
            </p>

            <div className="mf-rise mb-7 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start" style={{ animationDelay: '.24s' }}>
              <Button
                as={Link}
                to="/register"
                variant="ink"
                size="xl"
                className="h-14 w-full rounded-2xl px-8 text-lg font-black sm:w-auto"
              >
                Testar grátis por 14 dias <ArrowRight className="ml-1" />
              </Button>
              <Button
                as="a"
                href="#funcionalidades"
                variant="ghost"
                size="lg"
                className="w-full rounded-2xl px-6 text-base font-bold underline decoration-2 underline-offset-4 hover:bg-brand-ink/10 sm:w-auto"
              >
                Ver funcionalidades
              </Button>
            </div>

            <div className="mf-rise flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold lg:justify-start" style={{ animationDelay: '.32s' }}>
              <span className="flex items-center gap-1.5"><CheckCircle size={17} strokeWidth={3} /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={17} strokeWidth={3} /> Sem instalação</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={17} strokeWidth={3} /> Emissor de NFC-e incluso</span>
            </div>
          </div>

          {/* Preview ilustrativo do dashboard (mockup, nao uma captura de tela real) */}
          <div className="mf-rise relative z-10 mx-auto w-full max-w-lg lg:max-w-full" style={{ animationDelay: '.2s' }}>
            <div className="relative -rotate-1 rounded-[28px] border-2 border-brand-ink bg-brand-ink p-2 shadow-sticker-lg transition-transform duration-500 hover:rotate-0">
              <div className="flex h-8 items-center gap-2 rounded-t-[20px] bg-brand-ink px-4">
                <div className="h-3 w-3 rounded-full bg-brand-yellow" />
                <div className="h-3 w-3 rounded-full bg-white/80" />
                <div className="h-3 w-3 rounded-full bg-white/30" />
              </div>

              <div className="relative flex aspect-[16/10] cursor-default select-none overflow-hidden rounded-b-[20px] bg-white text-xs md:text-sm">
                <div className="flex w-14 shrink-0 flex-col items-center gap-4 border-r-2 border-brand-ink bg-brand-yellow py-4">
                  <LogoMark size={34} className="!bg-brand-ink" />
                  <div className="my-1 h-[2px] w-8 bg-brand-ink/30" />
                  <div className="p-2 text-brand-ink"><ShoppingCart size={18} /></div>
                  <div className="p-2 text-brand-ink/60"><Users size={18} /></div>
                  <div className="p-2 text-brand-ink/60"><BarChart3 size={18} /></div>
                  <div className="mt-auto p-2 text-brand-ink/40"><Settings size={18} /></div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-brand-ink px-5">
                    <div className="flex flex-col">
                      <span className="font-display text-sm font-black">Dashboard</span>
                      <span className="hidden text-[10px] text-gray-500 sm:block">Visão geral da loja</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-gray-100 p-1.5 text-gray-500"><Search size={14} /></div>
                      <div className="relative rounded-full bg-gray-100 p-1.5 text-gray-500">
                        <Bell size={14} />
                        <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-white bg-red-500" />
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-ink text-xs font-black text-brand-yellow">M</div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 overflow-hidden bg-brand-yellowSoft/60 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1 rounded-xl border-2 border-brand-ink bg-white p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-green">
                          <TrendingUp size={12} /> Vendas Hoje
                        </div>
                        <div className="font-display text-xl font-black">R$ 1.250<span className="text-sm text-gray-400">,00</span></div>
                        <div className="text-[10px] text-gray-500">15 pedidos realizados</div>
                      </div>
                      <div className="flex flex-col gap-1 rounded-xl border-2 border-brand-ink bg-brand-ink p-3 text-white">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-yellow">
                          <Wallet size={12} /> A Receber
                        </div>
                        <div className="font-display text-xl font-black">R$ 450<span className="text-sm text-white/50">,00</span></div>
                        <div className="text-[10px] text-white/60">Controle de Fiado</div>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col rounded-xl border-2 border-brand-ink bg-white p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-gray-500">Fluxo Semanal</span>
                        <span className="rounded bg-brand-yellow px-1.5 py-0.5 text-[10px] font-black">+12% vs. anterior</span>
                      </div>
                      <div className="flex flex-1 items-end justify-between gap-2 px-1 md:gap-3">
                        {[35, 55, 40, 70, 50, 90, 65].map((h, i) => (
                          <div key={i} className="flex h-full flex-1 flex-col justify-end">
                            <div
                              style={{ height: `${h}%`, animationDelay: `${0.5 + i * 0.07}s` }}
                              className={`mf-bar w-full rounded-t-md border-2 border-brand-ink ${i === 5 ? 'bg-brand-yellow' : 'bg-white'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-8 z-20 hidden items-center gap-3 rounded-2xl border-2 border-brand-ink bg-white p-3 shadow-sticker md:flex">
              <div className="rounded-lg bg-brand-green p-2 text-white"><CheckCircle size={20} strokeWidth={3} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500">NFC-e</p>
                <p className="font-display text-sm font-black">Emitida OK</p>
              </div>
            </div>

            <div className="absolute -bottom-7 -left-4 z-20 flex items-center gap-3 rounded-2xl border-2 border-brand-ink bg-brand-ink p-4 text-white shadow-[4px_4px_0_0_#FFFFFF]">
              <div className="rounded-lg bg-brand-yellow p-2 text-brand-ink"><WifiOff size={24} /></div>
              <div>
                <p className="text-xs font-black uppercase text-brand-yellow">Conexão perdida?</p>
                <p className="font-display font-black">PDV continua vendendo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAIXA --- */}
      <div className="border-y-2 border-brand-ink bg-brand-ink py-3 text-brand-yellow" aria-hidden="true">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-1 px-6 font-display text-sm font-black uppercase tracking-[0.18em]">
          {['PDV offline', 'Estoque', 'Fiado', 'NFC-e', 'Financeiro'].map((t) => (
            <span key={t} className="flex items-center gap-8">
              {t} <span className="text-white/30">●</span>
            </span>
          ))}
          <span>Marketfy</span>
        </div>
      </div>

      {/* --- SEÇÃO DE PROBLEMAS --- */}
      <section className="bg-white px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-4xl font-black sm:text-5xl">Sua loja sofre com isso?</h2>
            <p className="mt-3 text-lg font-medium text-gray-600">Os gargalos mais comuns do pequeno varejo — e o que o Marketfy faz sobre cada um.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ProblemCard
              n="01"
              icon={AlertTriangle}
              title="Internet caiu, venda parou?"
              desc="No Marketfy, o caixa continua funcionando com a internet fora do ar e sincroniza as vendas com o servidor assim que a conexão voltar."
            />
            <ProblemCard
              n="02"
              icon={BookOpen}
              title="Fiado anotado no caderno?"
              desc="Registre o crédito de cada cliente, defina um limite e acompanhe o extrato completo em vez de depender de papel."
            />
            <ProblemCard
              n="03"
              icon={Package}
              title="Não sabe o que tem no estoque?"
              desc="Acompanhe entradas, saídas e histórico de cada produto, com busca rápida por código de barras no caixa."
            />
          </div>
        </div>
      </section>

      {/* --- FUNCIONALIDADES --- */}
      <section id="funcionalidades" className="mf-dots-bg border-y-2 border-brand-ink bg-brand-yellowSoft px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 max-w-3xl">
            <h2 className="mb-4 text-4xl font-black sm:text-5xl">Tudo o que seu negócio precisa em um só lugar</h2>
            <p className="text-lg font-medium text-gray-700">
              Funcionalidades pensadas para a agilidade do balcão e a organização do escritório.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SolutionCard
              icon={ShoppingCart}
              title="PDV que não para"
              desc="Frente de caixa rápida: abra e feche o caixa, faça sangrias e venda em segundos. Se a internet cair, as vendas ficam salvas no navegador e são enviadas assim que ela voltar."
            />
            <SolutionCard
              icon={DollarSign}
              title="Gestão de fiado"
              desc="Defina limites de crédito por cliente, acompanhe o histórico completo (extrato) e saiba exatamente quanto tem a receber."
            />
            <SolutionCard
              icon={FileText}
              title="Emissão de NFC-e"
              desc="Emita NFC-e a partir do certificado A1, com configuração de CSC e cálculo de tributos. Cada conta tem um limite mensal de emissões incluído no plano."
            />
            <SolutionCard
              icon={BarChart3}
              title="Painel financeiro"
              desc="Acompanhe receita, despesas e lucro líquido, com evolução no período e histórico de lançamentos."
            />
            <SolutionCard
              icon={Package}
              title="Controle de estoque"
              desc="Registro auditável de entradas e saídas, cadastro por código de barras e alerta de estoque baixo."
            />
            <SolutionCard
              icon={ShieldCheck}
              title="Perfis de acesso"
              desc="Controle hierárquico entre dono, gerente, operador de caixa e contador, cada um com o acesso que precisa."
            />
          </div>
        </div>
      </section>

      {/* --- PLANOS --- */}
      <section id="planos" className="relative overflow-hidden bg-brand-ink px-5 py-24 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-yellow/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col items-center justify-between gap-8 text-center lg:flex-row lg:items-end lg:text-left">
            <div>
              <h2 className="mb-4 text-4xl font-black tracking-tight sm:text-5xl">
                Escolha o plano ideal para <span className="text-brand-yellow">crescer</span>
              </h2>
              <p className="mx-auto max-w-lg text-lg text-white/60 lg:mx-0">
                Sem taxas de implantação. Cancele quando quiser.
              </p>
            </div>

            <BillingCycleToggle value={cycleKey} onChange={setCycleKey} theme="dark" className="mx-auto lg:mx-0" />
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-brand-yellow" size={40} />
            </div>
          ) : plans.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-2xl border-2 border-white/20 p-6 text-center text-sm text-white/70">
              Nenhum plano está disponível no momento. Tente novamente em instantes.
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch justify-items-center gap-8 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  cycleKey={cycleKey}
                  theme="dark"
                  highlighted={plan.id === recommendedPlanId}
                  badgeLabel={plan.id === recommendedPlanId ? 'Recomendado' : null}
                  ctaLabel="Testar grátis"
                  ctaTo={`/register?plan=${plan.id}&cycle=${cycleKey}`}
                  onCtaClick={() => track('plan_cta_clicked', { plan_id: plan.id, cycle: cycleKey })}
                />
              ))}
            </div>
          )}

          {!plansLoading && plans.length > 0 && <PlanIncludesStrip theme="dark" />}

          {company.salesContactUrl && (
            <div className="mt-10 text-center">
              <p className="text-sm text-white/60">
                Rede com várias lojas ou operação de alto volume?{' '}
                <a
                  href={company.salesContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand-yellow underline underline-offset-4"
                >
                  Fale com a gente
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="bg-white px-5 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12">
            <h2 className="text-4xl font-black sm:text-5xl">Perguntas Frequentes</h2>
          </div>

          <div className="space-y-4">
            <FaqItem
              index={0}
              question="Preciso instalar algum programa?"
              answer="Não. O Marketfy roda direto no navegador (Chrome, Edge), sem instalação. Depois que a página carrega, o caixa continua funcionando mesmo se a internet cair, e sincroniza as vendas quando a conexão voltar."
              isOpen={openFaq === 0}
              onClick={() => toggleFaq(0)}
            />
            <FaqItem
              index={1}
              question="Como funciona o modo offline do PDV?"
              answer="As vendas feitas sem internet ficam salvas no navegador (IndexedDB). Assim que a conexão volta, elas são enviadas automaticamente para o servidor, sem você precisar fazer nada."
              isOpen={openFaq === 1}
              onClick={() => toggleFaq(1)}
            />
            <FaqItem
              index={2}
              question="Posso testar antes de pagar?"
              answer="Sim. Você tem 14 dias grátis com acesso aos recursos pagos do sistema, sem precisar de cartão de crédito."
              isOpen={openFaq === 2}
              onClick={() => toggleFaq(2)}
            />
            <FaqItem
              index={3}
              question="Consigo importar meus produtos de outro sistema?"
              answer="Hoje o cadastro é feito produto a produto, com leitura de código de barras para agilizar. Ainda não temos importação em massa por planilha."
              isOpen={openFaq === 3}
              onClick={() => toggleFaq(3)}
            />
            <FaqItem
              index={4}
              question="Quais são as formas de pagamento do plano?"
              answer="Você pode pagar por fatura (PIX ou boleto a cada período) ou por cobrança recorrente no cartão de crédito, com renovação automática. A escolha é feita na hora de contratar."
              isOpen={openFaq === 4}
              onClick={() => toggleFaq(4)}
            />
            <FaqItem
              index={5}
              question="O que acontece se eu não emitir todas as notas incluídas no plano?"
              answer="O limite de emissões de NFC-e é mensal. Se precisar de mais notas em um mês específico, é possível comprar créditos fiscais avulsos."
              isOpen={openFaq === 5}
              onClick={() => toggleFaq(5)}
            />
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="mf-grid-bg border-t-2 border-brand-ink bg-brand-yellow px-5 py-24 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 text-center md:flex-row md:text-left">
          <LogoBadge size={140} className="shrink-0 shadow-sticker-lg ring-2 ring-brand-ink" />
          <div>
            <h2 className="mb-4 text-4xl font-black md:text-5xl">Pronto para o caixa parar de te preocupar?</h2>
            <p className="mb-8 max-w-2xl text-xl font-medium text-brand-ink/75">
              Comece agora com 14 dias grátis. Sem cartão de crédito, sem instalação.
            </p>
            <Button
              as={Link}
              to="/register"
              variant="ink"
              size="xl"
              className="h-16 rounded-2xl px-10 text-xl font-black"
            >
              Testar grátis por 14 dias
            </Button>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t-2 border-brand-ink bg-brand-ink px-5 py-12 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <Logo tone="light" size={38} />
          <div className="text-center md:text-left">
            <p className="text-sm text-white/60">© {new Date().getFullYear()} Marketfy. Todos os direitos reservados.</p>
            {company.legalName && company.cnpj && (
              <p className="mt-1 text-xs text-white/40">
                {company.legalName} · CNPJ {company.cnpj}{company.address ? ` · ${company.address}` : ''}
              </p>
            )}
          </div>
          <div className="flex gap-6 text-sm font-bold text-white/70">
            <Link to="/precos" className="hover:text-brand-yellow hover:underline">Preços</Link>
            <Link to="/termos" className="hover:text-brand-yellow hover:underline">Termos</Link>
            <Link to="/privacidade" className="hover:text-brand-yellow hover:underline">Privacidade</Link>
          </div>
        </div>
      </footer>

      <CookieConsentBanner />
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

const ProblemCard = ({ n, icon: Icon, title, desc }) => (
  <div className="mf-card group relative p-7 transition-all hover:-translate-y-1 hover:shadow-sticker-lg">
    <span className="absolute right-6 top-5 font-display text-5xl font-black text-brand-ink/10">{n}</span>
    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-ink bg-brand-yellow transition-transform duration-300 group-hover:-rotate-6">
      <Icon size={30} strokeWidth={2.5} />
    </div>
    <h3 className="mb-3 text-xl font-black">{title}</h3>
    <p className="text-sm leading-relaxed text-gray-600">{desc}</p>
  </div>
);

const SolutionCard = ({ icon: Icon, title, desc }) => (
  <div className="mf-card flex items-start gap-4 p-6 transition-all hover:-translate-y-1 hover:shadow-sticker-lg">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-ink text-brand-yellow">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="mb-2 text-lg font-black">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{desc}</p>
    </div>
  </div>
);

const FaqItem = ({ index, question, answer, isOpen, onClick }) => {
  const panelId = useId();
  return (
    <div className={`overflow-hidden rounded-2xl border-2 border-brand-ink transition-shadow ${isOpen ? 'bg-brand-yellowSoft shadow-sticker' : 'bg-white'}`}>
      <button
        id={`faq-trigger-${index}`}
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-4 p-5 text-left font-display text-lg font-black"
      >
        {question}
        <ChevronDown size={22} strokeWidth={3} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`faq-trigger-${index}`}
        hidden={!isOpen}
        className="border-t-2 border-brand-ink/10 p-5 pt-4"
      >
        <p className="text-sm leading-relaxed text-gray-700">{answer}</p>
      </div>
    </div>
  );
};
