import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projectCreditsRunway } from '../lib/fiscalProjection';
import CreditsRunwayNotice from '../components/fiscal/CreditsRunwayNotice';

const now = new Date(2026, 8, 10, 12); // 10/09/2026 12h

describe('projectCreditsRunway', () => {
  it('projects days left from this month usage pace', () => {
    // 100 emissoes em 10 dias iniciados = 10/dia; 50 restantes = 5 dias; faltam 21 dias no mes.
    expect(projectCreditsRunway({ period: '202609', usedCount: 100, remaining: 50, now })).toEqual({
      dailyRate: 10,
      daysLeft: 5,
      daysUntilPeriodEnd: 21,
      runsOutBeforePeriodEnd: true,
    });
  });

  it('does not warn when the balance lasts until the end of the month', () => {
    const result = projectCreditsRunway({ period: '202609', usedCount: 10, remaining: 500, now });
    expect(result.runsOutBeforePeriodEnd).toBe(false);
  });

  it('has no pace to project without usage', () => {
    expect(projectCreditsRunway({ period: '202609', usedCount: 0, remaining: 50, now })).toMatchObject({
      dailyRate: 0, daysLeft: null, runsOutBeforePeriodEnd: false,
    });
  });

  it('returns null for a malformed period or a date outside of it', () => {
    expect(projectCreditsRunway({ period: '2026-09', usedCount: 1, remaining: 1, now })).toBeNull();
    expect(projectCreditsRunway({ period: '202608', usedCount: 1, remaining: 1, now })).toBeNull();
  });
});

describe('CreditsRunwayNotice', () => {
  it('warns how many days are left when credits run out before month end', () => {
    render(<CreditsRunwayNotice period="202609" usedCount={100} remaining={50} now={now} />);
    expect(screen.getByRole('status')).toHaveTextContent(/acabam em cerca de 5 dias/i);
  });

  it('renders nothing when there is no risk', () => {
    const { container } = render(<CreditsRunwayNotice period="202609" usedCount={10} remaining={500} now={now} />);
    expect(container).toBeEmptyDOMElement();
  });
});
