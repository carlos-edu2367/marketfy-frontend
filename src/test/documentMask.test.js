import { describe, expect, it } from 'vitest';
import { maskCpf, onlyDigits, maskCnpj, maskDocument } from '../lib/documentMask';

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

describe('maskCnpj', () => {
  it.each([
    ['', ''],
    ['12', '12'],
    ['123456', '12.345.6'],
    ['123456789', '12.345.678/9'],
    ['12345678000195', '12.345.678/0001-95'],
    ['12.345.678/0001-95999', '12.345.678/0001-95'],
  ])('masks %s as %s', (input, expected) => {
    expect(maskCnpj(input)).toBe(expected);
  });
});

describe('maskDocument', () => {
  it('applies the CPF mask while the input has 11 digits or fewer', () => {
    expect(maskDocument('123')).toBe('123');
    expect(maskDocument('12345678901')).toBe('123.456.789-01');
  });

  it('switches to the CNPJ mask from the 12th digit on', () => {
    expect(maskDocument('123456789012')).toBe('12.345.678/9012');
    expect(maskDocument('12345678000195')).toBe('12.345.678/0001-95');
  });
});
