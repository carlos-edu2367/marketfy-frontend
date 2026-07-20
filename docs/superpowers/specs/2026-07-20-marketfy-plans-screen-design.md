# Tela de planos do Marketfy — Especificação de design

## Objetivo

Aumentar a clareza e a conversão da tela autenticada de planos do Marketfy, deixando explícitos preço, período, emissões fiscais incluídas e limitações de cada plano, sem alterar API, banco ou o fluxo de contratação existente.

## Decisões de produto

- O teste grátis será renderizado somente quando `user?.plan_id` não existir. Essa decisão segue a regra atual do backend, que impede ativar o trial depois que o usuário possui histórico de plano.
- A tela continuará consumindo `GET /identity/plans` e `GET /auth/me` sem novos campos ou endpoints.
- Os limites exibidos serão os campos já disponíveis em cada plano: `max_markets`, `max_terminals` e `fiscal_monthly_limit`.
- Planos ativos do tipo `pago` continuam sendo os únicos planos pagos exibidos na vitrine; planos `cortesia` e `trial` permanecem fora da lista paga.

## Direção visual e conteúdo

- Usar uma composição centralizada, com largura máxima menor e espaçamento vertical consistente.
- Reescrever o hero para comunicar resultado de negócio e reduzir ambiguidade sobre a contratação.
- Manter o seletor mensal/semestral/anual, mas mostrar economia e período de forma mais compreensível.
- Alinhar os cards em uma grade responsiva com altura visual consistente.
- Destacar o plano recomendado quando houver mais de um plano pago, sem inventar dados de produto no backend.
- Em cada card, mostrar preço, lojas, caixas/terminais, emissões fiscais mensais, recursos e limitações.
- Usar CTAs específicos: trial para começar e planos pagos para contratar/selecionar.
- Preservar a forma de cobrança e o modal atual, refinando hierarquia e resumo do pedido.

## Comportamento

- Usuários com `plan_id` não verão o card nem o CTA do teste grátis.
- Usuários sem `plan_id` verão o trial antes dos planos pagos.
- A troca de período atualiza todos os preços e o resumo do modal.
- Valores fiscais nulos, zero ou ausentes devem aparecer como “Não incluído” ou “Consulte”, sem quebrar o layout.
- O botão de contratação continua chamando `subscribePlan` com o payload existente.

## Acessibilidade e responsividade

- Botões e controles de período devem ter rótulos visíveis e estados selecionados claros.
- O modal deve manter botão de fechar acessível e foco funcional nos campos existentes.
- Cards devem empilhar em telas pequenas e manter leitura sem depender de hover.
- Contraste deve permanecer adequado para textos, badges e estados desabilitados.

## Validação

- Testar que o card de trial não aparece quando o usuário possui `plan_id`.
- Testar que o card de trial aparece quando o usuário não possui plano.
- Testar que `fiscal_monthly_limit`, lojas e terminais são exibidos nos cards.
- Rodar a suíte frontend, lint e build.
