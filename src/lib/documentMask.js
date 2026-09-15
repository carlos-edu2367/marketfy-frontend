export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Formata CPF progressivamente enquanto o usuario digita: 000.000.000-00. */
export function maskCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** Formata CNPJ progressivamente enquanto o usuario digita: 00.000.000/0000-00. */
export function maskCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** Aplica mascara de CPF ate 11 digitos digitados; a partir do 12o, mascara de CNPJ. */
export function maskDocument(value) {
  const digits = onlyDigits(value);
  return digits.length <= 11 ? maskCpf(value) : maskCnpj(value);
}
