import { describe, expect, it } from 'vitest';
import api from '../lib/api';

const reject = (data, status = 422) => {
  const error = { response: { status, data }, config: { url: '/x' } };
  const handler = api.interceptors.response.handlers[0].rejected;
  return handler(error).catch((e) => e);
};

describe('normalização do envelope de erro', () => {
  it('copia error.message para detail', async () => {
    const e = await reject({ error: { message: 'CNPJ inválido' } }, 400);
    expect(e.response.data.detail).toBe('CNPJ inválido');
  });

  it('junta as mensagens de validação 422', async () => {
    const e = await reject({ error: { message: 'x', details: [{ msg: 'Campo A' }, { msg: 'Campo B' }] } });
    expect(e.response.data.detail).toBe('Campo A Campo B');
  });

  it('não sobrescreve detail existente', async () => {
    const e = await reject({ detail: 'original', error: { message: 'outra' } }, 400);
    expect(e.response.data.detail).toBe('original');
  });
});
