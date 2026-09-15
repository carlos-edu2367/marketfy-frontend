import { useEffect, useMemo, useState } from 'react';
import FunnelProgressBar from '../../components/marketing/FunnelProgressBar';
import FunnelScoreRing from '../../components/marketing/FunnelScoreRing';
import FunnelOfferPanel from '../../components/marketing/FunnelOfferPanel';
import CookieConsentBanner from '../../components/CookieConsentBanner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { trackFunnelEvent, getFunnelVisitorId } from '../../lib/funnelTracking';
import { createFunnelLead } from '../../lib/marketingFunnelApi';

const FUNNEL_VARIANT = 'B';

const SCENARIOS = [
  {
    id: 's1',
    time: '08:17',
    title: 'A internet oscila e começa a formar fila no caixa.',
    story:
      'Tem gente entrando para comprar pão, café, cigarro, leite — justamente no horário em que alguns clientes estão com pressa. O que acontece no seu caixa se a conexão cair?',
    painKey: 'offline',
    choices: [
      { label: 'Continuamos vendendo', sub: 'O PDV funciona sem depender da internet.', pain: 0 },
      { label: 'Fica mais lento / improvisamos', sub: 'Tem contingência, mas não é simples.', pain: 2 },
      { label: 'O caixa praticamente para', sub: 'Precisamos esperar a conexão voltar.', pain: 5, danger: true },
    ],
  },
  {
    id: 's2',
    time: '11:42',
    title: 'Um cliente procura um item que "consta no sistema", mas ninguém acha na prateleira.',
    story:
      'O funcionário olha no estoque, pergunta pra outro funcionário e começa a conferir caixa. O cliente espera. Quanto você confia na quantidade exibida no seu sistema hoje?',
    painKey: 'stock',
    choices: [
      { label: 'Confio bastante', sub: 'Entrada, venda e baixa ficam sincronizadas.', pain: 0 },
      { label: 'Mais ou menos', sub: 'Tem diferença que exige conferência manual.', pain: 3 },
      { label: 'Confio pouco', sub: 'O estoque no sistema nem sempre representa a prateleira.', pain: 5, danger: true },
    ],
  },
  {
    id: 's3',
    time: '14:25',
    title: 'Um cliente antigo pede para anotar R$ 86 no fiado.',
    story:
      'Você quer manter a relação com o cliente, mas também precisa saber quanto ele já deve e quando pagou da última vez. Onde essa informação está?',
    painKey: 'credit',
    choices: [
      { label: 'No próprio sistema', sub: 'Saldo e histórico por cliente.', pain: 0 },
      { label: 'Em planilha / WhatsApp', sub: 'Consigo achar, mas fica separado.', pain: 2 },
      { label: 'Caderno ou memória', sub: 'O controle depende da anotação estar certa.', pain: 5, danger: true },
    ],
  },
  {
    id: 's4',
    time: '18:10',
    title: 'No pico da tarde, o cliente pede a nota fiscal.',
    story:
      'Fila andando, funcionário novo no caixa, vários pagamentos acontecendo ao mesmo tempo. A emissão fiscal faz parte da venda ou vira outro processo?',
    painKey: 'fiscal',
    choices: [
      { label: 'Já sai pelo fluxo do PDV', sub: 'O operador resolve na própria venda.', pain: 0 },
      { label: 'Uso uma etapa / ferramenta separada', sub: 'Funciona, mas quebra o ritmo.', pain: 2 },
      { label: 'É uma dor recorrente', sub: 'Tenho retrabalho, dúvidas ou limitações.', pain: 5, danger: true },
    ],
  },
  {
    id: 's5',
    time: '21:08',
    title: 'Loja fechada. Agora vem a pergunta do dono: "quanto sobrou de verdade?"',
    story:
      'Você sabe quanto vendeu. Mas precisa entender caixa, contas, recebimentos, compras e o que está preso em estoque ou fiado. Você consegue responder sem abrir planilhas e extratos separados?',
    painKey: 'finance',
    choices: [
      { label: 'Sim. Tenho visão consolidada.', sub: 'Consigo acompanhar por painel.', pain: 0 },
      { label: 'Preciso juntar algumas informações', sub: 'O número existe, mas está espalhado.', pain: 3 },
      { label: 'É difícil saber com clareza', sub: 'Faturamento é fácil. Resultado, nem tanto.', pain: 6, danger: true },
    ],
  },
];

function buildProblemCards(pain) {
  const cards = [];
  if (pain.offline > 0) cards.push({ title: 'Venda sem internet', text: 'Seu caixa ainda tem algum nível de dependência da conexão.' });
  if (pain.stock > 0) cards.push({ title: 'Estoque que representa a prateleira', text: 'Quanto mais divergência, mais reposição e compra viram conferência manual.' });
  if (pain.credit > 0) cards.push({ title: 'Fiado rastreável', text: 'Recebíveis precisam ficar ligados ao cliente e ao caixa.' });
  if (pain.fiscal > 0) cards.push({ title: 'Fiscal dentro do fluxo', text: 'Trocar de ferramenta no meio do pico aumenta atrito operacional.' });
  if (pain.finance > 0) cards.push({ title: 'Visão financeira', text: 'O fechamento precisa gerar leitura do negócio, não mais uma tarefa.' });
  if (cards.length < 3) cards.push({ title: 'Centralização', text: 'Concentrar a operação reduz o número de pontos que o dono precisa conferir.' });
  return cards.slice(0, 3);
}

export default function FunilDiaDoMercado() {
  const [screen, setScreen] = useState('intro');
  const [pain, setPain] = useState({ offline: 0, stock: 0, credit: 0, fiscal: 0, finance: 0 });
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    if (screen === 'intro') return;
    trackFunnelEvent('marketfy_funnel_step_view', { funnelVariant: FUNNEL_VARIANT, step: screen });
  }, [screen]);

  const currentIndex = SCENARIOS.findIndex((s) => s.id === screen);
  const scenario = currentIndex >= 0 ? SCENARIOS[currentIndex] : null;
  const totalPain = useMemo(() => Object.values(pain).reduce((a, b) => a + b, 0), [pain]);
  const score = useMemo(() => Math.max(24, Math.min(94, 94 - totalPain * 3)), [totalPain]);

  const handleStart = () => {
    trackFunnelEvent('marketfy_funnel_start', { funnelVariant: FUNNEL_VARIANT });
    setScreen('s1');
  };

  const handleAnswer = (painKey, painValue) => {
    setPain((prev) => ({ ...prev, [painKey]: painValue }));
    const nextIndex = currentIndex + 1;
    setScreen(nextIndex < SCENARIOS.length ? SCENARIOS[nextIndex].id : 'final');
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setLeadError('Preencha nome e WhatsApp para ver o plano indicado.');
      return;
    }
    setLeadError('');
    try {
      await createFunnelLead({
        visitor_id: getFunnelVisitorId(),
        funnel_variant: FUNNEL_VARIANT,
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim() || null,
        control_score: score,
        answers: pain,
      });
    } catch {
      // segue mostrando a oferta mesmo se o lead falhar em persistir
    }
    trackFunnelEvent('marketfy_lead_submit', { funnelVariant: FUNNEL_VARIANT, control_score: score });
    setLeadSent(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {screen !== 'intro' && (
        <FunnelProgressBar
          current={currentIndex >= 0 ? currentIndex + 1 : SCENARIOS.length}
          total={SCENARIOS.length}
          label={scenario ? scenario.time : 'diagnóstico concluído'}
        />
      )}

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {screen === 'intro' && (
          <section className="py-10 text-center">
            <span className="inline-flex rounded-full bg-lime-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-brand-green">
              Teste rápido · menos de 2 minutos
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-gray-950 sm:text-5xl">
              Seu mercado aguenta um dia ruim sem virar um caos?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-500">
              Vamos simular 5 situações comuns — internet instável, produto faltando, fiado, nota
              fiscal e fechamento. Você responde como sua operação lida com cada uma. No final,
              mostramos seu nível de controle.
            </p>
            <Button onClick={handleStart} className="mt-7 font-bold" size="lg">
              Simular meu dia →
            </Button>
            <p className="mt-3 text-xs text-gray-400">Não é prova. É um raio-x prático da operação.</p>
          </section>
        )}

        {scenario && (
          <section>
            <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
              {scenario.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">{scenario.story}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {scenario.choices.map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  onClick={() => handleAnswer(scenario.painKey, choice.pain)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    choice.danger ? 'border-red-200 hover:border-red-300' : 'border-gray-200 hover:border-brand-yellow'
                  }`}
                >
                  <strong className="block text-sm text-gray-950">{choice.label}</strong>
                  <span className="mt-1.5 block text-xs leading-5 text-gray-500">{choice.sub}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === 'final' && (
          <section className="py-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <FunnelScoreRing score={score} />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-brand-green">
                  Resultado do teste
                </span>
                <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-gray-950">
                  {totalPain >= 17
                    ? 'Seu mercado vende, mas o dono ainda precisa "segurar" a operação.'
                    : totalPain >= 8
                    ? 'Sua operação tem base, mas ainda há pontos que dependem de conferência.'
                    : 'Seu mercado já tem bons controles. A oportunidade é centralizar e ganhar visão.'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  O problema não é falta de esforço: é informação espalhada. Quando venda, estoque,
                  fiado, fiscal e financeiro não conversam, o dono vira a integração do sistema.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {buildProblemCards(pain).map((card) => (
                <div key={card.title} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <strong className="text-sm text-gray-950">{card.title}</strong>
                  <p className="mt-2 text-xs leading-5 text-gray-500">{card.text}</p>
                </div>
              ))}
            </div>

            {!leadSent ? (
              <form onSubmit={handleLeadSubmit} className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Cidade / UF" value={city} onChange={(e) => setCity(e.target.value)} />
                <Button type="submit" className="font-bold">
                  Ver plano indicado →
                </Button>
                {leadError && <p className="text-xs font-medium text-red-500 sm:col-span-4">{leadError}</p>}
              </form>
            ) : (
              <FunnelOfferPanel funnelVariant={FUNNEL_VARIANT} />
            )}
          </section>
        )}
      </main>

      <CookieConsentBanner />
    </div>
  );
}
