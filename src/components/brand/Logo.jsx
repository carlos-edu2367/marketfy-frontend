import { Link } from 'react-router-dom';

/**
 * Identidade visual SGM Marketfy.
 * - `LogoMark`: carrinho com gráfico sobre quadrado amarelo arredondado.
 * - `Logo`: marca + wordmark "Marketfy" (link para a home).
 * - `LogoBadge`: a logo completa (squircle com "SGM Marketfy").
 */
export function LogoMark({ size = 40, className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-brand-yellow ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
      aria-hidden="true"
    >
      <img
        src="/logo-mark.png"
        alt=""
        draggable="false"
        style={{ width: size * 0.82, height: 'auto' }}
      />
    </span>
  );
}

export function LogoBadge({ size = 96, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="SGM Marketfy"
      width={size}
      height={size}
      draggable="false"
      className={className}
      style={{ borderRadius: size * 0.22 }}
    />
  );
}

export default function Logo({ to = '/', size = 40, tone = 'dark', className = '' }) {
  const text = tone === 'light' ? 'text-white' : 'text-brand-ink';
  const content = (
    <>
      <LogoMark size={size} />
      <span className={`font-display font-black leading-none tracking-tight ${text}`} style={{ fontSize: size * 0.58 }}>
        Marketfy
      </span>
    </>
  );
  const cls = `inline-flex items-center gap-2.5 ${className}`;
  return to ? <Link to={to} aria-label="Marketfy — página inicial" className={cls}>{content}</Link> : <span className={cls}>{content}</span>;
}
