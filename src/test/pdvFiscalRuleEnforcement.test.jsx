import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import FiscalSaleBlockDialog from '../components/fiscal/FiscalSaleBlockDialog';
import { shouldBlockOfflineCheckout } from '../lib/fiscalEnforcement';

describe('FiscalSaleBlockDialog', () => {
  it('keeps the recovery focused and caps the affected products at five', () => {
    render(
      <MemoryRouter>
        <FiscalSaleBlockDialog
          error={{
            code: 'sale.fiscal_rule_missing',
            items: Array.from({ length: 6 }, (_, index) => ({
              product_name: `Produto ${index + 1}`,
            })),
          }}
          marketId="market-1"
          role="cashier"
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('Configuração fiscal pendente');
    expect(screen.getByText('Produto 5')).toBeInTheDocument();
    expect(screen.queryByText('Produto 6')).not.toBeInTheDocument();
    expect(screen.getByText(/e mais 1 produto/i)).toBeInTheDocument();
    expect(screen.getByText(/chame o responsável/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /abrir central fiscal/i })).not.toBeInTheDocument();
  });

  it('gives manager recovery access to the fiscal center', () => {
    render(
      <MemoryRouter>
        <FiscalSaleBlockDialog
          error={{ code: 'sale.fiscal_connection_required', items: [] }}
          marketId="market-1"
          role="manager"
          onClose={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /abrir central fiscal/i })).toHaveAttribute(
      'href',
      '/dashboard/settings?tab=fiscal&marketId=market-1'
    );
  });
});

describe('offline fiscal enforcement', () => {
  it('does not allow a cached block rollout to create an offline sale', () => {
    expect(shouldBlockOfflineCheckout({ enforcement: 'block' })).toBe(true);
  });

  it('preserves the established offline-first flow for off and warn', () => {
    expect(shouldBlockOfflineCheckout({ enforcement: 'warn' })).toBe(false);
    expect(shouldBlockOfflineCheckout(undefined)).toBe(false);
  });
});
