import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import {
  FUNNEL_HELPER_SCRIPT, SANDBOX, buildSrcdoc, claimFunnelSession, finishUrl, parseFunnelMessage,
  readCheckoutFsid, readFsid, readUtms, rememberCheckoutFsid, saveFsid, sendFunnelEvent,
} from '../lib/funnels';

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

describe('lib/funnels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists fsid per slug and for checkout', () => {
    saveFsid('oferta', 'abc');
    expect(readFsid('oferta')).toBe('abc');
    expect(readFsid('outro')).toBeNull();
    rememberCheckoutFsid('abc');
    expect(readCheckoutFsid()).toBe('abc');
  });

  it('reads only known utm params', () => {
    expect(readUtms('?utm_source=meta&utm_campaign=bf&x=1')).toEqual({ utm_source: 'meta', utm_campaign: 'bf' });
  });

  it('builds srcdoc with tracking, helper and step html', () => {
    const doc = buildSrcdoc({ html: '<p>oi</p>', trackingHtml: '<script>px()</script>' });
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<script>px()</script>');
    expect(doc).toContain(FUNNEL_HELPER_SCRIPT);
    expect(doc.indexOf(FUNNEL_HELPER_SCRIPT)).toBeLessThan(doc.indexOf('<p>oi</p>'));
  });

  it('never grants same-origin or top navigation', () => {
    expect(SANDBOX).not.toMatch(/allow-same-origin|allow-top-navigation/);
  });

  it('accepts only well-formed messages from the frame', () => {
    const frame = {};
    const ok = (type, source = frame) => parseFunnelMessage({ source, data: { source: 'marketfy-funnel', type } }, frame);
    expect(ok('next')).toBe('next');
    expect(ok('finish')).toBe('finish');
    expect(ok('steal')).toBeNull();
    expect(ok('next', {})).toBeNull();
    expect(parseFunnelMessage({ source: frame, data: 'next' }, frame)).toBeNull();
    expect(parseFunnelMessage({ source: frame, data: { source: 'x', type: 'next' } }, frame)).toBeNull();
  });

  it('builds finish urls', () => {
    expect(finishUrl({ planId: 'p1', fsid: 'f1', loggedIn: false })).toBe('/register?plan=p1&fsid=f1');
    expect(finishUrl({ planId: 'p1', fsid: 'f1', loggedIn: true })).toBe('/plans?plan=p1&fsid=f1');
    expect(finishUrl({ planId: null, fsid: 'f1', loggedIn: false })).toBe('/register?fsid=f1');
  });

  it('retries an event once and then gives up silently', async () => {
    api.post.mockRejectedValue(new Error('net'));
    await expect(sendFunnelEvent({ fsid: 'f', type: 'step_view', step_position: 0 })).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('claim never throws', async () => {
    api.post.mockRejectedValue(new Error('401'));
    await expect(claimFunnelSession('f')).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledWith('/funnels/sessions/f/claim');
  });
});
