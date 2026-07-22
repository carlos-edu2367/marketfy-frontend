import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PixLocationSetup from '../components/settings/PixLocationSetup';

const { getPixLocation, savePixLocation, lookupAddressByCep } = vi.hoisted(() => ({
  getPixLocation: vi.fn(), savePixLocation: vi.fn(), lookupAddressByCep: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  getPixLocation,
  savePixLocation,
  lookupAddressByCep,
}));

vi.mock('../components/settings/LocationMap', () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange({ latitude: -23.55, longitude: -46.63 })}>
      mapa de teste
    </button>
  ),
}));

describe('PixLocationSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPixLocation.mockResolvedValue({ data: { status: 'not_configured' } });
    savePixLocation.mockResolvedValue({ data: { status: 'ready', location_version: 1 } });
    lookupAddressByCep.mockResolvedValue({ data: {
      postal_code: '01001000', street_name: 'Praça da Sé', district: 'Sé',
      city_name: 'São Paulo', state_code: 'SP',
    } });
  });

  it('does not request browser location until the user explicitly clicks it', async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
    render(<PixLocationSetup marketId="m1" />);

    await screen.findByText(/localização da loja/i);
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /usar minha localização/i }));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('fills address fields from a valid CEP and keeps manual editing available', async () => {
    render(<PixLocationSetup marketId="m1" />);
    const cep = await screen.findByLabelText(/cep/i);

    fireEvent.change(cep, { target: { value: '01001000' } });

    await waitFor(() => expect(lookupAddressByCep).toHaveBeenCalledWith('01001000'));
    expect(screen.getByLabelText(/logradouro/i)).toHaveValue('Praça da Sé');
    expect(screen.getByLabelText(/número/i)).toBeEnabled();
  });

  it('requires a confirmed map point before saving', async () => {
    render(<PixLocationSetup marketId="m1" />);
    await screen.findByText(/localização da loja/i);
    fireEvent.change(screen.getByLabelText(/cep/i), { target: { value: '01001000' } });
    fireEvent.change(screen.getByLabelText(/logradouro/i), { target: { value: 'Rua A' } });
    fireEvent.change(screen.getByLabelText(/número/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: 'São Paulo' } });
    fireEvent.change(screen.getByLabelText(/uf/i), { target: { value: 'SP' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar localização/i }));

    expect(await screen.findByText(/confirme o ponto no mapa/i)).toBeVisible();
    expect(savePixLocation).not.toHaveBeenCalled();
  });
});
