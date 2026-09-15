import { Link } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import CookieConsentBanner from '../../components/CookieConsentBanner';

export default function LegalPageLayout({ title, updatedNote, children }) {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-brand-dark">
            <div className="bg-brand-yellow p-1.5 rounded-lg">
              <Store size={18} className="text-gray-900" />
            </div>
            <span className="font-black">Marketfy</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-black text-gray-950 mb-2">{title}</h1>
        {updatedNote && <p className="text-sm text-gray-400 mb-10">{updatedNote}</p>}
        <div className="space-y-6 text-[15px] leading-relaxed text-gray-700 [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-gray-950 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </main>

      <CookieConsentBanner />
    </div>
  );
}
