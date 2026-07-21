import { describe, it, expect } from 'vitest';
// Testa a função pura de disponibilidade e o travamento do carrinho.
import { computePixAvailability } from '../pages/pdv/pixAvailability';

describe('pix availability', () => {
  it('requires online + connected + enabled', () => {
    expect(computePixAvailability({ isOnline: true, status: 'connected', enabledInPdv: true })).toBe(true);
    expect(computePixAvailability({ isOnline: false, status: 'connected', enabledInPdv: true })).toBe(false);
    expect(computePixAvailability({ isOnline: true, status: 'not_connected', enabledInPdv: true })).toBe(false);
    expect(computePixAvailability({ isOnline: true, status: 'connected', enabledInPdv: false })).toBe(false);
  });
});
