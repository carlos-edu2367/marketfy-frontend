import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, WifiOff, ShoppingCart,
  BarChart3, FileText, CheckCircle, ArrowRight,
  Package, DollarSign, ShieldCheck, ChevronDown,
  AlertTriangle, BookOpen,
  TrendingUp, Wallet, Settings, Bell, Search, Users
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { usePublicPlans } from '../hooks/usePublicPlans';
import BillingCycleToggle from '../components/billing/BillingCycleToggle';
import PlanCard from '../components/billing/PlanCard';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [cycleKey, setCycleKey] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const { plans, loading: plansLoading } = usePublicPlans();

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // O plano do meio (por preco) e sugerido como recomendado quando ha 3+
  // planos pagos. Sem um campo de negocio (`is_recommended`) no backend, esta
  // e uma heuristica de apresentacao, nao uma escolha comercial.
  const recommendedPlanId = plans.length >= 3 ? plans[Math.floor(plans.length / 2)].id : null;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 scroll-smooth">

      {/* --- HEADER / NAVBAR --- */}
      <header className="sticky top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-brand-dark">
            <div className="bg-brand-yellow p-2 rounded-lg shadow-lg shadow-yellow-200/50">
              <Store size={24} className="text-gray-900" />
            </div>
            <span className="text-xl font-black tracking-tight">Marketfy</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-brand-dark transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-brand-dark transition-colors">Planos</a>
            <a href="#faq" className="hover:text-brand-dark transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button as={Link} to="/login" variant="ghost" className="font-bold">Entrar</Button>
            <Button
              as={Link}
              to="/register"
              className="font-bold shadow-lg shadow-yellow-100 bg-brand-yellow hover:bg-yellow-400 text-brand-dark transition-transform hover:-translate-y-0.5 border-none"
            >
              Testar grátis
            </Button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="pt-20 pb-20 px-6 bg-gradient-to-b from-yellow-50/50 via-white to-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-yellow-50 to-transparent opacity-50 -z-10" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-green-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none"></span>
              Sistema Online & Offline
            </div>

            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] mb-6 text-balance">
              O caixa do seu mercado <span className="bg-brand-yellow/50 px-1.5 rounded">não para</span>. Nem quando a internet cai.
            </h1>

            <p className="text-xl text-gray-500 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              PDV, estoque, fiado e emissão de NFC-e em um só sistema. Se a conexão cair no meio de uma venda, o Marketfy continua vendendo e sincroniza tudo depois.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-6">
              <Button
                as={Link}
                to="/register"
                size="xl"
                className="w-full sm:w-auto rounded-full px-8 text-lg h-14 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 bg-brand-yellow text-brand-dark hover:bg-yellow-400 font-black border-none"
              >
                Testar grátis por 14 dias <ArrowRight className="ml-2" />
              </Button>
              <Button
                as="a"
                href="#funcionalidades"
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto rounded-full px-6 text-base font-bold text-gray-600 hover:text-brand-dark"
              >
                Ver funcionalidades
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Sem cartão de crédito</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Sem instalação</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Emissor de NFC-e incluso</span>
            </div>
          </div>

          {/* Preview ilustrativo do dashboard (mockup, nao uma captura de tela real) */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-full z-10">
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl border-4 border-slate-800 p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
               <div className="h-8 bg-slate-800 rounded-t-xl flex items-center px-4 gap-2 border-b border-slate-700/50">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                 <div className="w-3 h-3 rounded-full bg-green-400"></div>
               </div>

               <div className="bg-gray-50 rounded-b-xl overflow-hidden aspect-[16/10] flex text-xs md:text-sm relative select-none cursor-default">
                  <div className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-4 border-t border-slate-800 shrink-0">
                      <div className="p-2 bg-brand-yellow rounded-lg text-slate-900 shadow-lg shadow-yellow-500/20"><Store size={18} /></div>
                      <div className="w-8 h-[1px] bg-slate-800 my-1"></div>
                      <div className="p-2 text-slate-400"><ShoppingCart size={18} /></div>
                      <div className="p-2 text-slate-400"><Users size={18} /></div>
                      <div className="p-2 text-slate-400"><BarChart3 size={18} /></div>
                      <div className="mt-auto p-2 text-slate-600"><Settings size={18} /></div>
                  </div>

                  <div className="flex-1 flex flex-col min-w-0">
                      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
                          <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm">Dashboard</span>
                              <span className="text-[10px] text-gray-400 hidden sm:block">Visão geral da loja</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="p-1.5 text-gray-400 bg-gray-50 rounded-full"><Search size={14} /></div>
                             <div className="p-1.5 text-gray-400 bg-gray-50 rounded-full relative">
                                <Bell size={14} />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                             </div>
                             <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">M</div>
                          </div>
                      </div>

                      <div className="p-4 overflow-hidden flex-1 bg-gray-50 flex flex-col gap-4">
                          <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
                                  <div className="absolute right-0 top-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8"></div>
                                  <div className="flex items-center gap-1.5 text-green-600 text-[10px] font-bold uppercase tracking-wider relative z-10">
                                      <TrendingUp size={12} /> Vendas Hoje
                                  </div>
                                  <div className="text-xl font-black text-gray-900 relative z-10">R$ 1.250<span className="text-sm text-gray-400">,00</span></div>
                                  <div className="text-[10px] text-gray-400 relative z-10">15 pedidos realizados</div>
                              </div>
                              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 relative overflow-hidden">
                                  <div className="absolute right-0 top-0 w-16 h-16 bg-yellow-50 rounded-bl-full -mr-8 -mt-8"></div>
                                  <div className="flex items-center gap-1.5 text-yellow-600 text-[10px] font-bold uppercase tracking-wider relative z-10">
                                      <Wallet size={12} /> A Receber
                                  </div>
                                  <div className="text-xl font-black text-gray-900 relative z-10">R$ 450<span className="text-sm text-gray-400">,00</span></div>
                                  <div className="text-[10px] text-gray-400 relative z-10">Controle de Fiado</div>
                              </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
                              <div className="flex justify-between items-center mb-3">
                                 <span className="text-[10px] font-bold text-gray-500 uppercase">Fluxo Semanal</span>
                                 <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+12% vs. anterior</span>
                              </div>
                              <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 px-1 pb-1">
                                  {[35, 55, 40, 70, 50, 90, 65].map((h, i) => (
                                      <div key={i} className="flex-1 flex flex-col justify-end h-full">
                                          <div className="w-full bg-gray-100 rounded-t-sm relative h-full flex items-end overflow-hidden">
                                              <div style={{height: `${h}%`}} className="w-full bg-brand-yellow rounded-t-sm"></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
               </div>
            </div>

            <div className="absolute top-10 -right-6 bg-white p-3 rounded-xl shadow-lg border border-gray-100 items-center gap-3 z-20 hidden md:flex">
                <div className="bg-green-100 p-2 rounded-lg text-green-600"><CheckCircle size={20} /></div>
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">NFC-e</p>
                    <p className="font-black text-gray-800 text-sm">Emitida OK</p>
                </div>
            </div>

            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3 z-20">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><WifiOff size={24} /></div>
                <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Conexão perdida?</p>
                    <p className="font-black text-gray-800">PDV continua vendendo</p>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO DE PROBLEMAS --- */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900">Sua loja sofre com isso?</h2>
            <p className="text-gray-500 mt-2">Os gargalos mais comuns do pequeno varejo — e o que o Marketfy faz sobre cada um.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <ProblemCard
              icon={AlertTriangle}
              title="Internet caiu, venda parou?"
              desc="No Marketfy, o caixa continua funcionando com a internet fora do ar e sincroniza as vendas com o servidor assim que a conexão voltar."
              color="text-red-500"
              bg="bg-red-50"
            />
            <ProblemCard
              icon={BookOpen}
              title="Fiado anotado no caderno?"
              desc="Registre o crédito de cada cliente, defina um limite e acompanhe o extrato completo em vez de depender de papel."
              color="text-orange-500"
              bg="bg-orange-50"
            />
            <ProblemCard
              icon={Package}
              title="Não sabe o que tem no estoque?"
              desc="Acompanhe entradas, saídas e histórico de cada produto, com busca rápida por código de barras no caixa."
              color="text-blue-500"
              bg="bg-blue-50"
            />
          </div>
        </div>
      </section>

      {/* --- FUNCIONALIDADES --- */}
      <section id="funcionalidades" className="py-24 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">Tudo o que seu negócio precisa em um só lugar</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Funcionalidades pensadas para a agilidade do balcão e a organização do escritório.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
      <section id="planos" className="py-24 px-6 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 opacity-50"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8 text-center lg:text-left">
            <div>
              <h2 className="text-4xl font-black mb-4 tracking-tight">Escolha o plano ideal para crescer</h2>
              <p className="text-slate-400 max-w-lg mx-auto lg:mx-0 text-lg">
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
            <div className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-center text-sm text-slate-300">
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
                />
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <p className="text-slate-400 text-sm">
              Rede com várias lojas ou operação de alto volume?{' '}
              <Link to="/register?intent=business" className="font-bold text-brand-yellow hover:underline">
                Cadastre-se e fale com a gente
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900">Perguntas Frequentes</h2>
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
      <section className="py-20 px-6 bg-brand-yellow">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-brand-dark mb-6">Pronto para o caixa parar de te preocupar?</h2>
          <p className="text-xl text-brand-dark/80 mb-8 max-w-2xl mx-auto">
            Comece agora com 14 dias grátis. Sem cartão de crédito, sem instalação.
          </p>
          <Button
            as={Link}
            to="/register"
            size="xl"
            className="rounded-full px-12 h-16 text-xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl hover:scale-105 transition-transform border-none"
          >
            Testar grátis por 14 dias
          </Button>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-80">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
               <Store size={20} />
            </div>
            <span className="font-bold text-xl text-slate-900">Marketfy</span>
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Marketfy. Todos os direitos reservados.</p>
          </div>
          <div className="flex gap-6 text-sm text-gray-500 font-medium">
            <Link to="/termos" className="hover:text-brand-dark hover:underline">Termos</Link>
            <Link to="/privacidade" className="hover:text-brand-dark hover:underline">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

const ProblemCard = ({ icon: Icon, title, desc, color, bg }) => (
  <div className="flex flex-col items-center text-center group">
    <div className={`w-20 h-20 rounded-3xl ${bg} ${color} flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
      <Icon size={32} />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const SolutionCard = ({ icon: Icon, title, desc }) => (
  <div className="flex gap-4 items-start">
    <div className="shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-dark shadow-sm border border-gray-100">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const FaqItem = ({ index, question, answer, isOpen, onClick }) => {
  const panelId = useId();
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
      <button
        id={`faq-trigger-${index}`}
        onClick={onClick}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center gap-4 p-4 text-left font-bold text-gray-900 bg-white hover:bg-gray-50 transition-colors"
      >
        {question}
        <ChevronDown size={20} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`faq-trigger-${index}`}
        hidden={!isOpen}
        className="p-4 pt-0 border-t border-gray-100"
      >
        <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};
