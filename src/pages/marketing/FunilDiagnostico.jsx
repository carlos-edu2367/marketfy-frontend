import { useEffect, useMemo, useState } from 'react';
import FunnelProgressBar from '../../components/marketing/FunnelProgressBar';
import FunnelScoreRing from '../../components/marketing/FunnelScoreRing';
import FunnelOfferPanel from '../../components/marketing/FunnelOfferPanel';
import CookieConsentBanner from '../../components/CookieConsentBanner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { trackFunnelEvent, getFunnelVisitorId } from '../../lib/funnelTracking';
import { createFunnelLead } from '../../lib/marketingFunnelApi';

const FUNNEL_VARIANT = 'A';

const QUESTIONS = [
  {
    id: 'q1',
    index: 'Pergunta 1 de 11',
    title: 'Qual negócio você administra hoje?',
    lead: 'Isso ajuda a calibrar o diagnóstico para o tamanho e a rotina da operação.',
    key: 'business',
    options: [
      { label: 'Mercadinho de bairro', sub: 'Operação enxuta, geralmente com 1 ou 2 caixas.', value: 'Mercadinho de bairro', pain: 0 },
      { label: 'Mercado / supermercado', sub: 'Mais fluxo, mix maior e equipe no caixa.', value: 'Mercado / supermercado', pain: 0 },
      { label: 'Mercearia / conveniência', sub: 'Venda rápida e forte recorrência de clientes.', value: 'Mercearia / conveniência', pain: 0 },
      { label: 'Outro varejo alimentar', sub: 'Hortifruti, açougue, padaria ou operação semelhante.', value: 'Outro varejo alimentar', pain: 0 },
    ],
  },
  {
    id: 'q2',
    index: 'Pergunta 2 de 11',
    title: 'Quantos caixas vendem ao mesmo tempo nos horários de pico?',
    key: 'checkouts',
    options: [
      { label: '1 caixa', value: '1', pain: 0 },
      { label: '2 caixas', value: '2', pain: 0 },
      { label: '3 a 5 caixas', value: '3-5', pain: 0 },
      { label: '6 ou mais caixas', value: '6+', pain: 0 },
    ],
  },
  {
    id: 'q3',
    index: 'Pergunta 3 de 11',
    title: 'Quando a internet fica instável, o seu caixa continua vendendo normalmente?',
    lead: 'Fila parada é um problema diferente de "site lento": é venda interrompida no pior momento.',
    key: 'offline',
    options: [
      { label: 'Sim. O caixa continua.', sub: 'A operação já tem contingência.', value: 'Sim, continua', pain: 0 },
      { label: 'Às vezes / depende', sub: 'Já tivemos lentidão ou interrupção.', value: 'Às vezes', pain: 2 },
      { label: 'Não. Se cair, complica.', sub: 'O caixa depende da conexão.', value: 'Não', pain: 4 },
    ],
  },
  {
    id: 'q4',
    index: 'Pergunta 4 de 11',
    title: 'Seu estoque "bate" com a prateleira?',
    key: 'stock',
    options: [
      { label: 'Quase sempre', sub: 'Entrada e saída estão bem registradas.', value: 'Quase sempre', pain: 0 },
      { label: 'Tem algumas diferenças', sub: 'Às vezes falta no sistema ou sobra na tela.', value: 'Algumas diferenças', pain: 2 },
      { label: 'Eu não confio no estoque atual', sub: 'Compra e reposição ainda dependem muito de conferência manual.', value: 'Não confio no estoque', pain: 4 },
    ],
  },
  {
    id: 'q5',
    index: 'Pergunta 5 de 11',
    title: 'Como você controla vendas no fiado?',
    key: 'credit',
    options: [
      { label: 'Já fica no sistema', sub: 'Saldo e histórico por cliente.', value: 'Sistema integrado', pain: 0 },
      { label: 'Planilha, WhatsApp ou anotações separadas', sub: 'Funciona, mas exige conferência.', value: 'Planilha / WhatsApp', pain: 2 },
      { label: 'Caderno ou memória', sub: 'A cobrança depende de registro manual.', value: 'Caderno / memória', pain: 4 },
      { label: 'Não vendo fiado', value: 'Não vendo fiado', pain: 0 },
    ],
  },
  {
    id: 'q6',
    index: 'Pergunta 6 de 11',
    title: 'E a emissão fiscal hoje?',
    lead: 'A ideia é entender se nota e cupom fazem parte do fluxo ou viram uma tarefa paralela.',
    key: 'fiscal',
    options: [
      { label: 'Integrada ao PDV', sub: 'Emissão acontece na própria venda.', value: 'Integrada ao PDV', pain: 0 },
      { label: 'Uso outra ferramenta / processo separado', value: 'Ferramenta separada', pain: 2 },
      { label: 'Dá trabalho ou tenho dúvidas no processo', value: 'Dá trabalho / tenho dúvidas', pain: 4 },
    ],
  },
  {
    id: 'q7',
    index: 'Pergunta 7 de 11',
    title: 'No fim do mês, você sabe com clareza quanto o mercado realmente gerou?',
    key: 'finance',
    options: [
      { label: 'Sim, acompanho por painel', sub: 'Vendas, caixa e contas ficam organizados.', value: 'Sim, acompanho por painel', pain: 0 },
      { label: 'Preciso juntar várias informações', sub: 'Extrato, planilha, caixa e sistema.', value: 'Preciso juntar informações', pain: 3 },
      { label: 'Acabo indo mais pelo "feeling"', sub: 'Faturamento eu vejo. Resultado de verdade, nem sempre.', value: 'Mais no feeling', pain: 5 },
    ],
  },
  {
    id: 'q8',
    index: 'Pergunta 8 de 11',
    title: 'Qual dessas situações mais incomoda você hoje?',
    key: 'mainPain',
    options: [
      { label: 'Caixa lento, travando ou dependente da internet', value: 'Caixa lento / internet', pain: 4 },
      { label: 'Estoque errado e reposição no achismo', value: 'Estoque e reposição', pain: 4 },
      { label: 'Fiado e contas a receber difíceis de acompanhar', value: 'Fiado e recebimentos', pain: 4 },
      { label: 'Não ter visão financeira clara do negócio', value: 'Financeiro sem visão', pain: 4 },
      { label: 'Emissão fiscal e operação em ferramentas separadas', value: 'Fiscal / emissão', pain: 4 },
    ],
  },
  {
    id: 'q9',
    index: 'Pergunta 9 de 11',
    title: 'O que você usa hoje para tocar a operação?',
    key: 'current',
    options: [
      { label: 'Outro sistema de PDV/ERP', value: 'Outro sistema de PDV', pain: 1 },
      { label: 'Planilhas + ferramentas separadas', value: 'Planilhas + ferramentas', pain: 3 },
      { label: 'Muita coisa manual', value: 'Muito manual', pain: 4 },
      { label: 'Estou abrindo ou estruturando o mercado agora', value: 'Abrindo / implantando', pain: 2 },
    ],
  },
  {
    id: 'q10',
    index: 'Pergunta 10 de 11',
    title: 'Se encontrar uma solução que resolva esses pontos, quando gostaria de organizar isso?',
    key: 'urgency',
    options: [
      { label: 'Agora / nos próximos dias', value: 'Agora / próximos dias', pain: 2 },
      { label: 'Nas próximas semanas', value: 'Próximas semanas', pain: 1 },
      { label: 'Estou pesquisando primeiro', value: 'Só pesquisando', pain: 0 },
    ],
  },
];

const GAP_DEFINITIONS = [
  { key: 'offline', isGap: (v) => v !== 'Sim, continua', title: 'Continuidade de venda', text: 'Uma operação offline-first reduz a dependência do caixa em relação à conexão.' },
  { key: 'stock', isGap: (v) => v !== 'Quase sempre', title: 'Estoque', text: 'Venda e estoque precisam conversar para a reposição não depender de memória.' },
  { key: 'credit', isGap: (v) => Boolean(v) && v !== 'Sistema integrado' && v !== 'Não vendo fiado', title: 'Fiado', text: 'Saldo e histórico por cliente evitam que o recebível fique espalhado.' },
  { key: 'finance', isGap: (v) => v !== 'Sim, acompanho por painel', title: 'Financeiro', text: 'O dono precisa enxergar vendas e movimento financeiro sem montar o número manualmente.' },
  { key: 'fiscal', isGap: (v) => v !== 'Integrada ao PDV', title: 'Fiscal', text: 'Emitir dentro do fluxo reduz troca de ferramenta e retrabalho.' },
];

function buildGaps(answers) {
  const gaps = GAP_DEFINITIONS.filter((g) => g.isGap(answers[g.key])).map((g) => ({ title: g.title, text: g.text }));
  if (gaps.length < 2) {
    gaps.push({ title: 'Centralização', text: 'Seu ganho potencial está em colocar operação e gestão na mesma rotina.' });
  }
  return gaps.slice(0, 4);
}

export default function FunilDiagnostico() {
  const [screen, setScreen] = useState('intro'); // intro | q1..q10 | lead | analysis | result
  const [answers, setAnswers] = useState({});
  const [painScore, setPainScore] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [leadError, setLeadError] = useState('');
  const [offerRevealed, setOfferRevealed] = useState(false);

  useEffect(() => {
    if (screen === 'intro') return;
    trackFunnelEvent('marketfy_funnel_step_view', { funnelVariant: FUNNEL_VARIANT, step: screen });
  }, [screen]);

  useEffect(() => {
    if (screen !== 'analysis') return undefined;
    const timer = setTimeout(() => setScreen('result'), 1200);
    return () => clearTimeout(timer);
  }, [screen]);

  const controlScore = useMemo(() => Math.max(22, Math.min(88, 92 - painScore * 3)), [painScore]);
  const questionIndex = QUESTIONS.findIndex((q) => q.id === screen);
  const question = questionIndex >= 0 ? QUESTIONS[questionIndex] : null;

  const handleStart = () => {
    trackFunnelEvent('marketfy_funnel_start', { funnelVariant: FUNNEL_VARIANT });
    setScreen('q1');
  };

  const handleAnswer = (key, value, pain) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setPainScore((prev) => prev + pain);
    const nextIndex = questionIndex + 1;
    setScreen(nextIndex < QUESTIONS.length ? QUESTIONS[nextIndex].id : 'lead');
  };

  const handleLeadSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      setLeadError('Preencha seu nome e pelo menos WhatsApp ou e-mail para continuar.');
      return;
    }
    setLeadError('');
    try {
      await createFunnelLead({
        visitor_id: getFunnelVisitorId(),
        funnel_variant: FUNNEL_VARIANT,
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        control_score: controlScore,
        answers,
      });
    } catch {
      // segue mostrando o resultado mesmo se o lead falhar em persistir
    }
    trackFunnelEvent('marketfy_lead_submit', { funnelVariant: FUNNEL_VARIANT, control_score: controlScore });
    setScreen('analysis');
  };

  const riskLabel = painScore >= 18 ? 'controle vulnerável' : painScore >= 10 ? 'há pontos de atenção' : 'boa base operacional';
  const resultTitle =
    painScore >= 18
      ? 'Hoje, parte importante do seu mercado ainda depende de improviso e conferência manual.'
      : painScore >= 10
      ? 'Seu mercado já tem estrutura, mas existem gargalos que podem crescer junto com a operação.'
      : 'Você já tem uma boa base. O ganho está em centralizar e enxergar melhor a operação.';

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {screen !== 'intro' && (
        <FunnelProgressBar
          current={questionIndex >= 0 ? questionIndex + 1 : QUESTIONS.length}
          total={QUESTIONS.length}
          label={
            screen === 'lead'
              ? 'última etapa'
              : screen === 'analysis' || screen === 'result'
              ? 'diagnóstico concluído'
              : `pergunta ${questionIndex + 1} de ${QUESTIONS.length}`
          }
        />
      )}

      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        {screen === 'intro' && (
          <section className="text-center">
            <span className="inline-flex rounded-full bg-lime-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-brand-green">
              Diagnóstico gratuito · 2 a 4 minutos
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight text-gray-950 sm:text-5xl">
              Seu mercado está sob controle — ou você só descobre os problemas no fim do dia?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-500">
              Responda algumas perguntas sobre caixa, estoque, fiado, fiscal e financeiro. No
              final, o Marketfy monta um diagnóstico do seu nível de controle e recomenda a
              configuração mais adequada para sua operação.
            </p>
            <Button onClick={handleStart} className="mt-7 font-bold" size="lg">
              Começar meu diagnóstico →
            </Button>
            <p className="mt-3 text-xs text-gray-400">Sem formulário gigante. Uma pergunta por vez.</p>
          </section>
        )}

        {question && (
          <section>
            <span className="text-xs font-black uppercase tracking-wider text-brand-green">{question.index}</span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
              {question.title}
            </h2>
            {question.lead && <p className="mt-3 text-sm leading-6 text-gray-500">{question.lead}</p>}
            <div className="mt-6 grid gap-2.5">
              {question.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleAnswer(question.key, option.value, option.pain)}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-yellow hover:shadow-md"
                >
                  <span>
                    <strong className="block text-sm text-gray-950">{option.label}</strong>
                    {option.sub && <span className="mt-1 block text-xs leading-5 text-gray-500">{option.sub}</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === 'lead' && (
          <section>
            <span className="text-xs font-black uppercase tracking-wider text-brand-green">Última etapa</span>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
              Para onde enviamos sua recomendação?
            </h2>
            <form onSubmit={handleLeadSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Input placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="sm:col-span-2">
                <Input placeholder="Cidade / UF" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <Button type="submit" className="font-bold sm:col-span-2" size="lg">
                Analisar meu perfil →
              </Button>
              {leadError && <p className="text-xs font-medium text-red-500 sm:col-span-2">{leadError}</p>}
            </form>
          </section>
        )}

        {screen === 'analysis' && (
          <section className="py-16 text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-100 border-t-brand-green" />
            <h2 className="mt-6 text-2xl font-black text-gray-950">Estamos cruzando suas respostas...</h2>
          </section>
        )}

        {screen === 'result' && (
          <section>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <FunnelScoreRing score={controlScore} />
              <div>
                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-600">
                  {riskLabel}
                </span>
                <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-gray-950 sm:text-3xl">
                  {resultTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Pelas suas respostas, a oportunidade não está apenas em trocar o sistema do
                  caixa. Está em conectar a venda ao estoque, fiscal, fiado e financeiro para
                  reduzir decisões no escuro.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {buildGaps(answers).map((gap) => (
                <div key={gap.title} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                  <strong className="text-sm text-gray-950">{gap.title}</strong>
                  <p className="mt-1.5 text-xs leading-5 text-gray-500">{gap.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-lime-200 bg-lime-50 p-4 text-sm leading-6 text-emerald-900">
              <strong>Leitura do perfil:</strong> o Marketfy Pro faz mais sentido quando o objetivo
              é centralizar operação e gestão, não apenas registrar vendas.
            </div>

            {!offerRevealed ? (
              <Button onClick={() => setOfferRevealed(true)} className="mt-6 font-bold" size="lg">
                Ver minha recomendação →
              </Button>
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
