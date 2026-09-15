import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunilDiaDoMercado from '../pages/marketing/FunilDiaDoMercado';
import { createFunnelLead } from '../lib/marketingFunnelApi';
import { trackFunnelEvent, getFunnelVisitorId } from '../lib/funnelTracking';

vi.mock('../lib/marketingFunnelApi', () => ({
  createFunnelLead: vi.fn().mockResolvedValue({}),
}));
vi.mock('../lib/funnelTracking', () => ({
  trackFunnelEvent: vi.fn(),
  getFunnelVisitorId: vi.fn().mockReturnValue('visitor-b-1'),
}));
vi.mock('../components/marketing/FunnelOfferPanel', () => ({
  default: ({ funnelVariant }) => <div data-testid="offer-panel">oferta {funnelVariant}</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <FunilDiaDoMercado />
    </MemoryRouter>
  );

describe('FunilDiaDoMercado (/funil-b)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts the funnel and tracks the first step', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /simular meu dia/i }));

    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_funnel_start', { funnelVariant: 'B' });
    expect(screen.getByText(/a internet oscila/i)).toBeInTheDocument();
  });

  it('walks through the 5 scenarios and reaches the final screen with a score', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /simular meu dia/i }));

    await user.click(screen.getByRole('button', { name: /continuamos vendendo/i }));
    await user.click(screen.getByRole('button', { name: /confio bastante/i }));
    await user.click(screen.getByRole('button', { name: /no próprio sistema/i }));
    await user.click(screen.getByRole('button', { name: /já sai pelo fluxo do pdv/i }));
    await user.click(screen.getByRole('button', { name: /sim\. tenho visão consolidada/i }));

    expect(await screen.findByText(/resultado do teste/i)).toBeInTheDocument();
  });

  it('requires name and phone before submitting the lead, then shows the offer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /simular meu dia/i }));
    await user.click(screen.getByRole('button', { name: /continuamos vendendo/i }));
    await user.click(screen.getByRole('button', { name: /confio bastante/i }));
    await user.click(screen.getByRole('button', { name: /no próprio sistema/i }));
    await user.click(screen.getByRole('button', { name: /já sai pelo fluxo do pdv/i }));
    await user.click(screen.getByRole('button', { name: /sim\. tenho visão consolidada/i }));

    await user.click(screen.getByRole('button', { name: /ver plano indicado/i }));
    expect(screen.getByText(/preencha nome e whatsapp/i)).toBeInTheDocument();
    expect(createFunnelLead).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana');
    await user.type(screen.getByPlaceholderText('WhatsApp'), '11999990000');
    await user.click(screen.getByRole('button', { name: /ver plano indicado/i }));

    expect(await screen.findByTestId('offer-panel')).toHaveTextContent('oferta B');
    expect(createFunnelLead).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_id: 'visitor-b-1', funnel_variant: 'B', name: 'Ana', phone: '11999990000' })
    );
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'marketfy_lead_submit',
      expect.objectContaining({ funnelVariant: 'B' })
    );
  });
});
