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

export function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** NCM com 8 dígitos exibido como 0000.00.00. */
export function maskNcm(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{4})(\d)/, '$1.$2').replace(/^(\d{4})\.(\d{2})(\d)/, '$1.$2.$3');
}
