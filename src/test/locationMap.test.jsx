import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LocationMap from '../components/settings/LocationMap';

describe('LocationMap', () => {
  it('renders an accessible map region and drag guidance', () => {
    render(<LocationMap latitude={-23.55} longitude={-46.63} onChange={() => {}} />);
    expect(screen.getByRole('region', { name: /mapa da localização/i })).toBeInTheDocument();
    expect(screen.getByText(/arraste o marcador/i)).toBeInTheDocument();
  });
});
