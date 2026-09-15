import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunilDiagnostico from '../pages/marketing/FunilDiagnostico';
import { createFunnelLead } from '../lib/marketingFunnelApi';
import { trackFunnelEvent, getFunnelVisitorId } from '../lib/funnelTracking';

vi.mock('../lib/marketingFunnelApi', () => ({
  createFunnelLead: vi.fn().mockResolvedValue({}),
}));
vi.mock('../lib/funnelTracking', () => ({
  trackFunnelEvent: vi.fn(),
  getFunnelVisitorId: vi.fn().mockReturnValue('visitor-a-1'),
}));
vi.mock('../components/marketing/FunnelOfferPanel', () => ({
  default: ({ funnelVariant }) => <div data-testid="offer-panel">oferta {funnelVariant}</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <FunilDiagnostico />
    </MemoryRouter>
  );

async function answerAllQuestions(user) {
  await user.click(screen.getByRole('button', { name: /começar meu diagnóstico/i }));
  // 10 perguntas de múltipla escolha — sempre a primeira opção (menor dor)
  for (let i = 0; i < 10; i += 1) {
    const options = screen.getAllByRole('button');
    await user.click(options[0]);
  }
}

describe('FunilDiagnostico (/funil-a)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts the funnel and tracks the first question', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /começar meu diagnóstico/i }));

    expect(trackFunnelEvent).toHaveBeenCalledWith('marketfy_funnel_start', { funnelVariant: 'A' });
    expect(screen.getByText(/qual negócio você administra hoje/i)).toBeInTheDocument();
  });

  it('walks through all 10 questions and reaches the lead form', async () => {
    const user = userEvent.setup();
    renderPage();

    await answerAllQuestions(user);

    expect(screen.getByText(/para onde enviamos sua recomendação/i)).toBeInTheDocument();
  });

  it('requires name and (phone or email), then shows the analysis, result and offer', async () => {
    const user = userEvent.setup();
    renderPage();
    await answerAllQuestions(user);

    await user.click(screen.getByRole('button', { name: /analisar meu perfil/i }));
    expect(screen.getByText(/preencha seu nome e pelo menos whatsapp ou e-mail/i)).toBeInTheDocument();
    expect(createFunnelLead).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Seu nome'), 'Ana');
    await user.type(screen.getByPlaceholderText('WhatsApp'), '11999990000');
    await user.click(screen.getByRole('button', { name: /analisar meu perfil/i }));

    expect(createFunnelLead).toHaveBeenCalledWith(
      expect.objectContaining({ visitor_id: 'visitor-a-1', funnel_variant: 'A', name: 'Ana', phone: '11999990000' })
    );
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'marketfy_lead_submit',
      expect.objectContaining({ funnelVariant: 'A' })
    );

    const resultHeading = await screen.findByText(/você já tem uma boa base/i, {}, { timeout: 2000 });
    expect(resultHeading).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver minha recomendação/i }));
    expect(await screen.findByTestId('offer-panel')).toHaveTextContent('oferta A');
  });
});
