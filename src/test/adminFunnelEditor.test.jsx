import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FunnelEditor from '../pages/admin/funnels/FunnelEditor';
import api from '../lib/api';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getApiErrorMessage: (e, fallback) => e?.response?.data?.detail?.message || fallback || 'erro',
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
import toast from 'react-hot-toast';

const detail = {
  funnel: { id: 'f1', slug: 'oferta', name: 'Oferta', status: 'draft', plan_id: 'p1', tracking_html: '' },
  variants: [
    { id: 'v1', name: 'A', weight: 100, is_active: true, position: 0,
      steps: [{ id: 's1', position: 0, name: 'Intro', html: '<p>Intro</p>' },
              { id: 's2', position: 1, name: 'Oferta', html: '<p>Oferta</p>' }] },
  ],
  session_count: 0,
};

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={['/admin/funnels/f1']}>
      <Routes><Route path="/admin/funnels/:funnelId" element={<FunnelEditor />} /></Routes>
    </MemoryRouter>,
  );
}

describe('FunnelEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/admin/funnels/f1') return Promise.resolve({ data: detail });
      if (url === '/admin/plans') return Promise.resolve({ data: [{ id: 'p1', name: 'Pro', is_active: true }] });
      return Promise.resolve({ data: {} });
    });
    api.patch.mockResolvedValue({ data: { step: detail.variants[0].steps[0], warnings: [] } });
    api.post.mockResolvedValue({ data: detail });
    api.put.mockResolvedValue({ data: { warnings: ['Este funil já tem tráfego: alterar etapas afeta as métricas por etapa.'] } });
  });

  it('saves config including tracking html', async () => {
    const user = userEvent.setup();
    renderEditor();
    const tracking = await screen.findByLabelText(/scripts de rastreamento/i);
    await user.type(tracking, 'px');
    await user.click(screen.getByRole('button', { name: /salvar configuração/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/funnels/f1', expect.objectContaining({
      name: 'Oferta', slug: 'oferta', plan_id: 'p1', tracking_html: 'px',
    })));
  });

  it('shows publish errors from the api', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 422, data: { detail: {
      code: 'funnel.publish_invalid', message: 'O funil não pode ser publicado.', errors: ['A variante \'A\' não tem etapas.'],
    } } } });
    const user = userEvent.setup();
    renderEditor();
    await user.click(await screen.findByRole('button', { name: /^publicar$/i }));
    expect(await screen.findByText("A variante 'A' não tem etapas.")).toBeInTheDocument();
  });

  it('edits step html with live preview and saves it', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(await screen.findByRole('tab', { name: /etapas/i }));
    const editor = await screen.findByLabelText(/html da etapa/i);
    expect(screen.getByTitle(/prévia da etapa/i).getAttribute('srcdoc')).toContain('<p>Intro</p>');
    await user.clear(editor);
    await user.click(editor);
    await user.paste('<h1>Novo</h1>');
    expect(screen.getByTitle(/prévia da etapa/i).getAttribute('srcdoc')).toContain('<h1>Novo</h1>');
    await user.click(screen.getByRole('button', { name: /salvar etapa/i }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/funnels/steps/s1', { name: 'Intro', html: '<h1>Novo</h1>' }));
  });

  it('reorders steps and surfaces warnings', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(await screen.findByRole('tab', { name: /etapas/i }));
    const list = await screen.findByRole('list', { name: /etapas da variante/i });
    await user.click(within(list).getByRole('button', { name: /mover oferta para cima/i }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/admin/funnels/variants/v1/steps/order', { step_ids: ['s2', 's1'] }));
    expect(toast.error).not.toHaveBeenCalled();
    expect(await screen.findByText(/já tem tráfego/i)).toBeInTheDocument();
  });

  it('changes a variant weight', async () => {
    api.patch.mockResolvedValueOnce({ data: { variant: { ...detail.variants[0], weight: 50 }, warnings: [] } });
    const user = userEvent.setup();
    renderEditor();
    await user.click(await screen.findByRole('tab', { name: /etapas/i }));
    const weight = await screen.findByLabelText(/peso da variante a/i);
    await user.clear(weight);
    await user.type(weight, '50');
    await user.tab();
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/funnels/variants/v1', { weight: 50 }));
  });
});
