# Plano de refatoração de conversão: landing, cadastro, planos e upgrade

> **Status:** proposta, nada foi implementado.
> **Data:** 2026-09-14
> **Escopo:** `src/pages/Home.jsx`, `src/pages/auth/Register.jsx`, `src/pages/auth/Login.jsx`, `src/pages/auth/Plans.jsx`, os pontos de upgrade dentro do app (`AdminLayout`, `PlanGuard`, `Financial`, `Settings`, `WelcomeModal`) e a compra de créditos fiscais (`FiscalCredits`, `CreditPackageCard`, `PurchaseConfirmModal`).
> **Fontes de método:** Conversion-Centered Design (Oli Gardner/Unbounce), CRO baseado em dados (Peep Laja/CXL), Emotional Targeting (Talia Wolf), psicologia de preço (Nick Kolenda), Laws of UX (Jon Yablonski), Fogg Behavior Model (B=MAP), NN/g e Refactoring UI. Links no fim do documento.

---

## 0. Resumo executivo

A landing tem boa intenção: fala de dores reais do pequeno varejo, como internet caindo, fiado no caderno e estoque furado. Mas quatro problemas estruturais seguram a conversão, e **os dois primeiros são mais graves do que qualquer questão estética**:

1. **Promessas que o produto não cumpre.** A landing e o cadastro prometem coisas que não existem ou são diferentes no sistema: "funciona como aplicativo instalado" (não há PWA), "importação de produtos" (só existe exportação CSV), "Curva ABC e Ticket Médio" (só aparecem na landing), "NFC-e ilimitada" no trial (o trial tem 50/mês pela migration `c4d5e6f7a8b9`) e depoimentos e números sem lastro ("centenas de lojistas", "inadimplência caiu 80%"). Isso gera churn no trial e risco com o CDC e o CONAR (Anexo Q, testemunhais).
2. **Três fontes de verdade diferentes para preço e plano.** A landing tem preços fixos no código (R$ 129,90 e R$ 259,90) e calcula desconto no front (−5% e −10%). A tela `/plans` lê `GET /identity/plans`, e ali `price_180days` e `price_annual` são totais do período. A diferenciação "Básico × Pro" da landing não existe no backend, onde **todo plano `pago` recebe finance, reports e fiscal** (`plan_access_service.py:378-384`). Resultado: o visitante escolhe com base em algo que não vai receber.
3. **O funil tem passos e decisões demais.** Hoje o caminho é: landing → cadastro com 4 campos, incluindo CPF → modal de trial (uma nova decisão) → dashboard ou `/plans` → modal de cobrança (outra decisão, com jargão) → "Ir para o pagamento" leva para **Configurações > Faturas** → clicar em "Pagar" → checkout. No modelo de Fogg, cada passo reduz a *Ability*. A escolha feita na landing ("Escolher Pro") se perde no caminho.
4. **Não há medição.** Não existe nenhum analytics nas páginas de conversão. Sem linha de base, nenhuma mudança pode ser validada, o que contraria o método da CXL.

**O que este plano propõe, em ordem:**
**Fase 0**: medir e corrigir a honestidade das promessas. **Fase 1**: unificar a fonte de preço e reduzir passos do funil. **Fase 2**: refazer a tela de planos e o checkout. **Fase 3**: redesenhar a landing com base em pesquisa. **Fase 4**: upgrade contextual dentro do app e créditos fiscais. **Fase 5**: ciclo contínuo de experimentos.

---

## 1. Método e limitações

- **Análise heurística do código-fonte**, linha a linha, cruzada com o backend para validar cada promessa e cada regra de preço.
- **Benchmark**: a página de preços da Bling (4 planos, "Economize R$ 240/ano", tabela comparativa com 15 categorias, FAQ com 13 perguntas, "30 dias grátis", "Fale com vendas" no plano mais alto) e a landing da Hiper (segmentação por vertical, com páginas para minimercado, açougue e padaria; imprensa; tabela contra concorrentes).
- **Limitações:** (a) sem dados de tráfego, funil ou gravações, então as prioridades são hipóteses ordenadas por PXL e precisam ser validadas na Fase 0; (b) as páginas não foram renderizadas, porque o projeto está sem `node_modules` e optei por não alterar o ambiente; a análise visual foi feita pelas classes Tailwind; (c) não houve pesquisa com clientes, e a Seção 5 define como fazê-la.

---

## 2. Mapa do funil atual

```mermaid
flowchart TD
  A[Landing /] -->|"Começar Teste Grátis" / "Criar Conta Grátis" / "Escolher Pro"| B[/register<br/>nome, email, CPF, senha/]
  B --> C{Modal "Presente de boas-vindas"}
  C -->|"QUERO 14 DIAS GRÁTIS"| D[/dashboard + WelcomeModal/]
  C -->|"Não, obrigado. Quero o plano básico."| E[/plans/]
  D -->|trial expira| F[Overlay "Acesso Bloqueado" + banner vermelho pulsando]
  F --> E
  E -->|"Escolher plano"| G{Modal: Fatura por período × Cobrança recorrente}
  G -->|fatura - padrão| H[/dashboard/settings?tab=invoices/]
  H -->|"Pagar"| I[Checkout externo]
  G -->|recorrente + CPF/CNPJ de novo| I
```

**Atritos contados:** 3 decisões binárias antes de usar o produto (trial sim/não, plano, modo de cobrança), 1 dado pedido duas vezes (CPF/CNPJ), 1 promessa quebrada no CTA ("Ir para o pagamento" leva a uma lista de faturas), perda de contexto do plano escolhido na landing e nenhum caminho para quem escolhe "Business".

---

## 3. Diagnóstico detalhado

Severidade: **S1** bloqueia ou prejudica a confiança · **S2** reduz a conversão de forma relevante · **S3** polimento.

### 3.1 Landing (`src/pages/Home.jsx`)

| # | Problema | Evidência | Princípio violado | Sev. |
|---|---|---|---|---|
| L1 | Promessas não suportadas pelo produto: "funciona como um aplicativo instalado" (sem manifest ou service worker), "importação de produtos" (só há exportação CSV em `Inventory.jsx:324`), "Curva ABC, Ticket Médio" (inexistentes no app), "backups diários" (não verificável no front) | `Home.jsx:459`, `:477`, `:310`, `:320` | CCD **Credibility**; NN/g *trust*; CDC art. 30/37 (oferta vincula; publicidade enganosa) | S1 |
| L2 | Prova social sem lastro: depoimentos genéricos com avatar de inicial, métrica "inadimplência caiu 80%", "centenas de lojistas" | `:327-365`, `:490` | CONAR Anexo Q (testemunhais precisam ser reais e comprováveis); CXL: prova social falsa reduz confiança | S1 |
| L3 | Preços fixos no código e desconto calculado no front, divergentes do backend | `:47-55`, `:407`, `:421` | Fonte única de verdade; NN/g *explicit differences* | S1 |
| L4 | Diferenciação Básico × Pro ("Dashboard Financeiro (BI)" só no Pro) não corresponde à regra do backend | `:410-431` × `plan_access_service.py:381` | Credibility / Congruence | S1 |
| L5 | O card mostra "/mês" nos três ciclos e "Cobrado semestralmente" sem informar o total cobrado | `:568-574` | Kolenda: *partitioned pricing* só é ético com total visível; NN/g: deixar custos explícitos | S2 |
| L6 | "Business: Consultar" → "Escolher Business" leva para `/register`; não há canal de vendas | `:433-444`, `:586` | CCD **Conversion continuance** (a expectativa criada pelo CTA precisa ser cumprida) | S2 |
| L7 | A proposta de valor mistura 3 ideias no hero (offline, NFC-e, fiado), mas o H1 fala só de offline, que é um *diferencial técnico* e não o *resultado* que o dono do mercado busca | `:113-119` | CXL: *clarity > persuasion*; Talia Wolf: vender o resultado emocional, não a feature | S2 |
| L8 | Cinco rótulos diferentes para a mesma ação (criar conta ou trial): "Criar Conta Grátis", "Começar Teste Grátis", "Escolher X", "Criar Minha Conta Agora" | `:92`, `:124`, `:591`, `:494` | CCD **Attention ratio** e consistência; Jakob's Law | S2 |
| L9 | CTA secundário "Ver Funcionalidades" com o mesmo peso visual do primário (`size="xl"`, borda 2, rounded-full) | `:127-131` | Refactoring UI: *emphasize by de-emphasizing*; Von Restorff | S2 |
| L10 | O H1 usa gradiente `from-yellow-500` sobre fundo quase branco, com contraste de ~2:1 no início do gradiente, abaixo de WCAG AA | `:114` | Acessibilidade e legibilidade | S2 |
| L11 | Mockup "fake" do dashboard feito em JSX (cerca de 100 linhas), inclinado (`rotate-1`) e com badges flutuantes; não mostra o PDV, que é o momento "aha" | `:142-243` | NN/g: imagens de produto reais geram mais confiança que ilustrações decorativas | S3 |
| L12 | Classes de animação inexistentes no Tailwind (`animate-blob`, `animation-delay-2000`, `animate-bounce-slow`, `perspective-1000`); código morto que dá falsa sensação de efeito | `:103-104`, `:142`, `:228`, `:236` | Manutenibilidade | S3 |
| L13 | `Button` duplicado localmente ("recriado para evitar erros de importação"), diferente do `components/ui/Button.jsx`, o que causa divergência visual entre landing e app | `:12-40` | Design system | S3 |
| L14 | Barra de aviso "Oferta de Lançamento" sem prazo; urgência vaga e perene | `:65-68` | CCD **Urgency** só funciona se for real; se não for, remover | S3 |
| L15 | Footer com links `#` (Termos, Privacidade, Suporte) e sem CNPJ ou endereço | `:515-517` | Decreto 7.962/2013 art. 2º (identificação do fornecedor); LGPD | S1 |
| L16 | Nenhuma segmentação: o público real (minimercado, mercearia, padaria, açougue, hortifrúti) não se reconhece | toda a página | Talia Wolf: *relevância*; benchmark Hiper (páginas por segmento) | S2 |
| L17 | FAQ omite as objeções de compra mais comuns: preço da NFC-e e certificado A1, o que acontece com meus dados se eu cancelar, tem fidelidade, formas de pagamento (PIX/boleto/cartão), funciona no celular ou tablet, precisa de computador potente, contrato e 7 dias de arrependimento | `:450-483` | CXL: FAQ como tratamento de objeções perto do preço | S2 |
| L18 | `index.html`: favicon externo do GitHub do Vite, `<title>SGM Marketfy</title>`, sem meta description ou OG, SPA sem pré-renderização (SEO e compartilhamento em WhatsApp prejudicados) | `index.html:5-10` | Aquisição, *message match* com anúncios | S2 |
| L19 | Usuário logado que visita `/` é redirecionado (ok), mas não há rota pública `/precos`: o link "Planos" da landing só rola a página, e `/plans` é uma tela autenticada | `App.jsx:69-74`, `:86` | Jakob's Law (usuários esperam `/precos`); SEO | S3 |

### 3.2 Cadastro e oferta de trial (`Register.jsx`, `Login.jsx`, `WelcomeModal.jsx`)

| # | Problema | Evidência | Princípio | Sev. |
|---|---|---|---|---|
| R1 | O trial é uma **decisão extra** em modal após o cadastro. Quem clicou em "Começar Teste Grátis" já decidiu | `Register.jsx:153-196` | Fogg: *Ability*; Hick's Law; CCD **Continuance** | S1 |
| R2 | O modal promete "Emissão de NFC-e Ilimitada", mas o trial tem 50/mês | `:169` × migration `c4d5e6f7a8b9:56` | Credibility / CDC | S1 |
| R3 | O botão de recusa usa *confirmshaming* ("Não, obrigado. Quero o plano básico.") e leva para `/plans`, onde não existe "plano básico" com esse nome | `:190`, `:90-92` | NN/g: *dark patterns* corroem confiança | S2 |
| R4 | CPF obrigatório no primeiro passo, sem máscara, sem explicação do motivo e sem aceitar CNPJ; o placeholder mostra máscara, mas a validação é `min(11)` | `:16`, `:117-122` | Fogg *Ability*; Tesler's Law (a complexidade fica com o sistema) | S2 |
| R5 | A tela de cadastro não tem marca, prova, benefício nem visualização do plano escolhido; `?plan=` não é preservado | `:95-150` | CCD **Context/Congruence**; *message match* | S2 |
| R6 | Não há aceite de Termos e Privacidade (LGPD) | `:104-139` | Compliance | S1 |
| R7 | O `WelcomeModal` diz "Seu período de teste Premium começou" a **qualquer** usuário que ainda não o viu, inclusive pagantes ou usuários sem plano | `WelcomeModal.jsx:48-55` | Credibility | S2 |
| R8 | O login faz uma chamada sem função a `/identity/plans` e assina "Neectify Tecnologia" enquanto a landing diz "Marketfy Tecnologia"; o título é "SGM Marketfy" | `Login.jsx:44`, `:102` | Consistência de marca; Doherty threshold | S3 |
| R9 | Não há login social (Google), "mostrar senha" nem indicação de força da senha | `Register.jsx` | Fogg *Ability* | S3 |
| R10 | `animate-scale-in` não existe no Tailwind | `:155` | Manutenibilidade | S3 |

### 3.3 Tela de planos e modal de contratação (`src/pages/auth/Plans.jsx`)

| # | Problema | Evidência | Princípio | Sev. |
|---|---|---|---|---|
| P1 | Header sem "Sair", "Voltar" ou "Suporte". Para um usuário sem plano, o `AdminLayout` força o redirect para `/plans` (`AdminLayout.jsx:79`): **beco sem saída** | `Plans.jsx:173-184` | NN/g: *user control and freedom* | S1 |
| P2 | "Ir para o pagamento" no modo padrão (`invoice`) **não** vai ao pagamento; cria a fatura e manda para Configurações > Faturas, onde é preciso clicar "Pagar" | `:399-401` × `:117-122`, `:58` | NN/g: *match between system and real world*; Fogg *Ability*; Goal-gradient | S1 |
| P3 | Dois cards competem como foco: o trial (borda amarela, gradiente, badge, CTA preto) e o "Mais escolhido" (borda preta, CTA primário) | `:239-270`, `:277-285` | CCD attention ratio; Von Restorff; CXL: um único plano destacado | S2 |
| P4 | O plano "recomendado" é escolhido **pela posição** (índice do meio por preço), sem decisão de negócio; com 2 planos, não há recomendação | `:161` | Kolenda: *compromise effect* exige escolha intencional | S2 |
| P5 | Cards praticamente idênticos: o eyebrow "Plano Marketfy" é redundante, o ícone `CreditCard` se repete em todos e os 3 bullets genéricos são iguais ("PDV e gestão em um só lugar", "Suporte incluído", "Sem fidelidade"). O único diferencial são 3 números em caixas cinzas | `:288`, `:291-293`, `:316-320` | NN/g *explicit differences*; Refactoring UI: hierarquia | S2 |
| P6 | Preço semestral e anual mostrado como total ("/semestre", "/ano"), sem **equivalente mensal** nem **economia em R$**. A comparação com o mensal fica por conta do usuário | `:23-27`, `:299-304` | Kolenda: *price framing* e reference price; benchmark Bling ("Economize R$ 240/ano") | S2 |
| P7 | "Limite não incluído" quando o valor é 0. Para `max_terminals = 0`, o texto sugere que o plano não tem caixa | `:29-32` | Clareza | S2 |
| P8 | Sem tabela comparativa, FAQ ou garantias perto do preço (formas de pagamento, cancelamento, 7 dias, segurança) | página inteira | CXL: tratamento de objeções; NN/g: tabelas de comparação | S2 |
| P9 | Modal com jargão: "Fatura por período" × "Cobrança recorrente", sem dizer os meios (PIX, boleto, cartão) nem a diferença prática | `:371-393` | NN/g: linguagem do usuário; Hick's Law | S2 |
| P10 | CPF/CNPJ pedido de novo na recorrência, embora o CPF já tenha sido coletado no cadastro | `:395-397`, `:103-106` | Fogg *Ability* | S2 |
| P11 | Modal sem focus trap, sem `Esc` para fechar e sem fechar ao clicar no overlay | `:345-406` | WCAG 2.1 (2.1.2, 2.4.3) | S2 |
| P12 | O alerta "Seu plano expirou" usa o ícone `ShieldCheck` (sinal positivo) para uma mensagem negativa | `:187-192` | Semântica visual | S3 |
| P13 | "Melhor valor para manter sua operação ativa" é copy vaga e não quantifica nada | `:302-304` | CXL: *specificity* | S3 |
| P14 | O hero ("Venda mais com a operação sob controle.") serve a três públicos com dores diferentes: novo sem plano, trial expirado e upgrade. A mensagem é a mesma para os três | `:194-204` | Talia Wolf: contexto emocional por estágio; CCD Context | S2 |
| P15 | Rota `/plans` sem proteção: um visitante deslogado vê "usuário" e a contratação falha com 401 | `App.jsx:86`, `Plans.jsx:181` | Robustez | S2 |

### 3.4 Pontos de upgrade dentro do app

| # | Problema | Evidência | Sev. |
|---|---|---|---|
| U1 | Três telas de upgrade com CTAs para destinos diferentes: `PlanGuard` e `Financial` levam para `/dashboard/settings`, e banners e sidebar levam para `/plans` | `PlanGuard.jsx:67`, `Financial.jsx:158`, `AdminLayout.jsx:210-246` | S2 |
| U2 | Os paywalls citam "Marketfy PRO" e "plano Básico", nomes que podem não existir no catálogo real (planos vêm do admin) | `PlanGuard.jsx:60-64`, `Financial.jsx:153` | S1 |
| U3 | Bloqueio decidido **pelo nome do plano** (`includes('básico')`) no front (`AdminLayout.jsx:96`, `PlanGuard.jsx:36-43`), divergente do backend (`type`) | — | S1 |
| U4 | Alarmismo visual: banner vermelho com `animate-pulse`, ícone `animate-bounce`, "⛔ Plano Expirado", overlay "Acesso Bloqueado" em tela cheia. Gera ansiedade sem reforçar o que o usuário **perde** (vendas, histórico, fiado) | `AdminLayout.jsx:218-236`, `:355-376` | S2 |
| U5 | O paywall não mostra o valor da feature bloqueada (preview, blur dos dados reais, "você teria visto X") | `PlanGuard.jsx`, `Financial.jsx` | S2 |
| U6 | Não há régua de fim de trial dentro do app (D-7, D-3, D-1) com progresso de configuração (goal-gradient) | `AdminLayout.jsx:238-252` (só aviso ≤7 dias de vencimento) | S2 |

### 3.5 Créditos fiscais (`FiscalCredits.jsx`, `CreditPackageCard.jsx`)

| # | Problema | Evidência | Sev. |
|---|---|---|---|
| C1 | Dois preços por pacote ("Valor total" líquido e "Com taxas" bruto) sem dizer qual será cobrado | `CreditPackageCard.jsx:33-41` | S1 |
| C2 | Sem preço **por emissão**, então o benefício do pacote maior fica invisível | idem | S2 |
| C3 | "Mais popular" fixo no slug `pack_250`, sem dado que o sustente | `:10` | S2 |
| C4 | Textos sem acentuação ("emissoes", "Valido", "Nao expira no mes") em tela de pagamento | `:45-46`, `FiscalCredits.jsx:15-19` | S2 |
| C5 | O resumo não projeta o consumo ("no ritmo atual, seus créditos acabam em ~9 dias"), que é o gatilho natural de compra | `FiscalCredits.jsx:202-239` | S2 |

### 3.6 Transversal

- **Design system:** a paleta `brand` tem `yellow`, `green` e `dark`, mas as telas misturam `slate-900`, `gray-950`, `gray-900` e `brand-dark` como "preto da marca"; o primário alterna entre amarelo (`ui/Button`) e preto (landing e Plans). Não há escala tipográfica definida (uso livre de `text-[10px]` a `text-6xl`, `font-black` em quase todos os títulos).
- **Acessibilidade:** FAQ sem `aria-expanded` e `aria-controls` (`Home.jsx:597-610`), `max-h-40` corta respostas longas, logo clicável em `div` sem papel de botão (`:73`).
- **Performance e SEO:** landing em bundle SPA junto com o app, sem pré-renderização, imagens OG ou dados estruturados (`SoftwareApplication`, `FAQPage`).
- **Medição:** nenhum evento de funil nem UTM persistido no cadastro.

---

## 4. Princípios norteadores da refatoração

1. **Uma meta por página (CCD, attention ratio próximo de 1:1).** Na landing, a meta é iniciar o trial. Na tela de planos, contratar o plano recomendado. No paywall, fazer upgrade. Todo o resto tem hierarquia secundária.
2. **Clareza antes de persuasão (CXL).** Em 5 segundos o visitante precisa saber o que é, para quem é, o que ganha e o que fazer.
3. **B = MAP (Fogg).** Motivação vem da dor e do resultado emocional; Ability vem de remover campos, decisões e passos; o Prompt é o CTA certo no momento de maior motivação (hero, após prova, preço, fim de trial, feature bloqueada).
4. **Honestidade como tática de conversão.** Toda promessa precisa existir no produto e ser demonstrável. Prova social só real.
5. **Uma única fonte de verdade para preço, plano e features:** o backend. Landing, `/precos`, `/plans` e os paywalls consomem o mesmo contrato.
6. **Continuidade de mensagem (message match).** Anúncio → landing → cadastro → planos → checkout repetem a mesma promessa, o mesmo plano escolhido e o mesmo preço.
7. **Emoção por estágio (Talia Wolf).** Visitante: medo de fila parada e de multa, cansaço do caderninho. Trial: progresso e confiança. Expirado: *loss aversion* ("suas vendas e seu fiado estão salvos, reative para continuar").
8. **Hierarquia por contraste e de-ênfase, não por tamanho (Refactoring UI).**

---

## 5. Pesquisa antes do redesenho (Emotional Targeting + ResearchXL)

A copy e a hierarquia finais **não devem ser escritas antes desta etapa**. As propostas das Seções 6 e 7 são hipóteses iniciais.

**5.1 Pesquisa com clientes (1–2 semanas)**
- **Entrevistas** com 6–8 donos de mercado (clientes pagantes, trials que não converteram, perdidos para concorrentes). Roteiro: o que usavam antes; o que fez procurar um sistema agora; qual foi o pior dia sem sistema; o que quase os fez desistir; como descrevem o Marketfy para outro lojista (as palavras exatas viram copy).
- **Pesquisa no app** (1 pergunta, após a 10ª venda): "O que quase te impediu de começar a usar o Marketfy?"
- **Pesquisa de saída no trial** (D+1 após expirar sem converter): "Qual o principal motivo de não assinar?" com opções fechadas + campo aberto.
- **Mineração de reviews** de concorrentes (Reclame Aqui, Google Play do Kyte, reviews de Bling e Hiper): listar dores e medos recorrentes.

**5.2 Hipóteses emocionais para validar**

| Motivação | Dor, medo ou desejo | Como vira página |
|---|---|---|
| Não parar de vender | Fila parada, cliente indo embora, internet instável | Prova visual do PDV offline e demonstração em vídeo de 20 s |
| Não perder dinheiro | Fiado esquecido, estoque furado, quebra | Resultado quantificado **real** de clientes, só quando existir |
| Ficar em dia com o fisco | Medo de multa da SEFAZ, complexidade de NFC-e e A1 | "A gente te ajuda a configurar a NFC-e", com passo a passo |
| Sentir-se no controle ou profissional | Caderninho, "não sei se tenho lucro" | Dashboard real; linguagem de dono |
| Não se arrepender | Sistema caro, contrato, difícil de sair | Sem fidelidade, sem cartão, exportação dos dados, 7 dias |

**5.3 Análise quantitativa (ver Fase 0):** 2–4 semanas de linha de base do funil, mapas de calor e gravações (Microsoft Clarity é gratuito), além de 5 testes de usabilidade moderados (NN/g: 5 usuários encontram cerca de 85% dos problemas) nas tarefas "entender quanto custa para 2 caixas" e "começar o teste e fazer a primeira venda".

---

## 6. Arquitetura proposta

### 6.1 Landing (`/`) — estrutura seção a seção

Ordem baseada no *layer-cake scanning* (NN/g) e na sequência dor → solução → prova → oferta → objeções → CTA. O CTA primário se repete em pontos de alta motivação, com **um único rótulo**.

| # | Seção | Conteúdo proposto (hipótese) | Racional |
|---|---|---|---|
| 1 | **Header** enxuto | Logo · Funcionalidades · Preços (`/precos`) · Segmentos · `Entrar` (ghost) · **`Testar grátis por 14 dias`** (primário único) | Attention ratio; um rótulo de CTA em todo o site |
| 2 | **Hero** | **H1 de resultado:** "O caixa do seu mercado não para. Nem quando a internet cai." · **Sub:** "PDV, estoque, fiado e NFC-e em um só sistema, feito para mercadinhos, mercearias e padarias." · **CTA:** `Testar grátis por 14 dias` · **Microcopy de risco:** "Sem cartão de crédito · Sem fidelidade · Pronto em 5 minutos" · **Visual:** *screenshot ou vídeo real* do PDV vendendo (não mockup JSX) | CXL clarity; Fogg (motivação + ability + prompt no mesmo lugar); NN/g imagens reais |
| 3 | **Barra de credibilidade** (só com dados reais) | Nº real de lojas ou vendas processadas, selos (SEFAZ/NFC-e, pagamentos via Mercado Pago/Asaas), "Feito no Brasil". Se não houver números, usar selos e garantias em vez de números inventados | Credibility sem violar o CONAR |
| 4 | **Dores** (3 cards) | Manter a ideia atual (internet caiu, caderninho, estoque furado), reescrita com as palavras das entrevistas | Talia Wolf |
| 5 | **Como funciona em 3 passos** | 1. Crie sua conta (1 min) → 2. Cadastre produtos pelo código de barras → 3. Venda e emita NFC-e | Reduz a percepção de esforço (Fogg Ability); Goal-gradient |
| 6 | **Funcionalidades por resultado** | Blocos alternados (texto + print real) só com o que **existe**: PDV offline + sincronização; fiado com limite e extrato; NFC-e com créditos; estoque com histórico auditável; financeiro; perfis de acesso; PIX QR (Mercado Pago). Remover Curva ABC, Ticket Médio, importação e "app instalado" até existirem | Credibility; NN/g F-pattern |
| 7 | **Segmentos** | Chips com link para páginas de segmento (minimercado, mercearia, padaria, açougue, hortifrúti), mesma estrutura e hero/prints adaptados (Fase 5) | Relevância; benchmark Hiper |
| 8 | **Prova social real** | Depoimentos com nome completo, loja, cidade, foto e, se possível, vídeo curto; métrica só com autorização e evidência. **Enquanto não houver, a seção sai da página** | CONAR Anexo Q |
| 9 | **Resumo de preços** | 2–3 cards consumindo a **API pública**, mostrando o "a partir de" e o equivalente mensal, com link `Ver comparação completa` → `/precos`. Ou a mesma seção de preços de `/precos` como componente compartilhado | Fonte única; NN/g |
| 10 | **FAQ de objeções** | Custo da NFC-e e certificado A1; funciona no celular ou tablet?; o que acontece com meus dados se eu cancelar?; tem fidelidade?; formas de pagamento; posso trocar de plano?; preciso de internet?; suporte (canal e horário); 7 dias de arrependimento. Acordeão acessível + JSON-LD `FAQPage` | CXL: tratamento de objeções; SEO |
| 11 | **CTA final** | Reforça o resultado + mesmo CTA + microcopy de risco | Serial position effect (fim da página é lembrado) |
| 12 | **Footer legal** | Razão social, CNPJ, endereço, e-mail/WhatsApp de contato, Termos, Privacidade (páginas reais), status | Decreto 7.962/2013; LGPD; confiança |

**Diretrizes visuais da landing (Refactoring UI):**
- **Um** primário por viewport (amarelo `brand-yellow` com texto `brand-dark`). Secundário como link ou ghost.
- H1 sólido `brand-dark` (sem gradiente de baixo contraste); destaque com sublinhado ou marca-texto amarelo *atrás* do texto, se desejado.
- Escala tipográfica fixa (ver Seção 7) e largura de leitura de 60–75 caracteres no texto corrido.
- Remover blobs e animações inexistentes; manter no máximo uma microanimação útil (ex.: indicador "offline → sincronizado").
- Mobile first: CTA visível sem rolar em 375×667; *sticky CTA* inferior no mobile após rolar além do hero (Fitts's Law, alcance do polegar).

### 6.2 Cadastro (`/register`) — "trial por padrão"

**Objetivo:** do clique no CTA até a primeira venda no PDV no menor número de passos.

1. **Layout em duas colunas** (desktop): formulário à esquerda e, à direita, lembrete do que a pessoa ganha (3 bullets reais + 1 depoimento real + "Sem cartão · Sem fidelidade"). No mobile, só o formulário e os bullets colapsados. Mantém o *message match* com a landing.
2. **Campos:** nome, e-mail, senha (com "mostrar senha"). **CPF/CNPJ sai do cadastro** e passa a ser pedido quando for necessário (configurar NFC-e ou contratar). *Depende do backend:* hoje `User.cpf` é obrigatório (`domain/identity.py`); ver decisão D4. Se não for possível adiar, manter o campo com máscara, aceitando CPF **ou** CNPJ, com a microcopy "Usamos para emitir sua nota fiscal".
3. **Aceite de Termos e Privacidade** em texto abaixo do botão ("Ao criar a conta você concorda com…"), com links reais.
4. **Trial ativado automaticamente** no submit, sem modal de decisão. Eliminar o modal "Presente de boas-vindas" e o *confirmshaming*. Quem quiser contratar direto encontra "Ver planos" no app.
5. **Preservar a intenção:** `?plan=<id>&cycle=annual` vindo da landing ou de `/precos` é guardado. Após o cadastro, o trial começa e um banner discreto oferece "Você escolheu o plano X. Contratar agora com 10% de desconto no anual?"
6. **Pós-cadastro:** direto para o **onboarding de ativação** (checklist: cadastrar 1 produto → abrir caixa → primeira venda → configurar NFC-e), que substitui o `WelcomeModal` genérico. O Zeigarnik effect e o goal-gradient aumentam a ativação, que é o maior preditor de conversão do trial.
7. **Login:** remover a chamada a `/identity/plans`, unificar a marca (Marketfy), adicionar "Esqueci minha senha" se o backend suportar.

### 6.3 Preços e contratação

#### 6.3.1 Separar duas páginas com o mesmo componente

| Rota | Público | Diferenças |
|---|---|---|
| `/precos` (pública, pré-renderizável) | Visitante | CTA "Testar grátis por 14 dias" em todos os cards (leva ao cadastro com `?plan=`); plano de vendas com "Falar com vendas" |
| `/plans` (autenticada) | Trial, expirado, upgrade, sem plano | CTA "Assinar <Plano>"; indica o plano atual; header com Sair, Suporte e Voltar; hero muda conforme o estágio |

Ambas usam `<PricingTable>` e o mesmo hook `usePublicPlans()`.

#### 6.3.2 Hero por estágio (CCD Context + Talia Wolf)

| Estágio | Título | Subtítulo |
|---|---|---|
| Sem plano, nunca teve trial | "Comece grátis por 14 dias" | "Sem cartão. Escolha um plano só quando quiser." |
| Trial ativo (D-n) | "Faltam N dias do seu teste" | "Assine agora e continue vendendo sem interrupção. Tudo que você cadastrou continua aqui." |
| Expirado | "Suas vendas e seus clientes estão salvos" | "Reative seu plano para voltar a vender. Leva menos de 2 minutos." |
| Pagante (upgrade) | "Seu plano atual: X" | "Veja o que muda ao trocar de plano." |

#### 6.3.3 Seletor de ciclo

- Controle segmentado **Mensal | Anual**, com o Semestral opcional (ver D2; menos opções = Hick's Law). O selo de economia **em reais** ("Economize R$ 311/ano") vem sobre o Anual, que fica **pré-selecionado** se a estratégia for aumentar LTV e caixa; testar (E3).
- Preço exibido: **equivalente mensal em destaque** ("R$ 216/mês") + linha de suporte com o **total cobrado** ("R$ 2.599 cobrados anualmente"). Assim o total fica explícito (NN/g) e a referência comparável é mantida (Kolenda).
- Mensal: mostrar o preço cheio; opcionalmente, o anual riscado como âncora no toggle.

#### 6.3.4 Cards de plano (máximo 3 + Enterprise em linha)

Anatomia de cada card, de cima para baixo, com hierarquia por peso e cor:
1. **Nome** + **para quem** em 1 linha ("Para 1 loja com até 2 caixas").
2. **Preço** (equivalente mensal) + total do ciclo + economia.
3. **CTA** (acima dos bullets, para não depender de rolagem no mobile).
4. **3 diferenciais-chave em destaque**: lojas, caixas, NFC-e/mês. Os números vêm do backend; `0` ou `null` são tratados como "Ilimitado" ou "Não incluído" conforme a semântica definida em D3.
5. **"Tudo do plano anterior, mais:"** com as features que mudam (só as reais, vindas do backend).
6. Nada de bullets idênticos entre cards. O que é comum a todos vai para uma faixa **abaixo** dos cards: "Todos os planos incluem: PDV offline · Fiado · Estoque · Suporte · Sem fidelidade · Atualizações".

Destaque:
- **Um único plano destacado**, com a flag `is_recommended` definida no admin, não pela posição. Selo "Mais escolhido" só se for verdade; senão, "Recomendado para a maioria dos mercados".
- **Ordem:** do mais barato ao mais caro, com o recomendado no centro. Testar a ordem inversa (E4: CXL indica que o mais caro à esquerda pode elevar o ticket).
- **Trial** deixa de ser um card concorrente e vira uma **faixa acima dos cards** ("Ainda não testou? 14 dias grátis, sem cartão → Ativar"), só para usuários elegíveis. Em `/precos`, o trial é o próprio CTA dos cards.
- **Enterprise/Business:** faixa horizontal abaixo ("Rede com várias lojas? Fale com a gente") com CTA "Falar no WhatsApp" ou formulário curto. Nunca levar ao cadastro.

#### 6.3.5 Abaixo dos cards

1. **Tabela comparativa completa** (NN/g): colunas fixas com cabeçalho *sticky*, linhas agrupadas (Vendas, Estoque, Fiscal, Financeiro, Suporte), só diferenças relevantes em destaque, com opção "mostrar só diferenças". No mobile, um seletor de 2 planos lado a lado, sem scroll horizontal da página.
2. **Créditos NFC-e explicados**: quantas notas estão inclusas, quanto custa o extra (preço por emissão) e o que acontece quando acaba.
3. **Garantias**: pagamento via PIX, boleto ou cartão (logos), cancelamento a qualquer momento, 7 dias de arrependimento (CDC art. 49), dados exportáveis, LGPD.
4. **FAQ de cobrança** (6–8 perguntas).
5. **Contato**: "Dúvidas sobre qual plano escolher? Fale com a gente", com WhatsApp.

#### 6.3.6 Contratação: de modal com 2 decisões para checkout em 1 passo

- Trocar o modal por um **drawer ou página de checkout** `/plans/checkout?plan=&cycle=` (URL compartilhável e rastreável; botão voltar funciona).
- **Resumo do pedido fixo** (plano, ciclo, equivalente mensal, total, economia, próxima cobrança, "cancele quando quiser").
- **Forma de pagamento com linguagem do usuário**, e não do sistema:
  - "**Cartão de crédito**: renova automaticamente, você não precisa lembrar" (= `recurring`)
  - "**PIX ou boleto**: você recebe a cobrança a cada período" (= `invoice`)
  - O padrão deve seguir a decisão D5 (recorrência tende a reduzir churn involuntário).
- **CPF/CNPJ pré-preenchido** com o dado do cadastro, editável.
- **O CTA diz o que acontece:** "Pagar R$ 2.599 com cartão" / "Gerar PIX de R$ 2.599". **No modo fatura, abrir o checkout direto** (ou exibir o QR PIX na própria tela) em vez de mandar para Configurações > Faturas. *Depende do backend:* hoje o checkout é gerado por job assíncrono (`fix: poll pending invoice checkout job`); a tela deve fazer polling com estado "Gerando sua cobrança…" (Doherty threshold: feedback < 400 ms, com skeleton).
- **Retorno do pagamento:** tela de sucesso (peak-end rule) com "Plano X ativo até dd/mm" + próximo passo, e não um toast.
- Acessibilidade: focus trap, `Esc`, `aria-describedby` no resumo, erros inline.

### 6.4 Upgrade dentro do app

1. **Componente único `<Paywall feature="finance">`**, dirigido por `subscription.features` (fonte do backend). Remover a lógica por nome de plano (`AdminLayout.jsx:96`, `PlanGuard.jsx:36-43`).
2. **Paywall com preview**: renderizar a tela real com dados de exemplo desfocados + card "Veja seu lucro real do mês. Disponível no plano X por R$ Y/mês" + CTA → `/plans/checkout?plan=X`. Todos os CTAs de upgrade vão para o mesmo lugar.
3. **Nomes de planos sempre vindos da API** (sem "Marketfy PRO" ou "Básico" fixos no código).
4. **Régua de trial dentro do app** (substitui os banners pulsantes):
   - D-14 a D-8: checklist de ativação com barra de progresso na sidebar.
   - D-7 a D-4: banner neutro "Seu teste termina em N dias · Ver planos".
   - D-3 a D-1: banner âmbar com resumo do valor gerado ("Você registrou 312 vendas e R$ 18.430 com o Marketfy") + CTA. É *loss aversion* com dados reais do usuário.
   - Expirado: tela cheia calma, sem animação, com "Seus dados estão salvos" e CTA de reativação, mantendo o acesso a Configurações, Suporte e **exportação dos dados** (confiança).
5. **Sem `animate-pulse` ou `animate-bounce` em alertas** (no máximo um ícone estático; respeitar `prefers-reduced-motion`).
6. **Limites como gatilho de upgrade**: ao atingir `max_terminals` ou `max_markets`, mostrar um modal contextual "Seu plano permite 2 caixas. Para abrir o 3º, mude para o plano X (+R$ N/mês)".

### 6.5 Créditos fiscais

- **Um preço por pacote** (o que será cobrado). Se houver taxa, mostrar "inclui taxas de pagamento" ou discriminar no resumo do checkout, não em dois números concorrentes no card.
- **Preço por emissão** em cada card ("R$ 0,19 por nota") e economia relativa ao menor pacote.
- "Mais popular" só com base em dados (flag do backend ou pacote mais vendido nos últimos 90 dias).
- **Projeção de consumo** no resumo ("No ritmo atual, suas notas acabam em ~9 dias") + CTA contextual; alerta proativo na sidebar e no PDV quando restar menos de 15%.
- Revisar toda a acentuação (`FiscalCredits.jsx`, `CreditPackageCard.jsx`, `PurchaseConfirmModal.jsx`, `lib/api.js:getApiErrorMessage`).

---

## 7. Design system mínimo para as áreas de conversão (Refactoring UI)

| Token | Proposta |
|---|---|
| **Cores semânticas** | `primary` = `brand-yellow` (fundo de CTA) com `on-primary` = `brand-dark`; `ink` = `brand-dark` (um só "preto"; eliminar a mistura `slate-900`/`gray-950`/`gray-900`); `success` = `brand-green`; `warning` = amber-500; `danger` = red-600; `muted` = gray-500 (texto secundário com contraste ≥ 4.5:1 sobre branco) |
| **Escala tipográfica** | 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 (desktop hero) · 36 (mobile hero). Pesos: 400 texto, 600 labels, 800 títulos (`font-black` só no H1 e em preços) |
| **Espaçamento** | Base 4 px; seções com 96 px desktop / 64 px mobile; cards com 24 px de padding |
| **Raio e sombra** | `rounded-xl` para cards, `rounded-lg` para botões; 3 níveis de elevação (sm/md/lg), com sombra forte só no card recomendado e em modais |
| **Botões** | Um `Button` (`components/ui/Button.jsx`) com as variantes `primary`, `secondary`, `ghost`, `link`, os tamanhos `sm/md/lg` e `asChild` ou `as={Link}` (acabar com `<Link><Button/></Link>`, que é HTML inválido e cria dois alvos de foco). Remover a cópia local em `Home.jsx` |
| **Movimento** | 150–200 ms ease-out; nenhuma animação infinita em conteúdo; `motion-safe:` em tudo |
| **Fonte** | `Inter` está no config mas não é carregada (`index.html` sem link), então hoje cai no system-ui. Decidir: carregar Inter via `@fontsource/inter` com `font-display: swap` ou assumir system-ui |

**Componentes novos** (sugestão de pasta `src/features/marketing/` e `src/features/billing/`):
`MarketingHeader`, `Hero`, `LogoBar`, `FeatureBlock`, `StepList`, `Testimonial`, `FaqAccordion` (acessível), `CtaBand`, `LegalFooter`, `PricingTable`, `PlanCard`, `BillingCycleToggle`, `PlanComparisonTable`, `TrustBadges`, `CheckoutSummary`, `PaymentMethodSelector`, `Paywall`, `TrialProgress`, `UsageForecast`.

---

## 8. Mudanças técnicas e de dados

### 8.1 Contrato de planos (backend)

`GET /identity/plans` já é **público** (`routers/identity.py:65`) e pode alimentar a landing. Faltam campos de *apresentação* e *features por plano*:

| Campo novo | Uso |
|---|---|
| `slug` | URL e `?plan=` legíveis |
| `description` / `tagline` | "Para quem é" (o front já tenta ler `plan.description`, que não existe no domínio) |
| `display_order` | Ordem controlada pelo admin |
| `is_recommended` + `badge_label` | Destaque intencional |
| `is_public` | Separar planos vendáveis de cortesia e legado (hoje filtrado por `type === 'pago'`) |
| `features: string[]` ou `feature_flags: {finance: bool, …}` | Diferenciação real por plano. **Hoje o backend concede finance/reports/fiscal a todo `pago`**: decidir se isso vai mudar (D1) |
| `highlights: [{label, value}]` | Diferenciais-chave do card |
| `sales_contact_only: bool` | Plano Enterprise sem preço |
| (derivado) `monthly_equivalent_180`, `monthly_equivalent_annual`, `savings_annual` | Evitar arredondamento divergente no front (ou calcular num único util compartilhado) |

Também: expor `fiscal_monthly_limit` nos DTOs de admin (`PlanCreateDTO`/`PlanUpdateDTO` não o incluem) e adicionar os novos campos em `PlansManagement.jsx`.

### 8.2 Frontend

- **`usePublicPlans()`**: busca, filtra `is_public`, ordena por `display_order`, calcula equivalentes. Usado por Home, `/precos`, `/plans` e `Paywall`.
- **Utilitário único `pricing.js`**: `monthlyEquivalent`, `savings`, `formatPlanLimit(value, kind)` com semântica definida para `0`/`null`. Testes unitários obrigatórios.
- **Rotas:** `/precos` (pública), `/plans` (protegida por `ProtectedRoute`), `/plans/checkout` (protegida), `/termos`, `/privacidade`, `/segmentos/:slug` (Fase 5).
- **Pré-renderização da landing e de `/precos`** (ex.: `vite-plugin-ssg`/`vite-react-ssg` ou páginas estáticas separadas) + meta tags, OG image, favicon próprio e JSON-LD. Separar o bundle de marketing do bundle do app (lazy import de `Home`).
- **Persistência de UTM e intenção** (`utm_*`, `plan`, `cycle`) em `sessionStorage` → enviados no `POST /identity/register` para atribuição.
- **Remover:** a chamada a `/identity/plans` no login, as classes de animação inexistentes, o `Button` local e o modal de trial do cadastro.

### 8.3 Instrumentação (pré-requisito de tudo)

Ferramentas sugeridas: **PostHog** (funis, feature flags para A/B, gravações; plano gratuito) ou GA4 + Microsoft Clarity. Consentimento LGPD para cookies não essenciais.

| Evento | Propriedades |
|---|---|
| `landing_viewed` | `utm_*`, `device`, `variant` |
| `cta_clicked` | `location` (header/hero/pricing/final/sticky), `label` |
| `pricing_viewed` | `page` (`/precos` \| `/plans`), `stage` (visitor/no_plan/trial/expired/paid) |
| `billing_cycle_changed` | `from`, `to` |
| `plan_selected` | `plan_slug`, `cycle`, `position`, `is_recommended` |
| `signup_started` / `signup_completed` / `signup_failed` | `field_errors`, `plan_intent` |
| `trial_activated` | `source` |
| `activation_step_completed` | `step` (product/cash_open/first_sale/nfce_setup) |
| `checkout_started` / `payment_method_selected` / `checkout_redirected` / `payment_confirmed` | `plan_slug`, `cycle`, `method`, `amount` |
| `paywall_viewed` / `paywall_cta_clicked` | `feature` |
| `credits_pack_selected` / `credits_purchased` | `pack`, `qty`, `amount` |

**KPIs de funil:** visitante → cadastro; cadastro → ativação (1ª venda em até 48 h); trial → pago; ARPA e mix de ciclo (anual %); tempo até a 1ª venda; conversão do paywall; receita de créditos por conta.

---

## 9. Backlog de experimentos (priorizado por PXL)

Com tráfego baixo, A/B com significância pode levar meses. Nesse caso: (1) aplicar as correções de S1 **sem teste** (são defeitos, não hipóteses); (2) validar mudanças maiores com testes de usabilidade e comparação antes e depois por coorte; (3) usar A/B só onde houver volume (ex.: página de preços com ≥ ~1.000 visitas por variante, com a amostra calculada antes).

| ID | Hipótese | Métrica primária | PXL (0–10) |
|---|---|---|---|
| E1 | Ativar o trial automaticamente no cadastro (sem modal) aumenta cadastro → ativação | % 1ª venda em 48 h | 9 |
| E2 | Checkout PIX/cartão direto (sem desvio para Faturas) aumenta início → pagamento | % `payment_confirmed` | 9 |
| E3 | Anual pré-selecionado com economia em R$ aumenta o mix anual sem reduzir a conversão total | receita/visita em `/plans` | 7 |
| E4 | Ordem dos planos: do mais caro ao mais barato × do mais barato ao mais caro | ARPA | 5 |
| E5 | Hero com H1 de resultado × H1 de feature ("offline") | visitante → cadastro | 7 |
| E6 | Vídeo de 20 s do PDV × screenshot estático no hero | visitante → cadastro | 5 |
| E7 | Paywall com preview desfocado × tela de bloqueio | cliques no CTA de upgrade | 6 |
| E8 | Banner D-3 com "valor gerado" × aviso genérico | trial → pago | 8 |
| E9 | Sticky CTA mobile | CTA clicks mobile | 5 |
| E10 | Remover o CPF do cadastro (se o backend permitir) | signup completion | 8 |

---

## 10. Roadmap de execução

Cada fase termina com lint, testes e build verdes e, a partir da Fase 1, uma leitura de métricas contra a linha de base.

### Fase 0 — Fundação e honestidade (1 semana) · *sem redesenho*
1. Instrumentar os eventos da Seção 8.3 nas telas atuais e coletar a linha de base por 2–4 semanas em paralelo às fases seguintes.
2. **Corrigir promessas falsas** na landing, no cadastro e no `WelcomeModal`: remover "app instalado", "importação", "Curva ABC/Ticket Médio", "NFC-e ilimitada", depoimentos e números sem lastro, e a "Oferta de lançamento" sem prazo.
3. Mostrar o `WelcomeModal` só para trial ativo.
4. Footer legal (CNPJ, endereço, contato), páginas de Termos e Privacidade, aceite no cadastro.
5. Header de `/plans` com Sair, Suporte e Voltar; proteger a rota `/plans`.
6. Unificar a marca (Marketfy) em login, título e favicon; meta description e OG.

**Critérios de aceite:** nenhuma afirmação na landing sem correspondência verificável no produto (checklist revisado por produto); eventos visíveis no painel; usuário sem plano consegue sair de `/plans`.
**Testes:** atualizar `plans.test.jsx` (header com logout); novo `home.test.jsx` (não renderiza termos proibidos da lista de claims removidos; links do footer não são `#`).

### Fase 1 — Fonte única de preço e funil curto (1–2 semanas)
1. Backend: campos da Seção 8.1 (`slug`, `display_order`, `is_recommended`, `is_public`, `description`, `highlights`, `sales_contact_only`) + admin.
2. `usePublicPlans()` + `pricing.js` com testes unitários (equivalentes, economia, limites 0/null).
3. Landing passa a consumir a API na seção de preços (remover preços fixos no código e desconto calculado no front).
4. Trial automático no cadastro; remover o modal e o *confirmshaming*; preservar `?plan=&cycle=`.
5. Paywalls usando `subscription.features`; remover a lógica por nome de plano; todos os CTAs de upgrade → `/plans`.

**Aceite:** o preço exibido na landing é igual ao de `/plans` para qualquer plano e ciclo (teste de contrato); o cadastro leva ao dashboard com trial ativo em 1 submit.
**Testes:** `pricing.test.js`, `usePublicPlans.test.jsx`, `register.test.jsx` (trial chamado no submit; sem modal), `planGuard.test.jsx` (depende de `features`, não do nome).

### Fase 2 — Nova tela de planos e checkout (2 semanas)
1. `PricingTable`, `PlanCard`, `BillingCycleToggle` (equivalente mensal + total + economia em R$), faixa "todos os planos incluem", faixa de trial, faixa Enterprise.
2. Hero por estágio (Seção 6.3.2).
3. `PlanComparisonTable` responsiva, `TrustBadges`, FAQ de cobrança.
4. `/plans/checkout`: resumo, meios de pagamento em linguagem do usuário, documento pré-preenchido, **fatura abre o checkout ou PIX direto** com polling do job, tela de sucesso.
5. `/precos` pública reutilizando os componentes.

**Aceite:** do clique em "Assinar" ao checkout externo em ≤ 2 interações; nenhum redirecionamento para Configurações no fluxo de contratação; teclado e leitor de tela completam o fluxo (focus trap, `Esc`, rótulos).
**Testes:** reescrever `plans.test.jsx` (1 plano destacado via `is_recommended`; economia em R$ correta; trial só para elegíveis); `checkout.test.jsx` (invoice → abre checkout; recurring → documento pré-preenchido; erro do job exibido).

### Fase 3 — Landing redesenhada (2–3 semanas, após a pesquisa da Seção 5)
1. Consolidar os insights das entrevistas e pesquisas → mensagem principal, 3 dores, vocabulário.
2. Componentes de marketing (Seção 7) e nova estrutura (Seção 6.1), com prints e vídeo reais do produto.
3. Pré-renderização, JSON-LD (`SoftwareApplication`, `FAQPage`), OG image, Lighthouse ≥ 90 em Performance, Acessibilidade e SEO no mobile.
4. Sticky CTA mobile; `prefers-reduced-motion`.
5. Teste de 5 segundos e testes de usabilidade (5 usuários) antes de publicar.

**Aceite:** em teste de 5 segundos, ≥ 80% dos participantes dizem corretamente o que é e para quem é; LCP < 2,5 s em 4G; contraste AA em todo texto.

### Fase 4 — Upgrade dentro do app e créditos (1–2 semanas)
1. `<Paywall>` com preview desfocado; modal de limite atingido (caixas/lojas).
2. Régua de trial (checklist de ativação, banners D-7/D-3 com valor gerado, tela de expirado calma com exportação de dados).
3. Remover animações de alarme dos banners.
4. Créditos: preço único, preço por emissão, "mais popular" por dado, projeção de consumo, acentuação.

**Aceite:** nenhum `animate-pulse`/`animate-bounce` em alertas de billing; o card de crédito mostra 1 preço cobrado + preço unitário.
**Testes:** `paywall.test.jsx`, `trialProgress.test.jsx`, atualizar `fiscalCredits.test.jsx`.

### Fase 5 — Otimização contínua
- Rodar o backlog da Seção 9 conforme volume; páginas por segmento; estudo de caso real com cliente (texto + vídeo); revisão trimestral da página de preços com dados de mix e churn.

---

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Remover claims e depoimentos reduz a conversão no curto prazo | Substituir por garantias (sem cartão, sem fidelidade, dados exportáveis) e acelerar a coleta de depoimentos reais (Fase 0: pedir a clientes atuais) |
| Trial automático aumenta cadastros de baixa qualidade | Medir ativação, não só cadastro; checklist de onboarding |
| Checkout direto depende do job assíncrono de fatura | Polling com timeout e fallback "enviamos a cobrança para seu e-mail" + link para Faturas |
| Mudar a regra de features por plano afeta clientes atuais | Grandfathering por `plan_id` legado; comunicar antes |
| Pré-renderização adiciona complexidade ao build na Vercel | Começar com HTML estático só para `/` e `/precos` |

---

## 12. Decisões em aberto (precisam de resposta antes da Fase 1)

- **D1 — Diferenciação dos planos:** a diferença entre os planos pagos deve ser **só de limites** (lojas, caixas, NFC-e), como no backend hoje, ou também de **features** (ex.: financeiro só no plano intermediário), como a landing promete? Isso define o contrato da Seção 8.1 e toda a copy dos cards.
- **D2 — Ciclos:** manter o Semestral ou simplificar para Mensal | Anual?
- **D3 — Semântica de limites:** `0`/`null` em `max_terminals`, `max_markets` e `fiscal_monthly_limit` significa "ilimitado" ou "não incluído"?
- **D4 — CPF no cadastro:** o backend pode tornar `cpf` opcional até a contratação ou a configuração fiscal?
- **D5 — Meio de pagamento padrão:** priorizar cartão recorrente (menos churn involuntário) ou PIX/boleto por fatura (preferência do pequeno varejo)?
- **D6 — Plano Business/Enterprise:** existe de fato? Qual canal (WhatsApp, formulário, agenda)?
- **D7 — Trial:** 14 dias e 50 NFC-e são a oferta definitiva? Trial com acesso a qual plano?
- **D8 — Prova social:** há clientes dispostos a dar depoimento com nome e foto? Há números reais publicáveis (lojas ativas, vendas processadas)?
- **D9 — Ferramenta de analytics:** PostHog, GA4 + Clarity ou outra?

---

## 13. Referências

- Unbounce — *The 7 Principles of Conversion-Centered Design* (Oli Gardner): https://unbounce.com/conversion-centered-design/
- CXL — *10 Principles of Effective Pricing Pages*: https://cxl.com/blog/10-principles-of-effective-pricing-pages/
- CXL — *8 Keys to Value-Based SaaS Pricing Pages*: https://cxl.com/blog/saas-pricing-pages/
- CXL — *How to Design Mobile SaaS Pricing Pages*: https://cxl.com/blog/mobile-saas-pricing-pages/
- CXL — *How To Use Emotional Targeting To Drive Conversions*: https://cxl.com/blog/emotional-targeting/
- GetUplift — *The Emotional Targeting Framework* (Talia Wolf): https://getuplift.co/the-emotional-targeting-framework/
- Nick Kolenda — *Psychology of Pricing* (guia): https://www.nickkolenda.com/psychological-pricing-strategies/ · resumo das técnicas: https://carouselinsights.com/nick-kolendas-list-of-pricing-psychology-techniques/
- Laws of UX (Jon Yablonski): https://lawsofux.com/
- Fogg Behavior Model: https://behaviormodel.org/
- NN/g — *Explicitly State the Difference Between Options*: https://www.nngroup.com/articles/explicit-differences/
- NN/g — *3 Rules for Better Comparison Tables*: https://www.nngroup.com/videos/ux-rules-comparison-tables/
- NN/g — *B2B Website Usability* (capítulo sobre preços): https://www.nngroup.com/reports/topic/b2b-websites/
- Refactoring UI (Adam Wathan & Steve Schoger): https://www.refactoringui.com/
- Mobbin (padrões de pricing e onboarding): https://mobbin.com/
- Benchmark — Bling, planos e preços: https://www.bling.com.br/planos-e-precos
- Benchmark — Hiper: https://www.hiper.com.br/
- Decreto nº 7.962/2013 (comércio eletrônico): https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- CDC, Lei nº 8.078/1990 (arts. 30, 37, 49): https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- CONAR — Código Brasileiro de Autorregulamentação Publicitária (Anexo Q, testemunhais): http://www.conar.org.br/
