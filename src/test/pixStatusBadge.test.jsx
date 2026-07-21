import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PixStatusBadge from '../components/pdv/PixStatusBadge';

describe('PixStatusBadge', () => {
  it('shows manual pix label', () => {
    render(<PixStatusBadge modality="manual" pixStatus={null} />);
    expect(screen.getByText(/Pix manual/i)).toBeInTheDocument();
  });
  it('shows confirmed qr pix', () => {
    render(<PixStatusBadge modality="qr_dynamic" pixStatus="approved" />);
    expect(screen.getByText(/Pix QR/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmado/i)).toBeInTheDocument();
  });
  it('shows divergence in red', () => {
    render(<PixStatusBadge modality="qr_dynamic" pixStatus="divergent" />);
    expect(screen.getByText(/divergência/i)).toBeInTheDocument();
  });
});
