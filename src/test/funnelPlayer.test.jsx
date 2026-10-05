import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunnelPlayer from '../pages/funnels/FunnelPlayer';
import * as funnels from '../lib/funnels';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});
let authUser = null;
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: authUser, loading: false }) }));
vi.mock('../lib/funnels', async () => {
  const actual = await vi.importActual('../lib/funnels');
  return {
    ...actual,
    startFunnelSession: vi.fn(),
    sendFunnelEvent: vi.fn().mockResolvedValue(undefined),
    getFunnelPreview: vi.fn(),
  };
});

const session = {
  fsid: 'fs-1', funnel: { name: 'Oferta', plan_id: 'plan-1' }, variant: { id: 'v1' }, tracking_html: '',
  steps: [{ position: 0, name: 'Intro', html: '<p>Intro</p>' }, { position: 1, name: 'Oferta', html: '<p>Oferta</p>' }],
  resume_position: 0,
};

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/f/:slug" element={<FunnelPlayer />} /></Routes>
    </MemoryRouter>,
  );
}

function postFromFrame(type) {
  const frame = screen.getByTitle(/etapa/i);
  act(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: { source: 'marketfy-funnel', type }, source: frame.contentWindow,
    }));
  });
}

describe('FunnelPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    authUser = null;
    funnels.startFunnelSession.mockResolvedValue(session);
  });

  it('starts a session with utms, stores fsid and logs the first view', async () => {
    renderAt('/f/oferta?utm_source=meta');
    await screen.findByTitle('Etapa 1 de 2');
    expect(funnels.startFunnelSession).toHaveBeenCalledWith('oferta', expect.objectContaining({ utm_source: 'meta', fsid: null }));
    expect(localStorage.getItem('funnel:oferta')).toBe('fs-1');
    await waitFor(() => expect(funnels.sendFunnelEvent).toHaveBeenCalledWith(
      { fsid: 'fs-1', type: 'step_view', step_position: 0 },
    ));
    const frame = screen.getByTitle('Etapa 1 de 2');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups');
  });

  it('resumes with the stored fsid', async () => {
    localStorage.setItem('funnel:oferta', 'fs-1');
    renderAt('/f/oferta');
    await screen.findByTitle('Etapa 1 de 2');
    expect(funnels.startFunnelSession).toHaveBeenCalledWith('oferta', expect.objectContaining({ fsid: 'fs-1' }));
  });

  it('advances on next and finishes into register with fsid', async () => {
    renderAt('/f/oferta');
    await screen.findByTitle('Etapa 1 de 2');
    postFromFrame('next');
    await screen.findByTitle('Etapa 2 de 2');
    expect(funnels.sendFunnelEvent).toHaveBeenCalledWith({ fsid: 'fs-1', type: 'step_next', step_position: 0 });
    postFromFrame('next');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/register?plan=plan-1&fsid=fs-1'));
    expect(funnels.sendFunnelEvent).toHaveBeenCalledWith({ fsid: 'fs-1', type: 'funnel_completed' });
    expect(sessionStorage.getItem('funnel_fsid')).toBe('fs-1');
  });

  it('sends logged users to plans', async () => {
    authUser = { id: 'u1', role: 'owner' };
    renderAt('/f/oferta');
    await screen.findByTitle('Etapa 1 de 2');
    postFromFrame('finish');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/plans?plan=plan-1&fsid=fs-1'));
  });

  it('ignores messages from other windows', async () => {
    renderAt('/f/oferta');
    await screen.findByTitle('Etapa 1 de 2');
    act(() => {
      window.dispatchEvent(new MessageEvent('message', { data: { source: 'marketfy-funnel', type: 'next' }, source: window }));
    });
    expect(screen.getByTitle('Etapa 1 de 2')).toBeInTheDocument();
  });

  it('shows not found when the funnel is unavailable', async () => {
    funnels.startFunnelSession.mockRejectedValue({ response: { status: 404 } });
    renderAt('/f/nada');
    expect(await screen.findByText(/funil não encontrado/i)).toBeInTheDocument();
  });

  it('preview mode loads the variant and records nothing', async () => {
    authUser = { id: 'a', role: 'admin' };
    funnels.getFunnelPreview.mockResolvedValue({ funnel: session.funnel, tracking_html: '', steps: session.steps });
    renderAt('/f/oferta?preview=v1');
    await screen.findByTitle('Etapa 1 de 2');
    expect(screen.getByText(/prévia/i)).toBeInTheDocument();
    postFromFrame('next');
    await screen.findByTitle('Etapa 2 de 2');
    expect(funnels.startFunnelSession).not.toHaveBeenCalled();
    expect(funnels.sendFunnelEvent).not.toHaveBeenCalled();
  });
});
