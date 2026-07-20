import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../lib/api';
import { useFiscalStatus } from '../hooks/useFiscalStatus';

vi.mock('../lib/api', () => ({
  default: { get: vi.fn() },
}));

function PollingProbe() {
  const { isPolling } = useFiscalStatus({
    marketId: 'market-1',
    saleId: 'sale-1',
    enabled: true,
    maxDurationMs: 60_000,
  });

  return <output>{isPolling ? 'polling' : 'stopped'}</output>;
}

describe('useFiscalStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles a polling error in a browser without a process global', async () => {
    let rejectRequest;
    api.get.mockReturnValue(new Promise((_, reject) => {
      rejectRequest = reject;
    }));

    render(<PollingProbe />);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

    vi.stubGlobal('process', undefined);
    rejectRequest(new Error('network unavailable'));
    await Promise.resolve();
    await Promise.resolve();
    vi.unstubAllGlobals();

    expect(screen.getByText('polling')).toBeInTheDocument();
  });
});
