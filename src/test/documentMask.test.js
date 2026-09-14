import { describe, expect, it } from 'vitest';
import { maskCpf, onlyDigits } from '../lib/documentMask';

describe('maskCpf', () => {
  it.each([
    ['', ''],
    ['123', '123'],
    ['1234', '123.4'],
    ['1234567', '123.456.7'],
    ['12345678901', '123.456.789-01'],
    ['123.456.789-01999', '123.456.789-01'],
    ['abc123', '123'],
  ])('masks %s as %s', (input, expected) => {
    expect(maskCpf(input)).toBe(expected);
  });

  it('extracts digits', () => {
    expect(onlyDigits('123.456.789-01')).toBe('12345678901');
  });
});
