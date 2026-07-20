# PDV: seleção de cliente fiado e edição de limite

## Objetivo

Melhorar a seleção de cliente para vendas fiadas no PDV e permitir que gestores ajustem o limite de crédito de um cliente já cadastrado, sem alterar o fluxo fiscal.

## Escopo e isolamento

- O trabalho usa os ramos `feature/pdv-customer-credit`, criados diretamente de `origin/main`, um em cada repositório.
- Nenhum arquivo ou commit do worktree `fiscal-product-tax-rules` será modificado, incorporado ou enviado.
- A alteração de limite será suportada por uma rota pequena no backend e pela gestão de clientes no frontend.

## Fluxo de seleção no PDV

1. Ao escolher a forma de pagamento **Fiado**, o `PaymentModal` abre imediatamente um novo `CustomerSelectorModal`.
2. O seletor carrega os clientes da loja a partir do Dexie, preservando o funcionamento offline, e exibe a lista em área rolável.
3. A busca é feita somente por nome ou CPF, sem truncar os resultados a cinco itens. A lista inicial é ordenada pelo nome.
4. Cada resultado apresenta nome, CPF, limite, dívida e crédito disponível. Crédito disponível é `max(0, limite - dívida)`.
5. Ao selecionar um cliente, o modal é fechado e o resumo de crédito permanece no `PaymentModal`.
6. Ao fechar o seletor sem escolher, a venda continua em Fiado, mas o painel passa a oferecer a ação explícita **Selecionar cliente** para abrir o seletor novamente. Não será possível adicionar esse pagamento sem cliente.
7. A validação do pagamento continua no cliente e no domínio do backend: qualquer valor maior que o crédito disponível é recusado.

## Edição de limite na gestão de clientes

1. Cada linha de cliente terá a ação **Editar limite**.
2. A ação abre um modal próprio com nome do cliente, limite atual e campo monetário para o novo limite.
3. Valores negativos são inválidos. Reduzir o limite abaixo da dívida atual é permitido.
4. Nesse caso, o modal informa que o crédito disponível ficará em R$ 0,00 e novas vendas fiadas serão bloqueadas até que a dívida fique abaixo do limite novamente.
5. Após salvar, a lista recarrega do servidor e o registro correspondente no Dexie é atualizado, para que o PDV reflita o novo limite mesmo offline.

## Contrato de backend

- Novo DTO `CustomerCreditLimitUpdateDTO` com `credit_limit` decimal obrigatório e maior ou igual a zero.
- Nova rota `PATCH /finance/{market_id}/customers/{customer_id}` com permissão `FINANCE_WRITE`.
- Novo método de serviço localiza o cliente, confirma que pertence à loja, atualiza apenas `credit_limit`, atualiza o timestamp e o persiste.
- A rota retorna `CustomerResponseDTO` com o limite e a dívida atuais.
- Não será criada movimentação no ledger: alterar limite não altera dívida nem registra pagamento.
- A regra existente no domínio (`current_debt + venda > credit_limit`) mantém o bloqueio de novas vendas quando a dívida já supera o novo limite.

## Componentes e dados

- `CustomerSelectorModal`: componente independente e testável, responsável por carregar, filtrar e devolver o cliente selecionado.
- `PaymentModal`: controla a abertura do seletor e usa crédito disponível nunca negativo na apresentação e na validação.
- `Customers`: controla o modal de edição, chama o endpoint PATCH, atualiza lista e cache local.
- O backend fica limitado a DTO, serviço e rota de atualização de limite.

## Acessibilidade e estados de erro

- Os dois modais terão título, botão de fechar e campos rotulados.
- O seletor trata carregamento, ausência de clientes e ausência de resultados.
- Falhas na carga de clientes, na atualização de limite ou no cache local exibem feedback pelo mecanismo de toast já usado no projeto.
- O estado de salvamento impede duplo envio e mantém o modal aberto em caso de erro.

## Testes e verificação

### Frontend

- O seletor lista todos os clientes da loja e filtra por nome e CPF.
- Selecionar um cliente fecha o seletor e o associa ao pagamento fiado.
- Cliente acima do limite apresenta crédito disponível zerado e não permite adicionar pagamento fiado.
- A edição de limite envia o PATCH, atualiza a lista e atualiza o Dexie.

### Backend

- O serviço permite limite abaixo da dívida sem alterar a dívida.
- O serviço rejeita cliente inexistente, cliente de outra loja e limite negativo.
- A rota exige permissão de escrita e retorna o cliente atualizado.

### Linha de base

- Frontend: `npm test` passou com 5 arquivos e 24 testes.
- Backend: a execução de testes está pendente porque o ambiente isolado ainda não concluiu a instalação de `pytest` e das dependências declaradas. Isso precisa ser resolvido antes da implementação do backend.
