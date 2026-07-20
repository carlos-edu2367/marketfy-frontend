import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaxRuleBulkAssignDialog from '../components/fiscal/TaxRuleBulkAssignDialog';
import FiscalStatusBadge from '../components/fiscal/FiscalStatusBadge';

describe('product tax assignment', () => {
  it.each(['configured', 'missing', 'draft', 'expired', 'context_mismatch', 'legacy_only'])(
    'renders the %s product fiscal status without inferring a fiscal rule',
    (status) => {
      render(<FiscalStatusBadge status={status} />);
      expect(screen.getByTestId(`fiscal-status-${status}`)).toBeInTheDocument();
    },
  );

  it('previews explicit products and requires a reason before replacing a published rule', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <TaxRuleBulkAssignDialog
        products={[{ id: 'p-1', name: 'Bebida', fiscal_status: 'missing', tax_rule_id: 'old-rule' }]}
        rules={[{ id: 'rule-1', name: 'Regra publicada', status: 'published' }]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Bebida')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Regra publicada', { exact: true }), 'rule-1');
    await user.click(screen.getByRole('button', { name: /atribuir regra/i }));

    expect(screen.getByText(/informe o motivo/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
