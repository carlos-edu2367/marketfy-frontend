import { useEffect, useState } from 'react';
import { initAnalytics } from '../lib/analytics';

const CONSENT_KEY = 'marketfy_cookie_consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch {
      stored = null;
    }
    setVisible(!stored);
  }, []);

  const store = (value) => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // localStorage indisponível (modo privado etc.) — segue sem persistir a escolha
    }
  };

  const handleAccept = () => {
    store('accepted');
    initAnalytics();
    setVisible(false);
  };

  const handleDecline = () => {
    store('declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-2xl bg-brand-ink px-5 py-4 text-white shadow-2xl sm:flex-row sm:justify-between sm:px-6"
    >
      <p className="text-sm font-medium text-white/80">
        Usamos cookies para entender como você usa o Marketfy e melhorar o produto. Você pode recusar sem perder acesso ao site.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleDecline}
          className="rounded-xl border-2 border-white/25 px-4 py-2 text-sm font-bold text-white hover:border-white/60"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-xl border-2 border-brand-yellow bg-brand-yellow px-4 py-2 text-sm font-bold text-brand-ink hover:bg-brand-yellowHover"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
