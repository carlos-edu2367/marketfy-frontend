import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { db } from '../../lib/db';
import { formatCurrency } from '../../lib/utils';

export default function CustomerSelectorModal({ marketId, onSelect, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCustomers() {
      setIsLoading(true);
      try {
        const localCustomers = await db.customers
          .where('market_id')
          .equals(marketId)
          .toArray();

        if (active) {
          setCustomers([...localCustomers].sort((first, second) =>
            first.name.localeCompare(second.name, 'pt-BR')
          ));
        }
      } catch (error) {
        if (active) {
          setCustomers([]);
          toast.error('Erro ao buscar clientes locais.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      active = false;
    };
  }, [marketId]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedSearch) return customers;

    return customers.filter((customer) =>
      customer.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
      customer.cpf?.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
    );
  }, [customers, search]);

  const hasSearch = Boolean(search.trim());

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-selector-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="customer-selector-title" className="text-lg font-black text-gray-900">
              Selecionar cliente
            </h2>
            <p className="text-sm text-gray-500">Escolha o cliente para venda fiada.</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="border-b border-gray-100 px-6 py-4">
          <label htmlFor="customer-selector-search" className="mb-2 block text-sm font-bold text-gray-700">
            Buscar por nome ou CPF
          </label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="customer-selector-search"
              type="search"
              aria-label="Buscar por nome ou CPF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="Digite o nome ou CPF"
            />
          </div>
        </div>

        <div className="min-h-40 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              Carregando clientes...
            </div>
          ) : filteredCustomers.length > 0 ? (
            <ul className="space-y-2">
              {filteredCustomers.map((customer) => {
                const availableCredit = Math.max(
                  0,
                  Number(customer.credit_limit || 0) - Number(customer.current_debt || 0)
                );

                return (
                  <li key={customer.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-gray-100 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50"
                      aria-label={`Selecionar ${customer.name}`}
                      onClick={() => onSelect(customer)}
                    >
                      <span>
                        <span className="block font-bold text-gray-900">{customer.name}</span>
                        <span className="mt-1 block text-sm text-gray-500">CPF: {customer.cpf || 'Não informado'}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-bold uppercase tracking-wide text-gray-400">Disponível</span>
                        <span className="block font-black text-green-700">{formatCurrency(availableCredit)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-gray-500">
              {hasSearch ? 'Nenhum resultado para a busca.' : 'Nenhum cliente encontrado.'}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
