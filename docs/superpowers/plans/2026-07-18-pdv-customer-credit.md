# PDV: seleção de cliente fiado e edição de limite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Disponibilizar um seletor de clientes amplo para vendas fiadas e permitir alterar o limite de crédito sem alterar a dívida do cliente.

**Architecture:** O backend expõe uma atualização PATCH restrita ao limite, que preserva a regra já existente de bloqueio de novas dívidas. O frontend extrai a escolha offline de clientes para um modal próprio, abre esse seletor ao escolher Fiado e adiciona um modal de edição de limite que atualiza a API e o cache Dexie.

**Tech Stack:** FastAPI, Pydantic v2, Python/pytest; React 18, Vite, Vitest, Testing Library, react-hook-form, Dexie e Tailwind CSS.

## Global Constraints

- Criar e manter as alterações apenas nos worktrees feature/pdv-customer-credit derivados de origin/main.
- Não modificar, incorporar ou enviar arquivos/commits do worktree fiscal-product-tax-rules.
- A busca do seletor deve considerar somente nome e CPF e nunca limitar a lista a cinco clientes.
- Limite negativo deve ser recusado; reduzir o limite abaixo da dívida é permitido e deve resultar em crédito disponível igual a R$ 0,00.
- Alterar limite não cria lançamento no ledger nem altera current_debt.
- Executar cada teste em estado vermelho antes do código que o faz passar e criar commits separados por repositório.

---

## Estrutura de arquivos

- Backend app/application/dtos.py: DTO de alteração do limite com validação decimal.
- Backend app/application/services/finance_support.py: regra de atualização de limite e verificação de pertencimento à loja.
- Backend app/infra/web/routers/finance_support.py: rota PATCH autenticada que serializa a resposta.
- Backend tests/unit/test_finance_credit_limit.py: repositório em memória e testes do serviço/DTO.
- Frontend src/components/pdv/CustomerSelectorModal.jsx: interface offline de busca e seleção de cliente.
- Frontend src/components/pdv/PaymentModal.jsx: ciclo de abertura do seletor e cálculo de crédito disponível não negativo.
- Frontend src/pages/dashboard/Customers.jsx: modal de edição de limite, PATCH e atualização do cache local.
- Frontend src/test/customerSelectorModal.test.jsx, paymentModalFiado.test.jsx e customersCreditLimit.test.jsx: testes da funcionalidade.

### Task 1: Contrato de atualização de limite no backend

**Files:**

- Create: C:/Users/reali/Documents/Neectify/marketfy/.worktrees/backend-pdv-customer-credit/tests/unit/test_finance_credit_limit.py
- Modify: C:/Users/reali/Documents/Neectify/marketfy/.worktrees/backend-pdv-customer-credit/app/application/dtos.py:397-413
- Modify: C:/Users/reali/Documents/Neectify/marketfy/.worktrees/backend-pdv-customer-credit/app/application/services/finance_support.py:64-91
- Modify: C:/Users/reali/Documents/Neectify/marketfy/.worktrees/backend-pdv-customer-credit/app/infra/web/routers/finance_support.py:71-95

**Interfaces:**

- Consumes: CustomerRepositoryInterface.get_by_id(customer_id) e save(customer, commit=True); entidade Customer com credit_limit, current_debt e market_id.
- Produces: CustomerCreditLimitUpdateDTO(credit_limit: Decimal) e FinanceService.update_customer_credit_limit(market_id, customer_id, dto) -> Customer.

- [ ] **Step 1: Write the failing tests**

    class MemoryCustomerRepository:
        def __init__(self, customer):
            self.customer = customer
            self.saved = None

        async def get_by_id(self, customer_id):
            return self.customer if self.customer and self.customer.id == customer_id else None

        async def save(self, customer, commit=True):
            self.saved = customer
            return customer

    @pytest.mark.asyncio
    async def test_updates_limit_below_current_debt_without_changing_debt():
        customer = Customer(id=uuid.uuid4(), market_id=uuid.uuid4(), name='Ana',
                            credit_limit=Decimal('100'), current_debt=Decimal('80'))
        service = FinanceService(MemoryCustomerRepository(customer))

        updated = await service.update_customer_credit_limit(
            customer.market_id, customer.id,
            CustomerCreditLimitUpdateDTO(credit_limit=Decimal('50')),
        )

        assert updated.credit_limit == Decimal('50')
        assert updated.current_debt == Decimal('80')
        with pytest.raises(BusinessRuleException, match='Limite de crédito excedido'):
            updated.add_debt(Decimal('0.01'))

    @pytest.mark.asyncio
    async def test_rejects_customer_from_another_market():
        customer = Customer(id=uuid.uuid4(), market_id=uuid.uuid4(), name='Ana')
        service = FinanceService(MemoryCustomerRepository(customer))

        with pytest.raises(BusinessRuleException, match='Cliente não encontrado'):
            await service.update_customer_credit_limit(
                uuid.uuid4(), customer.id,
                CustomerCreditLimitUpdateDTO(credit_limit=Decimal('50')),
            )

    def test_rejects_negative_credit_limit_payload():
        with pytest.raises(ValidationError):
            CustomerCreditLimitUpdateDTO(credit_limit=Decimal('-0.01'))

- [ ] **Step 2: Run test to verify it fails**

Run: ./.venv/Scripts/python.exe -m pytest tests/unit/test_finance_credit_limit.py -q

Expected: FAIL because CustomerCreditLimitUpdateDTO and update_customer_credit_limit do not exist.

- [ ] **Step 3: Write minimal implementation**

    # app/application/dtos.py
    class CustomerCreditLimitUpdateDTO(BaseModel):
        credit_limit: Decimal = Field(ge=Decimal('0.00'))

    # app/application/services/finance_support.py
    async def update_customer_credit_limit(self, market_id, customer_id, dto):
        customer = await self.customer_repo.get_by_id(customer_id)
        if not customer or customer.market_id != market_id:
            raise BusinessRuleException('Cliente não encontrado.')
        customer.credit_limit = dto.credit_limit
        customer.update_timestamp()
        return await self.customer_repo.save(customer)

    # app/infra/web/routers/finance_support.py
    @router_finance.patch('/{market_id}/customers/{customer_id}', response_model=CustomerResponseDTO)
    async def update_customer_credit_limit(market_id, customer_id, dto, service=Depends(get_finance_service),
                                           market=Depends(require_market_access(MarketPermission.FINANCE_WRITE))):
        try:
            customer = await service.update_customer_credit_limit(market_id, customer_id, dto)
            return _customer_to_response(customer)
        except BusinessRuleException as exc:
            raise HTTPException(status_code=404, detail=str(exc))

Import Field from pydantic and CustomerCreditLimitUpdateDTO where required. Preserve UUID and DTO annotations used by neighboring routes.

- [ ] **Step 4: Run test to verify it passes**

Run: ./.venv/Scripts/python.exe -m pytest tests/unit/test_finance_credit_limit.py -q

Expected: PASS with three tests.

- [ ] **Step 5: Run regression slice and commit**

Run: ./.venv/Scripts/python.exe -m pytest tests/unit/test_domain_pure.py tests/unit/test_finance_credit_limit.py -q

Expected: PASS.

    git add app/application/dtos.py app/application/services/finance_support.py app/infra/web/routers/finance_support.py tests/unit/test_finance_credit_limit.py
    git commit -m "feat: permite atualizar limite de crédito"

### Task 2: Modal offline de seleção de cliente

**Files:**

- Create: C:/Users/reali/Documents/Neectify/marketfy/frontend/.worktrees/pdv-customer-credit/src/components/pdv/CustomerSelectorModal.jsx
- Create: C:/Users/reali/Documents/Neectify/marketfy/frontend/.worktrees/pdv-customer-credit/src/test/customerSelectorModal.test.jsx

**Interfaces:**

- Consumes: marketId, onSelect(customer), onClose() e db.customers.where('market_id').equals(marketId).toArray().
- Produces: CustomerSelectorModal, que chama onSelect uma vez para o cliente escolhido e onClose para cancelar/fechar.

- [ ] **Step 1: Write failing component tests**

    vi.mock('../lib/db', () => ({
      db: { customers: { where: vi.fn() } },
    }));

    it('lists every customer and filters by name or CPF', async () => {
      db.customers.where.mockReturnValue({ equals: () => ({ toArray: async () => customers }) });
      const user = userEvent.setup();
      render(<CustomerSelectorModal marketId="market-1" onSelect={vi.fn()} onClose={vi.fn()} />);

      expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
      expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
      await user.type(screen.getByRole('searchbox', { name: /nome ou cpf/i }), '12345678900');
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      expect(screen.queryByText('Bruno Lima')).not.toBeInTheDocument();
    });

    it('returns the selected customer', async () => {
      const onSelect = vi.fn();
      db.customers.where.mockReturnValue({ equals: () => ({ toArray: async () => customers }) });
      const user = userEvent.setup();
      render(<CustomerSelectorModal marketId="market-1" onSelect={onSelect} onClose={vi.fn()} />);

      await user.click(await screen.findByRole('button', { name: /selecionar ana souza/i }));
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'customer-1', name: 'Ana Souza' }));
    });

- [ ] **Step 2: Run test to verify it fails**

Run: npm.cmd test -- src/test/customerSelectorModal.test.jsx

Expected: FAIL because the modal module does not exist.

- [ ] **Step 3: Write minimal selector implementation**

    export default function CustomerSelectorModal({ marketId, onSelect, onClose }) {
      const [customers, setCustomers] = useState([]);
      const [query, setQuery] = useState('');
      const normalizedQuery = query.trim().toLowerCase();
      const filteredCustomers = customers.filter(({ name, cpf }) =>
        !normalizedQuery || name.toLowerCase().includes(normalizedQuery)
        || (cpf || '').includes(normalizedQuery)
      );

      useEffect(() => {
        db.customers.where('market_id').equals(marketId).toArray()
          .then(items => setCustomers(items.sort((a, b) => a.name.localeCompare(b.name))))
          .catch(() => toast.error('Erro ao buscar clientes locais.'));
      }, [marketId]);

      return (
        <div role="dialog" aria-modal="true" aria-labelledby="customer-selector-title">
          <h2 id="customer-selector-title">Selecionar cliente</h2>
          <button type="button" aria-label="Fechar seletor" onClick={onClose}>Fechar</button>
          <input type="search" aria-label="Buscar por nome ou CPF" value={query}
                 onChange={(event) => setQuery(event.target.value)} />
          <div className="overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <button key={customer.id} type="button"
                      aria-label={'Selecionar ' + customer.name}
                      onClick={() => onSelect(customer)}>
                <span>{customer.name}</span>
                <span>{customer.cpf || 'Sem CPF'}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

Render an input with type="search" and aria-label="Buscar por nome ou CPF". Render every filtered record as a button named "Selecionar {customer.name}" inside a scrollable list. Display Math.max(0, Number(credit_limit) - Number(current_debt || 0)) as available credit. Render loading, empty-list and no-result states.

- [ ] **Step 4: Run selector test to verify it passes**

Run: npm.cmd test -- src/test/customerSelectorModal.test.jsx

Expected: PASS with two tests.

- [ ] **Step 5: Commit selector**

    git add src/components/pdv/CustomerSelectorModal.jsx src/test/customerSelectorModal.test.jsx
    git commit -m "feat: adiciona seletor de cliente fiado"

### Task 3: Integrar o seletor ao pagamento fiado

**Files:**

- Modify: C:/Users/reali/Documents/Neectify/marketfy/frontend/.worktrees/pdv-customer-credit/src/components/pdv/PaymentModal.jsx:1-270
- Create: C:/Users/reali/Documents/Neectify/marketfy/frontend/.worktrees/pdv-customer-credit/src/test/paymentModalFiado.test.jsx

**Interfaces:**

- Consumes: CustomerSelectorModal from Task 2.
- Produces: Ao escolher fiado abre o seletor; a seleção define selectedCustomer; available é sempre maior ou igual a zero.

- [ ] **Step 1: Write failing payment tests**

    it('opens the customer selector when fiado is chosen', async () => {
      const user = userEvent.setup();
      render(<PaymentModal total={20} marketId="market-1" onConfirm={vi.fn()} onCancel={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /fiado/i }));
      expect(await screen.findByRole('dialog', { name: /selecionar cliente/i })).toBeInTheDocument();
    });

    it('shows zero available and blocks fiado when debt exceeds limit', async () => {
      renderPaymentWithSelectedCustomer({ credit_limit: '50.00', current_debt: '80.00' });

      expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
      await userEvent.setup().click(screen.getByRole('button', { name: /adicionar pagamento/i }));
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/limite insuficiente/i));
    });

- [ ] **Step 2: Run test to verify it fails**

Run: npm.cmd test -- src/test/paymentModalFiado.test.jsx

Expected: FAIL because Fiado does not open a dedicated dialog and available credit can be negative.

- [ ] **Step 3: Implement only integration and calculation changes**

    const [isCustomerSelectorOpen, setIsCustomerSelectorOpen] = useState(false);

    const selectPaymentMethod = (method) => {
      setSelectedMethod(method);
      if (method === 'fiado' && !selectedCustomer) setIsCustomerSelectorOpen(true);
    };

    const available = Math.max(0, limit - debt);

    {isCustomerSelectorOpen && (
      <CustomerSelectorModal
        marketId={marketId}
        onClose={() => setIsCustomerSelectorOpen(false)}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setIsCustomerSelectorOpen(false);
        }}
      />
    )}

Replace the embedded input/dropdown with the selected-customer summary and a "Selecionar cliente" button when none is selected. Keep handleAddPayment validation, now using the clamped available value.

- [ ] **Step 4: Run feature tests to verify they pass**

Run: npm.cmd test -- src/test/customerSelectorModal.test.jsx src/test/paymentModalFiado.test.jsx

Expected: PASS with no unhandled React warnings.

- [ ] **Step 5: Commit PDV integration**

    git add src/components/pdv/PaymentModal.jsx src/test/paymentModalFiado.test.jsx
    git commit -m "feat: abre seletor ao escolher fiado"

### Task 4: Editar limite na gestão de clientes e sincronizar o cache

**Files:**

- Modify: C:/Users/reali/Documents/Neectify/marketfy/frontend/.worktrees/pdv-customer-credit/src/pages/dashboard/Customers.jsx:1-337
- Create: C:/Users/reali/Documents/Neectify/marketfy/frontend/.worktrees/pdv-customer-credit/src/test/customersCreditLimit.test.jsx

**Interfaces:**

- Consumes: api.patch('/finance/' + marketId + '/customers/' + customerId, { credit_limit }), db.customers.update(customerId, { credit_limit }) e loadCustomers().
- Produces: Ação Editar limite, modal de edição e handleCreditLimitUpdate({ credit_limit }).

- [ ] **Step 1: Write failing screen tests**

    it('saves a lower limit, refreshes the list and updates the local customer cache', async () => {
      api.get.mockResolvedValueOnce({ data: [{ id: 'market-1', name: 'Mercado' }] })
        .mockResolvedValueOnce({ data: [customer] });
      api.patch.mockResolvedValue({ data: { ...customer, credit_limit: '50.00' } });
      const user = userEvent.setup();
      render(<MemoryRouter><Customers /></MemoryRouter>);

      await user.click(await screen.findByRole('button', { name: /editar limite de ana/i }));
      await user.clear(screen.getByLabelText(/limite de crédito/i));
      await user.type(screen.getByLabelText(/limite de crédito/i), '50');
      await user.click(screen.getByRole('button', { name: /salvar limite/i }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
        '/finance/market-1/customers/customer-1', { credit_limit: 50 }
      ));
      expect(db.customers.update).toHaveBeenCalledWith('customer-1', { credit_limit: '50.00' });
    });

    it('warns when the new limit is below current debt', async () => {
      renderCreditLimitDialog({ ...customer, current_debt: '80.00' });
      const user = userEvent.setup();
      await user.clear(screen.getByLabelText(/limite de crédito/i));
      await user.type(screen.getByLabelText(/limite de crédito/i), '50');
      expect(screen.getByText(/novas vendas fiadas ficarão bloqueadas/i)).toBeInTheDocument();
    });

- [ ] **Step 2: Run test to verify it fails**

Run: npm.cmd test -- src/test/customersCreditLimit.test.jsx

Expected: FAIL because no edit action or PATCH call exists.

- [ ] **Step 3: Implement edit state, modal, request and cache update**

    const [creditLimitModal, setCreditLimitModal] = useState({ open: false, customer: null });
    const [creditLimitLoading, setCreditLimitLoading] = useState(false);
    const { register: registerLimit, handleSubmit: handleSubmitLimit, reset: resetLimit, watch: watchLimit } = useForm();

    const openCreditLimitModal = (customer) => {
      setCreditLimitModal({ open: true, customer });
      resetLimit({ credit_limit: customer.credit_limit });
    };

    const handleCreditLimitUpdate = async ({ credit_limit }) => {
      setCreditLimitLoading(true);
      try {
        const response = await api.patch(
          '/finance/' + selectedMarketId + '/customers/' + creditLimitModal.customer.id,
          { credit_limit: parseFloat(credit_limit) },
        );
        await db.customers.update(response.data.id, { credit_limit: response.data.credit_limit });
        setCreditLimitModal({ open: false, customer: null });
        await loadCustomers();
      } finally {
        setCreditLimitLoading(false);
      }
    };

Use Math.max(0, limit - debt) for the list's available-credit display. The modal shows "Novas vendas fiadas ficarão bloqueadas..." whenever Number(watchLimit('credit_limit')) is smaller than Number(creditLimitModal.customer.current_debt), but permits save for every nonnegative value.

- [ ] **Step 4: Run screen test to verify it passes**

Run: npm.cmd test -- src/test/customersCreditLimit.test.jsx

Expected: PASS with two tests.

- [ ] **Step 5: Run frontend suite and commit**

Run: npm.cmd test

Expected: PASS for the existing suite and all three new feature test files.

    git add src/pages/dashboard/Customers.jsx src/test/customersCreditLimit.test.jsx
    git commit -m "feat: permite editar limite de cliente"

### Task 5: Verificação final e preparação para integração

**Files:**

- Modify only files in Tasks 1-4 if verification exposes a feature defect.

**Interfaces:**

- Consumes: todos os commits das Tasks 1-4 em seus respectivos repositórios.
- Produces: evidência de testes, lint/build e diffs contendo somente a melhoria de clientes/fiado e documentos associados.

- [ ] **Step 1: Verify backend**

Run: ./.venv/Scripts/python.exe -m pytest tests/unit/test_domain_pure.py tests/unit/test_finance_credit_limit.py -q

Expected: PASS.

- [ ] **Step 2: Verify frontend**

Run: npm.cmd test

Expected: PASS.

Run: npm.cmd run lint

Expected: exit code 0.

Run: npm.cmd run build

Expected: exit code 0.

- [ ] **Step 3: Inspect isolation before requesting push authorization**

Run in each repository: git diff origin/main...HEAD --stat and git log --oneline origin/main..HEAD.

Expected: only customer-credit commits and approved design/plan documents; no fiscal files, commits or merges.

- [ ] **Step 4: Commit a verification correction only if one is needed**

First inspect every staged line with git diff --cached. If a correction was necessary, stage tracked corrections with git add -u and commit with the command below. If no correction was necessary, do not create an empty commit.

    git add -u
    git diff --cached
    git commit -m "fix: corrige verificação de limite de cliente"

Request explicit authorization before merging or pushing anything to main.
