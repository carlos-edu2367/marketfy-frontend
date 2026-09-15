import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FunnelProgressBar from '../components/marketing/FunnelProgressBar';
import FunnelScoreRing from '../components/marketing/FunnelScoreRing';

describe('FunnelProgressBar', () => {
  it('shows the current step label and computed percentage', () => {
    render(<FunnelProgressBar current={3} total={5} label="pergunta 3 de 5" />);
    expect(screen.getByText('pergunta 3 de 5')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});

describe('FunnelScoreRing', () => {
  it('shows the score and the default label', () => {
    render(<FunnelScoreRing score={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('controle / 100')).toBeInTheDocument();
  });
});
