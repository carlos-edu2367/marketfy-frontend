import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import CookieConsentBanner from '../../components/CookieConsentBanner';

export default function LegalPageLayout({ title, updatedNote, children }) {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-ink">
      <header className="border-b-2 border-brand-ink bg-brand-yellow px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo size={38} />
          <Link to="/" className="flex items-center gap-1.5 text-sm font-bold hover:underline">
            <ArrowLeft size={16} /> Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="inline-block bg-brand-yellow px-3 text-4xl font-black mb-3">{title}</h1>
        {updatedNote && <p className="text-sm text-gray-400 mb-10">{updatedNote}</p>}
        <div className="space-y-6 text-[15px] leading-relaxed text-gray-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-brand-ink [&_h2]:border-l-4 [&_h2]:border-brand-yellow [&_h2]:pl-3 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </main>

      <CookieConsentBanner />
    </div>
  );
}
