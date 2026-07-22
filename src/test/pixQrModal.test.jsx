import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PixQrModal from '../components/pdv/PixQrModal';

vi.mock('../lib/api', () => ({
  createPixQr: vi.fn(() => Promise.resolve({ data: {
    attempt_id: 'a1', status: 'pending', amount: '20.00', qr_data: '000201QR',
    order_id: 'ORD1', expires_at: new Date(Date.now() + 300000).toISOString(),
    stream_url: '/x' } })),
  getPixAttempt: vi.fn(() => Promise.resolve({ data: { status: 'pending' } })),
  verifyPixAttempt: vi.fn(() => Promise.resolve({ data: { status: 'approved', sale_completed: true } })),
  cancelPixAttempt: vi.fn(() => Promise.resolve({ data: { status: 'canceled' } })),
  pixEventsUrl: vi.fn(() => 'http://x/events'),
}));
// EventSource stub que guarda os listeners registrados, permitindo emitir
// eventos SSE reais para o componente durante o teste.
let lastEventSource;
beforeEach(() => {
  lastEventSource = undefined;
  // Precisa ser `function` (não arrow) para ser construível via `new`.
  globalThis.EventSource = vi.fn(function () {
    const listeners = {};
    lastEventSource = {
      listeners,
      addEventListener: vi.fn((type, fn) => { listeners[type] = fn; }),
      close: vi.fn(),
      emit(type, payload) { listeners[type]?.({ data: JSON.stringify(payload) }); },
    };
    return lastEventSource;
  });
});

describe('PixQrModal', () => {
  it('creates the qr once and shows amount and copy-paste', async () => {
    const api = await import('../lib/api');
    render(<PixQrModal marketId="m1" terminalId="t1" boxId="b1"
      items={[{ product_id: 'p1', quantity: 2 }]} onApproved={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(api.createPixQr).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/20,00|20\.00/)).toBeInTheDocument());
    expect(screen.getByText(/000201QR/)).toBeInTheDocument();
  });

  it('surfaces a divergence pushed over SSE as payment.error', async () => {
    render(<PixQrModal marketId="m1" terminalId="t1" boxId="b1"
      items={[{ product_id: 'p1', quantity: 2 }]} onApproved={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(lastEventSource?.listeners['payment.error']).toBeDefined());

    lastEventSource.emit('payment.error', { attempt_id: 'a1', status: 'divergent' });

    await waitFor(() => expect(screen.getByText(/diverg/i)).toBeInTheDocument());
  });

  it('verify approved calls onApproved', async () => {
    const onApproved = vi.fn();
    render(<PixQrModal marketId="m1" terminalId="t1" boxId="b1"
      items={[{ product_id: 'p1', quantity: 2 }]} onApproved={onApproved} onClose={vi.fn()} />);
    await waitFor(() => screen.getByText(/Verificar pagamento/i));
    fireEvent.click(screen.getByText(/Verificar pagamento/i));
    await waitFor(() => expect(onApproved).toHaveBeenCalled());
  });

  it('explains when the market location is required and offers configuration', async () => {
    const api = await import('../lib/api');
    api.createPixQr.mockRejectedValueOnce({
      response: { data: { detail: { code: 'pix.location_not_configured' } } },
    });

    render(<PixQrModal marketId="m1" terminalId="t1" boxId="b1"
      items={[{ product_id: 'p1', quantity: 2 }]} onApproved={vi.fn()} onClose={vi.fn()}
      canConfigurePix />);

    await waitFor(() => expect(screen.getByText(/localiza.*loja/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /configurar localiza/i })).toHaveAttribute(
      'href',
      '/dashboard/settings?tab=pix&marketId=m1&step=location',
    );
  });
});
