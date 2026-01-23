import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, WifiOff, ShoppingCart, 
  BarChart3, FileText, CheckCircle, ArrowRight, 
  Package, DollarSign, ShieldCheck, Star, Zap,
  AlertTriangle, BookOpen, ChevronDown, 
  TrendingUp, Wallet, Settings, Bell, Search, Users
} from 'lucide-react';

// --- COMPONENTE BUTTON (Recriado localmente para evitar erros de importação) ---
const Button = ({ children, variant = 'primary', size = 'default', className = '', ...props }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    ghost: "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
    outline: "border-2 border-slate-200 hover:border-slate-900 text-slate-900",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md"
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-lg px-8 text-base",
    xl: "h-14 rounded-xl px-8 text-lg",
    icon: "h-10 w-10"
  };

  const variantStyles = variants[variant] || variants.primary;
  const sizeStyles = sizes[size] || sizes.default;

  return (
    <button className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default function Home() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'semiannual' | 'annual'
  const [openFaq, setOpenFaq] = useState(null);

  // Função para calcular preço com desconto
  const getPrice = (basePrice) => {
    if (billingCycle === 'semiannual') {
      return (basePrice * 0.95).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (billingCycle === 'annual') {
      return (basePrice * 0.90).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 scroll-smooth">
      
      {/* --- BARRA DE AVISO --- */}
      <div className="bg-slate-900 text-white text-center text-xs md:text-sm font-bold py-2 px-4 flex justify-center items-center gap-2">
        <span className="bg-brand-yellow text-brand-dark px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Novo</span>
        Oferta de Lançamento: Teste o plano PRO gratuitamente por 14 dias.
      </div>

      {/* --- HEADER / NAVBAR --- */}
      <header className="sticky top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-dark cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="bg-brand-yellow p-2 rounded-lg shadow-lg shadow-yellow-200/50">
              <Store size={24} className="text-gray-900" />
            </div>
            <span className="text-xl font-black tracking-tight">Marketfy</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-brand-dark transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-brand-dark transition-colors">Planos</a>
            <a href="#faq" className="hover:text-brand-dark transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="font-bold">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button className="font-bold shadow-lg shadow-yellow-100 bg-brand-yellow hover:bg-yellow-400 text-brand-dark transition-transform hover:-translate-y-0.5 border-none">
                Criar Conta Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION (A Dobra Principal) --- */}
      <section className="pt-24 pb-20 px-6 bg-gradient-to-b from-yellow-50/50 via-white to-white overflow-hidden relative">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-yellow-50 to-transparent opacity-50 -z-10" />
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-64 h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-green-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Sistema Online & Offline
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-[1.1] mb-6">
              O Sistema de Gestão que <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600">Vende Mesmo Sem Internet</span>
            </h1>
            
            <p className="text-xl text-gray-500 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Controle seu estoque, emita notas fiscais e gerencie o &quot;fiado&quot; dos clientes com segurança. O PDV ideal para mercados e varejos que não podem parar.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-8">
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="xl" className="w-full rounded-full px-8 text-lg h-14 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 bg-brand-yellow text-brand-dark hover:bg-yellow-400 font-black border-none">
                  Começar Teste Grátis <ArrowRight className="ml-2" />
                </Button>
              </Link>
              <a href="#funcionalidades" className="w-full sm:w-auto">
                <Button variant="secondary" size="xl" className="w-full rounded-full px-8 text-lg h-14 border-2 font-bold">
                  Ver Funcionalidades
                </Button>
              </a>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-6 text-sm font-medium text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Instalação Imediata</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Emissor NFC-e</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500"/> Suporte Incluso</span>
            </div>
          </div>

          {/* Hero Image / Mockup - REPLICANDO O DASHBOARD AQUI */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-full z-10 perspective-1000">
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl border-4 border-slate-800 p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
               {/* Window Header */}
               <div className="h-8 bg-slate-800 rounded-t-xl flex items-center px-4 gap-2 border-b border-slate-700/50">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                 <div className="w-3 h-3 rounded-full bg-green-400"></div>
               </div>

               {/* Mockup Content - Miniatura do Dashboard */}
               <div className="bg-gray-50 rounded-b-xl overflow-hidden aspect-[16/10] flex text-xs md:text-sm relative select-none cursor-default">
                  
                  {/* Sidebar (Mini) */}
                  <div className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-4 border-t border-slate-800 shrink-0">
                      <div className="p-2 bg-brand-yellow rounded-lg text-slate-900 shadow-lg shadow-yellow-500/20"><Store size={18} /></div>
                      <div className="w-8 h-[1px] bg-slate-800 my-1"></div>
                      <div className="p-2 text-slate-400 hover:text-white transition-colors"><ShoppingCart size={18} /></div>
                      <div className="p-2 text-slate-400 hover:text-white transition-colors"><Users size={18} /></div>
                      <div className="p-2 text-slate-400 hover:text-white transition-colors"><BarChart3 size={18} /></div>
                      <div className="mt-auto p-2 text-slate-600 hover:text-slate-400"><Settings size={18} /></div>
                  </div>

                  {/* Main Area */}
                  <div className="flex-1 flex flex-col min-w-0">
                      {/* Top Nav (Mini) */}
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

                      {/* Dashboard Content Grid */}
                      <div className="p-4 overflow-hidden flex-1 bg-gray-50 flex flex-col gap-4">
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-3">
                              {/* Card 1: Vendas */}
                              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 relative overflow-hidden group">
                                  <div className="absolute right-0 top-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                  <div className="flex items-center gap-1.5 text-green-600 text-[10px] font-bold uppercase tracking-wider relative z-10">
                                      <TrendingUp size={12} /> Vendas Hoje
                                  </div>
                                  <div className="text-xl font-black text-gray-900 relative z-10">R$ 1.250<span className="text-sm text-gray-400">,00</span></div>
                                  <div className="text-[10px] text-gray-400 relative z-10">15 pedidos realizados</div>
                              </div>
                              {/* Card 2: A Receber */}
                              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 relative overflow-hidden group">
                                  <div className="absolute right-0 top-0 w-16 h-16 bg-yellow-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                  <div className="flex items-center gap-1.5 text-yellow-600 text-[10px] font-bold uppercase tracking-wider relative z-10">
                                      <Wallet size={12} /> A Receber
                                  </div>
                                  <div className="text-xl font-black text-gray-900 relative z-10">R$ 450<span className="text-sm text-gray-400">,00</span></div>
                                  <div className="text-[10px] text-gray-400 relative z-10">Controle de Fiado</div>
                              </div>
                          </div>

                          {/* Bottom Graph Section */}
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
                              <div className="flex justify-between items-center mb-3">
                                 <span className="text-[10px] font-bold text-gray-500 uppercase">Fluxo Semanal</span>
                                 <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">+12% vs. anterior</span>
                              </div>
                              <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 px-1 pb-1">
                                  {[35, 55, 40, 70, 50, 90, 65].map((h, i) => (
                                      <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer h-full">
                                          <div className="w-full bg-gray-100 rounded-t-sm relative h-full flex items-end overflow-hidden">
                                              <div style={{height: `${h}%`}} className="w-full bg-brand-yellow rounded-t-sm transition-all duration-1000 ease-out group-hover:bg-yellow-400 relative"></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
               </div>
            </div>

            {/* Floating Badges */}
            <div className="absolute top-10 -right-8 bg-white p-3 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3 animate-bounce-slow z-20 hidden md:flex">
                <div className="bg-green-100 p-2 rounded-lg text-green-600"><CheckCircle size={20} /></div>
                <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">NFC-e</p>
                    <p className="font-black text-gray-800 text-sm">Emitida OK</p>
                </div>
            </div>

            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3 animate-bounce-slow z-20">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><WifiOff size={24} /></div>
                <div>
                    <p className="text-xs text-gray-500 font-bold uppercase">Conexão Perdida?</p>
                    <p className="font-black text-gray-800">PDV Continua Offline</p>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO DE PROBLEMAS (A Dor) --- */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900">Sua loja sofre com isso?</h2>
            <p className="text-gray-500 mt-2">Identificamos os maiores gargalos do varejo e resolvemos para você.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <ProblemCard 
              icon={AlertTriangle}
              title="Internet Caiu, Venda Parou?"
              desc="Nada pior do que fila parada. No Marketfy, o caixa continua funcionando offline e sincroniza tudo quando a conexão voltar."
              color="text-red-500"
              bg="bg-red-50"
            />
            <ProblemCard 
              icon={BookOpen}
              title="Prejuízo no Caderninho?"
              desc="Perde dinheiro com anotações de fiado em papel? Tenha um extrato digital detalhado por cliente e bloqueie inadimplentes automaticamente."
              color="text-orange-500"
              bg="bg-orange-50"
            />
            <ProblemCard 
              icon={Package}
              title="Estoque Furado?"
              desc="Sabe exatamente o que tem na prateleira? Acompanhe cada entrada, saída e quebra de estoque em tempo real."
              color="text-blue-500"
              bg="bg-blue-50"
            />
          </div>
        </div>
      </section>

      {/* --- SEÇÃO DE SOLUÇÕES (Funcionalidades Principais) --- */}
      <section id="funcionalidades" className="py-24 px-6 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4">Tudo o que seu negócio precisa em um só lugar</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Funcionalidades desenvolvidas pensando na agilidade do balcão e na segurança do escritório.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SolutionCard 
              icon={ShoppingCart}
              title="PDV 'À Prova de Falhas'"
              desc="Frente de Caixa rápido e intuitivo. Abra e feche o caixa, realize sangrias e venda em segundos. Se a internet cair, o sistema guarda as vendas e envia depois."
            />
            <SolutionCard 
              icon={DollarSign}
              title="Gestão Inteligente de Fiado"
              desc="Digitalize o crédito da casa. Defina limites por cliente, veja o histórico completo (Ledger) e saiba exatamente quanto tem 'A Receber'."
            />
            <SolutionCard 
              icon={FileText}
              title="Fiscal Descomplicado"
              desc="Emita NFC-e sem dor de cabeça. Upload simples do Certificado A1, configuração automática de CSC e cálculo de tributos simplificado."
            />
            <SolutionCard 
              icon={BarChart3}
              title="Decisões Baseadas em Dados"
              desc="Não chute, saiba. Curva ABC de produtos, Ticket Médio e DRE Simplificado para ver seu lucro real no final do mês."
            />
            <SolutionCard 
              icon={Package}
              title="Controle de Estoque"
              desc="Registro auditável de todas as entradas e saídas. Busca rápida por código de barras e alertas de estoque baixo."
            />
            <SolutionCard 
              icon={ShieldCheck}
              title="Segurança na Nuvem"
              desc="Seus dados salvos com backups diários. Controle de acesso hierárquico (Dono, Gerente, Operador) para segurança total."
            />
          </div>
        </div>
      </section>

      {/* --- PROVA SOCIAL (Depoimentos) --- */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-12">Quem usa, recomenda</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 relative hover:shadow-md transition-shadow">
              <div className="text-yellow-400 flex gap-1 mb-4">
                <Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} />
              </div>
              <p className="text-gray-600 text-lg italic mb-6">
                &quot;Antes, quando a internet caía, eu tinha que anotar as vendas no papel. Com o Marketfy, o caixa não para nunca. A sincronização automática salvou meu dia.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">J</div>
                <div>
                    <p className="font-bold text-gray-900">João Silva</p>
                    <p className="text-sm text-gray-500">Dono de Minimercado</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 relative hover:shadow-md transition-shadow">
              <div className="text-yellow-400 flex gap-1 mb-4">
                <Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} /><Star fill="currentColor" size={20} />
              </div>
              <p className="text-gray-600 text-lg italic mb-6">
                &quot;O controle de fiado organizou minha vida. O cliente recebe o extrato e eu sei quem está devendo. A inadimplência caiu 80%.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">M</div>
                <div>
                    <p className="font-bold text-gray-900">Maria Lúcia</p>
                    <p className="text-sm text-gray-500">Mercearia do Bairro</p>
                </div>
              </div>
            </div>
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
                Sem taxas de implantação. Cancele quando quiser.<br/>
                Todos os planos incluem atualizações gratuitas.
              </p>
            </div>
            
            {/* Toggle de Ciclo de Cobrança */}
            <div className="bg-slate-800 p-1.5 rounded-xl flex text-sm font-bold shadow-2xl border border-slate-700 mx-auto lg:mx-0 flex-wrap justify-center">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-brand-yellow text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setBillingCycle('semiannual')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg transition-all duration-300 ${billingCycle === 'semiannual' ? 'bg-brand-yellow text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
              >
                6 Meses <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full ml-1 hidden sm:inline-block">-5%</span>
              </button>
              <button 
                onClick={() => setBillingCycle('annual')}
                className={`px-4 sm:px-6 py-2.5 rounded-lg transition-all duration-300 ${billingCycle === 'annual' ? 'bg-brand-yellow text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}
              >
                Anual <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full ml-1 hidden sm:inline-block">-10%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PlanCard 
              title="Básico" 
              price={getPrice(129.90)}
              cycle={billingCycle}
              description="Ideal para quem está começando e precisa organizar a casa."
              features={[
                '1 Usuário de Acesso', 
                '1 Terminal de Venda (PDV)', 
                'Emissão de Cupons Fiscais', 
                'Controle de Estoque', 
                'Relatórios Simples',
                'Suporte via E-mail'
              ]}
            />
            <PlanCard 
              title="Pro" 
              price={getPrice(259.90)} 
              cycle={billingCycle}
              description="Para mercados em crescimento que precisam de gestão financeira."
              highlight 
              features={[
                'Tudo do Plano Básico',
                'Até 3 Caixas Simultâneos', 
                'Dashboard Financeiro (BI)', 
                'Relatórios Completos', 
                'Suporte Prioritário via WhatsApp'
              ]}
            />
            <PlanCard 
              title="Business" 
              price="Consultar" 
              description="Para redes de lojas ou operações de alto volume."
              features={[
                'Sem Limites de Usuários', 
                'Múltiplos Mercados (Filiais)', 
                'Terminais Ilimitados', 
                'Valor com base na demanda', 
                'Gestor de Conta Dedicado'
              ]}
            />
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
              question="Preciso instalar algum programa?" 
              answer="Não! O Marketfy roda direto no navegador (Chrome, Edge), mas funciona como um aplicativo instalado no seu computador, podendo ser acessado de qualquer lugar." 
              isOpen={openFaq === 0}
              onClick={() => toggleFaq(0)}
            />
            <FaqItem 
              question="Como funciona o modo Offline?" 
              answer="Nossa tecnologia salva os dados no seu navegador (IndexedDB) enquanto você está sem internet. Assim que a conexão volta, enviamos tudo para o servidor automaticamente sem você precisar fazer nada." 
              isOpen={openFaq === 1}
              onClick={() => toggleFaq(1)}
            />
            <FaqItem 
              question="Posso testar antes de pagar?" 
              answer="Sim, oferecemos um período de teste de 14 dias para o plano Pro, para que você possa conhecer todas as funcionalidades sem compromisso." 
              isOpen={openFaq === 2}
              onClick={() => toggleFaq(2)}
            />
            <FaqItem 
              question="Consigo importar meus produtos?" 
              answer="Sim, temos ferramentas para cadastro rápido e importação de produtos e estoque para facilitar sua migração." 
              isOpen={openFaq === 3}
              onClick={() => toggleFaq(3)}
            />
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-20 px-6 bg-brand-yellow">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-brand-dark mb-6">Pronto para transformar seu mercado?</h2>
          <p className="text-xl text-brand-dark/80 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de lojistas que já modernizaram sua gestão com o Marketfy.
          </p>
          <Link to="/register">
            <Button size="xl" className="rounded-full px-12 h-16 text-xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl hover:scale-105 transition-transform border-none">
              Criar Minha Conta Agora
            </Button>
          </Link>
          <p className="mt-4 text-sm text-brand-dark/60 font-medium">Não é necessário cartão de crédito para testar.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-all">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
               <Store size={20} />
            </div>
            <span className="font-bold text-xl text-slate-900">Marketfy</span>
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500">© 2026 Marketfy Tecnologia. Todos os direitos reservados.</p>
            <p className="text-xs text-gray-400 mt-1">Feito para o varejo brasileiro 🇧🇷</p>
          </div>
          <div className="flex gap-6 text-sm text-gray-500 font-medium">
            <a href="#" className="hover:text-brand-dark hover:underline">Termos</a>
            <a href="#" className="hover:text-brand-dark hover:underline">Privacidade</a>
            <a href="#" className="hover:text-brand-dark hover:underline">Suporte</a>
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

const PlanCard = ({ title, price, features, highlight, description, cycle }) => (
  <div className={`p-8 rounded-3xl border flex flex-col relative transition-transform hover:-translate-y-2 duration-300 ${highlight ? 'bg-white text-slate-900 border-brand-yellow ring-4 ring-brand-yellow/30 shadow-2xl scale-105 z-10' : 'bg-slate-800/50 border-slate-700 text-white backdrop-blur-sm hover:bg-slate-800'}`}>
    
    {highlight && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-yellow text-brand-dark text-xs font-black uppercase px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
        <Star size={12} fill="currentColor" /> Mais Popular
      </div>
    )}

    <div className="mb-6 border-b border-gray-200/10 pb-6">
      <h3 className={`text-2xl font-black mb-2 flex items-center gap-2 ${highlight ? 'text-gray-900' : 'text-gray-100'}`}>
        {title}
        {title === 'Business' && <Zap size={20} className="text-yellow-400" fill="currentColor" />}
      </h3>
      <p className={`text-sm mb-4 leading-snug min-h-[40px] ${highlight ? 'text-gray-500' : 'text-gray-400'}`}>{description}</p>
      
      <div className="flex items-baseline gap-1">
        {price !== 'Consultar' && <span className="text-sm font-medium opacity-60">R$</span>}
        <span className={`font-black tracking-tight ${price === 'Consultar' ? 'text-3xl' : 'text-5xl'}`}>{price}</span>
        {price !== 'Consultar' && <span className="text-sm font-bold opacity-60">/{cycle === 'monthly' ? 'mês' : (cycle === 'semiannual' ? 'mês' : 'mês')}</span>}
      </div>
      {price !== 'Consultar' && cycle !== 'monthly' && (
        <div className="text-xs mt-1 font-bold text-green-500">
          Cobrado {cycle === 'semiannual' ? 'semestralmente' : 'anualmente'}
        </div>
      )}
    </div>
    
    <ul className="space-y-4 mb-8 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-start gap-3 text-sm font-medium opacity-80">
          <CheckCircle size={18} className={`shrink-0 ${highlight ? 'text-green-600' : 'text-brand-yellow'}`} />
          <span className="leading-tight">{f}</span>
        </li>
      ))}
    </ul>

    <Link to="/register" className="block mt-auto">
        <Button 
            size="xl"
            className={`w-full font-bold h-14 rounded-xl shadow-lg transition-all ${highlight ? 'bg-brand-yellow text-brand-dark hover:bg-yellow-400 hover:shadow-yellow-200/50' : 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 hover:border-slate-500'}`}
        >
            Escolher {title}
        </Button>
    </Link>
  </div>
);

const FaqItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
    <button 
      onClick={onClick}
      className="w-full flex justify-between items-center p-4 text-left font-bold text-gray-900 bg-white hover:bg-gray-50 transition-colors"
    >
      {question}
      <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 p-4 pt-0 border-t border-gray-100' : 'max-h-0'}`}>
      <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
    </div>
  </div>
);