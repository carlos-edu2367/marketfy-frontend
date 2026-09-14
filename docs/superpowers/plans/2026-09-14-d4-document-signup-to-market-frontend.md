# D4 — Documento fiscal migra do cadastro para a loja (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o campo CPF do cadastro (`Register.jsx`), aceitar CPF ou CNPJ na criação da loja (`Dashboard.jsx`) com máscara progressiva, e corrigir o rótulo do documento no cupom fiscal (`Receipt.jsx`) para refletir o que está realmente armazenado.

**Architecture:** Reaproveita o padrão já existente de `maskCpf`/`onlyDigits` em `lib/documentMask.js`, adicionando `maskCnpj` e `maskDocument` (dispatch por tamanho). `Register.jsx` perde um campo; `Dashboard.jsx` ganha validação de dois formatos no mesmo campo; `Receipt.jsx` troca um rótulo fixo por um condicional.

**Tech Stack:** React 18, react-hook-form + zod, Vitest + Testing Library + user-event. Testes em `src/test/*.test.jsx` (diretório plano, não colocalizado com o componente — convenção já usada em todo o repo).

**Spec:** `backend/docs/superpowers/specs/2026-09-14-document-signup-to-market-design.md` (repo principal). Plano irmão do backend: `backend/docs/superpowers/plans/2026-09-14-d4-document-signup-to-market-backend.md` — o backend já aceita CPF opcional no cadastro e CPF/CNPJ na loja de forma retrocompatível, então este plano pode rodar antes ou depois do deploy do backend sem quebrar nada (o backend antigo ainda aceitava CNPJ de 14 dígitos, que é o que o formulário atual já envia).

## Global Constraints

- Testes usam `vi.mock('../lib/api', ...)` e `vi.mock('../hooks/useAuth', ...)` — nunca chamada de rede real.
- Nenhuma mudança em `components/pdv/Receipt.jsx:304` (`issuer.cnpj`, do payload de DANFE fiscal) — é um objeto diferente (`FiscalTenantConfig`), fora de escopo.
- Mensagens de erro de formulário em português, mesmo tom das existentes (ex.: `'CPF deve ter 11 números'`).
- Commits terminam com `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## Evidência levantada relendo o código em 2026-09-14

| Achado | Evidência |
|---|---|
| `Register.jsx` hoje tem um campo CPF completo (schema zod, máscara, input, texto de ajuda) | `src/pages/auth/Register.jsx:12,17,33,47,107-121` — usa `maskCpf`/`onlyDigits` de `lib/documentMask.js`, campo `cpfField` com `onChange` customizado. |
| `Dashboard.jsx` (form de criar loja) hoje só valida tamanho mínimo, sem máscara nenhuma | `src/pages/dashboard/Dashboard.jsx:14-18` (`document: z.string().min(14, 'CNPJ inválido')`) e `:153-158` (`<Input label="CNPJ" ... {...register('document')} />` — sem `onChange` customizado, diferente do padrão já usado em `Register.jsx`). |
| `documentMask.js` só tem `onlyDigits` e `maskCpf` | Arquivo inteiro lido — `maskCnpj`/`maskDocument` não existem ainda. |
| `Receipt.jsx:124` já lê `marketInfo.document` como string simples | `` `if (marketInfo?.document) { centerText(\`CNPJ: ${marketInfo.document}\`, y); ... }` `` dentro de `export const generateReceipt = (sale, marketInfo) => {...}` (linha 65), função síncrona e já exportada — usada pelos testes via `doc.text.mock.calls`. |
| **Achado extra (não estava no spec):** hoje esse rótulo provavelmente já está quebrado (`[object Object]`) | Confirmado por investigação: o backend atual serializa `Market.document` (tipo `CNPJ`, um dataclass) como `{"value": "..."}` em `GET/POST /identity/markets` (sem `response_model`, `dataclasses.asdict` recursivo). Nenhum arquivo do frontend faz `.document.value` — nem `Pdv.jsx`, nem `SalesHistory.jsx` (as duas origens de `marketInfo` passado pro `Receipt`), nem `useProductSync.js`, nem `lib/db.js` (que não tem tabela de mercados). Ou seja, hoje `CNPJ: ${marketInfo.document}` provavelmente imprime `CNPJ: [object Object]` em produção. A Task 2 do plano do backend (`Market.document` vira `str`) corrige isso de graça — o cupom já vai chegar aqui recebendo uma string simples, sem trabalho extra neste plano além de trocar o rótulo fixo pelo condicional. |
| `PlanCard.jsx` não faz parte do escopo de D4 | Confirmado — nenhuma menção a documento em `PlanCard.jsx`; será tocado só no plano de D9 (analytics), não aqui. |
| Nenhum teste hoje cobre `Dashboard.jsx` (form de criar loja) | `find src -iname "*.test.*"` não retornou nenhum `dashboard*.test.jsx` — este plano cria o primeiro. |

## Ordem de execução e deploy

1. Tasks 1 → 4 em sequência, um PR (branch única, TDD, commit por task).
2. Rodar `npx vitest run` completo ao final de cada task.
3. Auto-deploy Vercel no push pra `main` — pode ir a qualquer momento em relação ao backend (compatibilidade nos dois sentidos, ver header do plano).

---

### Task 1: `documentMask.js` — `maskCnpj` e `maskDocument`

**Files:**
- Modify: `src/lib/documentMask.js`
- Modify: `src/test/documentMask.test.js` (arquivo existente — estender)

**Interfaces:**
- Consumes: `onlyDigits` (já existe no mesmo arquivo).
- Produces: `maskCnpj(value): string`, `maskDocument(value): string` — consumidos pela Task 3 (`Dashboard.jsx`).

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/test/documentMask.test.js`:

```javascript
import { maskCnpj, maskDocument } from '../lib/documentMask';

describe('maskCnpj', () => {
  it.each([
    ['', ''],
    ['12', '12'],
    ['123456', '12.345.6'],
    ['123456789', '12.345.678.9'],
    ['12345678000195', '12.345.678/0001-95'],
    ['12.345.678/0001-95999', '12.345.678/0001-95'],
  ])('masks %s as %s', (input, expected) => {
    expect(maskCnpj(input)).toBe(expected);
  });
});

describe('maskDocument', () => {
  it('applies the CPF mask while the input has 11 digits or fewer', () => {
    expect(maskDocument('123')).toBe('123');
    expect(maskDocument('12345678901')).toBe('123.456.789-01');
  });

  it('switches to the CNPJ mask from the 12th digit on', () => {
    expect(maskDocument('123456789012')).toBe('12.345.678/9012');
    expect(maskDocument('12345678000195')).toBe('12.345.678/0001-95');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/documentMask.test.js`
Expected: FAIL — `maskCnpj`/`maskDocument` não existem (`SyntaxError`/`undefined is not a function`).

- [ ] **Step 3: Implementar em `lib/documentMask.js`**

Adicionar ao final do arquivo:

```javascript
/** Formata CNPJ progressivamente enquanto o usuario digita: 00.000.000/0000-00. */
export function maskCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Aplica mascara de CPF ate 11 digitos digitados; a partir do 12o, mascara de CNPJ. */
export function maskDocument(value) {
  const digits = onlyDigits(value);
  return digits.length <= 11 ? maskCpf(value) : maskCnpj(value);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/documentMask.test.js`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS, nenhuma regressão

- [ ] **Step 6: Commit**

```bash
git add src/lib/documentMask.js src/test/documentMask.test.js
git commit -m "feat(documentMask): add maskCnpj and maskDocument (D4)"
```

---

### Task 2: `Register.jsx` — remover o campo CPF

**Files:**
- Modify: `src/pages/auth/Register.jsx`
- Modify: `src/test/register.test.jsx` (reescrever — os dois testes existentes testam exatamente o campo que está sendo removido)

**Interfaces:**
- Produces: `Register` sem campo `cpf` no schema nem no payload de `registerUser`.

- [ ] **Step 1: Reescrever o teste que falha**

Substituir o conteúdo de `src/test/register.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from '../pages/auth/Register';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const registerUser = vi.fn();
const login = vi.fn();

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ registerUser, login });
    registerUser.mockResolvedValue({});
    login.mockResolvedValue({});
    api.post.mockResolvedValue({ data: {} });
  });

  it('does not render a CPF field', () => {
    render(<MemoryRouter><Register /></MemoryRouter>);
    expect(screen.queryByPlaceholderText('000.000.000-00')).not.toBeInTheDocument();
    expect(screen.queryByText(/cpf/i)).not.toBeInTheDocument();
  });

  it('submits name, email and password without cpf', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'ana@example.com');
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'segredo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    await waitFor(() => expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana Souza', email: 'ana@example.com' })
    ));
    const [payload] = registerUser.mock.calls[0];
    expect(payload).not.toHaveProperty('cpf');
  });

  it('rejects a name shorter than 3 characters', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'An');
    await user.click(screen.getByRole('button', { name: /começar meu teste grátis/i }));

    expect(await screen.findByText(/nome muito curto/i)).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/register.test.jsx`
Expected: FAIL — o campo CPF ainda está no formulário (`does not render a CPF field` falha) e o payload ainda inclui `cpf` (`toHaveProperty('cpf')` seria verdadeiro).

- [ ] **Step 3: Editar `Register.jsx`**

Remover a linha 12 (`import { maskCpf, onlyDigits } from '../../lib/documentMask';`) — se nada mais no arquivo usar `maskCpf`/`onlyDigits` depois da remoção do campo, apagar o import inteiro; conferir antes de apagar.

Remover do schema (linha 17):
```javascript
  cpf: z.string().refine((value) => onlyDigits(value).length === 11, 'CPF deve ter 11 números'),
```

Remover a declaração (linha 33):
```javascript
  const cpfField = register('cpf');
```

Editar `onSubmit` (linha 47) — trocar:
```javascript
    const userData = { name: data.name, email: data.email, cpf: onlyDigits(data.cpf) };
```
por:
```javascript
    const userData = { name: data.name, email: data.email };
```

Remover o bloco JSX do campo CPF inteiro (linhas 107-121, do `<Input label="CPF" ...>` até o `<p className="-mt-3 ...">Usamos o CPF...</p>` logo depois).

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/register.test.jsx`
Expected: PASS (3 testes)

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/auth/Register.jsx src/test/register.test.jsx
git commit -m "feat(register): stop collecting CPF at signup, move it to store creation (D4)"
```

---

### Task 3: `Dashboard.jsx` — campo único "CPF ou CNPJ" com máscara

**Files:**
- Modify: `src/pages/dashboard/Dashboard.jsx`
- Test: `src/test/dashboard.test.jsx` (novo — não existe teste hoje pra esse componente)

**Interfaces:**
- Consumes: `maskDocument`, `onlyDigits` (Task 1).

- [ ] **Step 1: Escrever o teste que falha**

Antes de escrever, ler `src/pages/dashboard/Dashboard.jsx` por completo (imports de `useAuth`, `useProductSync`, chamadas `api.get('/identity/markets')` no mount) pra montar os mocks corretos — o componente busca lojas assim que monta, então o teste precisa mockar essa chamada mesmo só testando o formulário de criação.

```jsx
// src/test/dashboard.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/dashboard/Dashboard';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useProductSync } from '../hooks/useProductSync';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useProductSync', () => ({ useProductSync: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

describe('Dashboard — criar loja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { name: 'Ana' } });
    useProductSync.mockReturnValue({ syncAllProducts: vi.fn(), syncing: false });
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: {} });
  });

  async function openCreateModal(user) {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/identity/markets'));
    await user.click(screen.getByRole('button', { name: /nova loja/i }));
  }

  it('applies the CPF mask while typing 11 digits', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    const documentField = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(documentField, '12345678901');
    expect(documentField).toHaveValue('123.456.789-01');
  });

  it('applies the CNPJ mask once typing passes 11 digits', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    const documentField = screen.getByPlaceholderText('00.000.000/0001-00');
    await user.type(documentField, '12345678000195');
    expect(documentField).toHaveValue('12.345.678/0001-95');
  });

  it('submits only digits for the typed document', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    await user.type(screen.getByPlaceholderText('Ex: Mercadinho Central'), 'Loja Ana');
    await user.type(screen.getByPlaceholderText('00.000.000/0001-00'), '12345678901');
    await user.type(screen.getByPlaceholderText('Rua, Número, Bairro'), 'Rua X, 10');
    await user.click(screen.getByRole('button', { name: /^criar loja$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/identity/markets', expect.objectContaining({
      document: '12345678901',
    })));
  });

  it('shows a validation error for a document with the wrong length', async () => {
    const user = userEvent.setup();
    await openCreateModal(user);

    await user.type(screen.getByPlaceholderText('00.000.000/0001-00'), '123');
    await user.click(screen.getByRole('button', { name: /^criar loja$/i }));

    expect(await screen.findByText(/cpf ou cnpj inválido/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
```

Conferir antes de rodar: o texto exato do botão "Nova Loja" (`Store` icon + texto, linha 144 do componente) e do botão de submit "Criar Loja" (linha 168) batem com os `getByRole('button', {name: ...})` acima — ajustar os regexes se a role/acessível-name renderizada (ex.: ícone dentro do botão pode alterar o texto acessível) não bater exatamente ao rodar.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/dashboard.test.jsx`
Expected: FAIL — hoje não há máscara nenhuma no campo `document` (digitar `12345678901` fica cru, sem pontuação) e o zod schema (`min(14)`) rejeita CPF de 11 dígitos em vez de aceitar os dois formatos.

- [ ] **Step 3: Editar `Dashboard.jsx`**

Import (linha 12, junto dos outros): adicionar
```javascript
import { maskDocument, onlyDigits } from '../../lib/documentMask';
```

Schema (linhas 14-18) — trocar:
```javascript
const marketSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().min(14, 'CNPJ inválido'),
  address: z.string().min(5, 'Endereço obrigatório'),
});
```
por:
```javascript
const marketSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  document: z.string().refine(
    (value) => [11, 14].includes(onlyDigits(value).length),
    'CPF ou CNPJ inválido'
  ),
  address: z.string().min(5, 'Endereço obrigatório'),
});
```

No corpo do componente (perto da linha 30-32), capturar o campo registrado pra poder customizar o `onChange`, igual ao padrão já usado em `Register.jsx`:
```javascript
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(marketSchema)
  });
  const documentField = register('document');
```

`handleCreateMarket` (linha 57-67) — enviar só dígitos, trocar:
```javascript
  const handleCreateMarket = async (data) => {
    try {
      await api.post('/identity/markets', data);
```
por:
```javascript
  const handleCreateMarket = async (data) => {
    try {
      await api.post('/identity/markets', { ...data, document: onlyDigits(data.document) });
```

JSX do campo (linhas 153-158) — trocar:
```jsx
              <Input 
                label="CNPJ" 
                placeholder="00.000.000/0001-00" 
                {...register('document')} 
                error={errors.document?.message} 
              />
```
por:
```jsx
              <Input
                label="CPF ou CNPJ"
                placeholder="00.000.000/0001-00"
                inputMode="numeric"
                maxLength={18}
                error={errors.document?.message}
                {...documentField}
                onChange={(event) => {
                  event.target.value = maskDocument(event.target.value);
                  documentField.onChange(event);
                }}
              />
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/dashboard.test.jsx`
Expected: PASS (4 testes)

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/dashboard/Dashboard.jsx src/test/dashboard.test.jsx
git commit -m "feat(dashboard): accept CPF or CNPJ when creating a market, with progressive masking (D4)"
```

---

### Task 4: `Receipt.jsx` — rótulo condicional CPF/CNPJ

**Files:**
- Modify: `src/components/pdv/Receipt.jsx`
- Modify: `src/test/nfceReceipt.test.jsx`

**Interfaces:**
- Consumes: `onlyDigits` de `lib/documentMask.js` (Task 1) — importar em `Receipt.jsx` se ainda não estiver importado ali.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `src/test/nfceReceipt.test.jsx` (mesmo arquivo, nova `describe`, reaproveitando o mock de `doc` já definido no topo):

```jsx
describe('generateReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels an 11-digit document as CPF', async () => {
    const { generateReceipt } = await import('../components/pdv/Receipt');

    generateReceipt(
      { items: [], total: 0, payment_method: 'dinheiro' },
      { name: 'Mercado Teste', address: 'Rua A', document: '12345678901' }
    );

    const printedText = doc.text.mock.calls.map((call) => call[0]).join('\n');
    expect(printedText).toContain('CPF: 12345678901');
    expect(printedText).not.toContain('CNPJ: 12345678901');
  });

  it('labels a 14-digit document as CNPJ', async () => {
    const { generateReceipt } = await import('../components/pdv/Receipt');

    generateReceipt(
      { items: [], total: 0, payment_method: 'dinheiro' },
      { name: 'Mercado Teste', address: 'Rua A', document: '12345678000195' }
    );

    const printedText = doc.text.mock.calls.map((call) => call[0]).join('\n');
    expect(printedText).toContain('CNPJ: 12345678000195');
  });
});
```

Antes de finalizar, ler `generateReceipt` por completo (linhas 65-245) pra confirmar que um objeto `sale` mínimo (`{items: [], total: 0, payment_method: 'dinheiro'}`) não quebra em algum ponto mais adiante da função (ex.: iteração sobre `sale.items`, formatação de `sale.total`) — ajustar o fixture de `sale` no teste conforme o que a função realmente exige pra não lançar antes de chegar na linha do documento.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/test/nfceReceipt.test.jsx`
Expected: FAIL — hoje sempre imprime `CNPJ: ...` independente do tamanho do documento.

- [ ] **Step 3: Editar `Receipt.jsx`**

Adicionar o import no topo do arquivo, se `onlyDigits` ainda não estiver importado ali:
```javascript
import { onlyDigits } from '../../lib/documentMask';
```

Linha 124 — trocar:
```javascript
    if (marketInfo?.document) { centerText(`CNPJ: ${marketInfo.document}`, y); y += lineHeight; }
```
por:
```javascript
    if (marketInfo?.document) {
        const documentLabel = onlyDigits(marketInfo.document).length === 11 ? 'CPF' : 'CNPJ';
        centerText(`${documentLabel}: ${marketInfo.document}`, y); y += lineHeight;
    }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/test/nfceReceipt.test.jsx`
Expected: PASS

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/pdv/Receipt.jsx src/test/nfceReceipt.test.jsx
git commit -m "fix(receipt): label the store document as CPF or CNPJ based on its actual length (D4)"
```

---

## Self-Review

**Cobertura do spec:** §8 linha a linha — `Register.jsx`→Task 2, `Dashboard.jsx`→Task 3, `lib/documentMask.js`→Task 1, `Receipt.jsx:124`→Task 4. §9 (testes frontend) — os 3 bullets (`Register.jsx` sem CPF, `Dashboard.jsx` mascarando os dois formatos, `Receipt.jsx` rótulo condicional) têm teste equivalente.

**Placeholder scan:** nenhum "TODO"/"implementar depois". As duas instruções de "conferir antes de finalizar" (texto acessível dos botões na Task 3, fixture mínimo de `sale` na Task 4) são verificações contra o código/comportamento real, não lacunas de design.

**Consistência de tipos:** `maskDocument`/`maskCnpj`/`onlyDigits` (Task 1) são as únicas funções novas exportadas de `lib/documentMask.js`, e são exatamente os nomes usados nas Tasks 3 e 4 — nenhuma divergência de nome entre onde a função é definida e onde é consumida.
