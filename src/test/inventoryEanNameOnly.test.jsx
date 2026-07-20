import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import axios from 'axios';
import Inventory from '../pages/dashboard/Inventory';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('Inventory EAN lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: [] });
  });

  it('fills only the commercial name and preserves the fiscal NCM field', async () => {
    const user = userEvent.setup();
    render(<Inventory />);

    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    const barcode = screen.getByPlaceholderText('789...');
    const name = screen.getByPlaceholderText('Ex: Arroz 5kg');
    const ncm = screen.getByPlaceholderText('0000.00.00');

    await user.type(barcode, '7891000088791');
    await user.type(ncm, '1905.31.00');
    await user.click(screen.getByTitle('Consultar Online'));

    await waitFor(() => expect(name).toHaveValue('Chocolate KitKat Nestlé 41,5g'));
    expect(ncm).toHaveValue('1905.31.00');
    expect(axios.get).not.toHaveBeenCalled();
  });
});
