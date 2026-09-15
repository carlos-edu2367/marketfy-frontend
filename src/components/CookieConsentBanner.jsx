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
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 border-t border-gray-200 bg-white px-5 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:flex-row sm:justify-between sm:px-8"
    >
      <p className="text-sm text-gray-600">
        Usamos cookies para entender como você usa o Marketfy e melhorar o produto. Você pode recusar sem perder acesso ao site.
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleDecline}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
