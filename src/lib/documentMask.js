export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Formata CPF progressivamente enquanto o usuario digita: 000.000.000-00. */
export function maskCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
