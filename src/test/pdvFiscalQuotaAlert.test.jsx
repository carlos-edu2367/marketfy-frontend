import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { FiscalQuotaAlert } from '../pages/pdv/Pdv';

function renderAlert(props) {
  return render(
    <MemoryRouter>
      <FiscalQuotaAlert marketId="market-1" {...props} />
    </MemoryRouter>
  );
}

describe('FiscalQuotaAlert', () => {
  it('shows warning at 80% quota', () => {
    renderAlert({
      balance: { used_count: 160, included_limit: 200, addon_limit: 0, percentage_used: 80 },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Voce usou 80%');
    expect(screen.getByRole('link', { name: /comprar creditos/i })).toHaveAttribute(
      'href',
      '/fiscal/credits?marketId=market-1'
    );
  });

  it('shows critical at 100% quota', () => {
    renderAlert({
      balance: { used_count: 200, included_limit: 200, addon_limit: 0, percentage_used: 100 },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Limite de emissoes NFC-e atingido');
  });

  it('renders no alert below 80%', () => {
    const { container } = renderAlert({
      balance: { used_count: 120, included_limit: 200, addon_limit: 0, percentage_used: 60 },
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('402 response shows limit alert', () => {
    renderAlert({
      quotaExceeded: true,
      balance: { used_count: 200, included_limit: 200, addon_limit: 0, percentage_used: 100 },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Nao foi possivel emitir a NFC-e');
  });
});

