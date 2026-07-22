import { describe, it, expect, vi } from 'vitest';
import api, * as apiModule from '../lib/api';

vi.mock('axios', () => {
  const inst = { get: vi.fn(() => Promise.resolve({ data: {} })),
                 post: vi.fn(() => Promise.resolve({ data: {} })),
                 delete: vi.fn(() => Promise.resolve({ data: {} })),
                 put: vi.fn(() => Promise.resolve({ data: {} })),
                 interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
  return { default: { create: () => inst } };
});

describe('pix api', () => {
  it('createPixQr posts items without amount', async () => {
    await apiModule.createPixQr('m1', { terminal_id: 't1', box_id: 'b1', items: [{ product_id: 'p1', quantity: 2 }] });
    expect(api.post).toHaveBeenCalledWith('/pix/m1/qr',
      { terminal_id: 't1', box_id: 'b1', items: [{ product_id: 'p1', quantity: 2 }] });
  });
  it('pixEventsUrl builds the stream path', () => {
    expect(apiModule.pixEventsUrl('m1', 'a1')).toContain('/pix/m1/attempts/a1/events');
  });
  it('reads and saves the market Pix location through the API', async () => {
    await apiModule.getPixLocation('m1');
    await apiModule.savePixLocation('m1', { postal_code: '01001000' });
    await apiModule.lookupAddressByCep('01001000');
    expect(api.get).toHaveBeenCalledWith('/pix/m1/location');
    expect(api.put).toHaveBeenCalledWith('/pix/m1/location', { postal_code: '01001000' });
    expect(api.get).toHaveBeenCalledWith('/pix/address/cep/01001000');
  });
});
