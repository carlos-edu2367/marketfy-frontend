import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentModal from '../components/pdv/PaymentModal';

describe('PaymentModal pix modalities', () => {
  it('shows only manual pix when integration unavailable', () => {
    render(<PaymentModal total={10} onConfirm={vi.fn()} onCancel={vi.fn()} marketId="m1"
      pixIntegrationAvailable={false} onGeneratePixQr={vi.fn()} />);
    fireEvent.click(screen.getByText('PIX'));
    expect(screen.queryByText(/Gerar QR Code/i)).not.toBeInTheDocument();
  });

  it('shows QR option when integration available and calls handler', () => {
    const onGen = vi.fn();
    render(<PaymentModal total={10} onConfirm={vi.fn()} onCancel={vi.fn()} marketId="m1"
      pixIntegrationAvailable={true} onGeneratePixQr={onGen} />);
    fireEvent.click(screen.getByText('PIX'));
    fireEvent.click(screen.getByText(/Gerar QR Code/i));
    expect(onGen).toHaveBeenCalled();
  });
});
