import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import Inventory from '../pages/dashboard/Inventory';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const market = { id: 'market-1', name: 'Mercado' };
const duplicate = {
  id: 'product-1', name: 'Produto existente', code: '001', barcode: '7891234567890',
  price: 10, cost_price: 5, current_stock: 1, fiscal_status: 'missing',
};

function arrangeProducts(products = [duplicate]) {
  api.get.mockImplementation((url) => {
    if (url === '/identity/markets') return Promise.resolve({ data: [market] });
    if (url === `/inventory/${market.id}/products`) return Promise.resolve({ data: products });
    return Promise.resolve({ data: [] });
  });
}

describe('Inventory product management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    arrangeProducts();
  });

  it('requires explicit confirmation before creating a normalized duplicate barcode', async () => {
    const user = userEvent.setup();
    render(<Inventory />);
    await screen.findByText('Produto existente');

    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    await user.type(screen.getByPlaceholderText('789...'), '789.123.456.7890');
    await user.type(screen.getByPlaceholderText('Ex: 00100'), '002');
    await user.type(screen.getByPlaceholderText('Ex: Arroz 5kg'), 'Duplicado permitido');
    await user.type(screen.getAllByPlaceholderText('0.00')[1], '12');
    await user.click(screen.getByRole('button', { name: /cadastrar produto/i }));

    expect(api.post).not.toHaveBeenCalled();
    expect(await screen.findByText(/código de barras já cadastrado/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cadastrar mesmo assim/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
  });

  it('confirms product deletion before calling DELETE and refreshing the inventory', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({ data: { message: 'Produto removido com sucesso.' } });
    render(<Inventory />);
    await screen.findByText('Produto existente');

    await user.click(screen.getByRole('button', { name: /excluir produto existente/i }));
    expect(api.delete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /^excluir produto$/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/inventory/market-1/products/product-1'));
    expect(api.get).toHaveBeenCalledWith('/inventory/market-1/products');
  });
});
