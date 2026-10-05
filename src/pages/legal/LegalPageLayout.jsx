import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../../components/brand/Logo';
import CookieConsentBanner from '../../components/CookieConsentBanner';

export default function LegalPageLayout({ title, updatedNote, children }) {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-ink">
      <header className="border-b border-brand-ink/10 bg-brand-cream px-5 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo size={34} />
          <Link to="/" className="flex items-center gap-1.5 text-sm font-bold hover:underline">
            <ArrowLeft size={16} /> Voltar ao início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-14">
        <h1 className="mb-3 text-3xl font-black sm:text-4xl"><span className="mf-marker">{title}</span></h1>
        {updatedNote && <p className="text-sm text-gray-500 mb-10">{updatedNote}</p>}
        <div className="space-y-6 text-[15px] leading-relaxed text-gray-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-brand-ink [&_h2]:border-l-4 [&_h2]:border-brand-yellow [&_h2]:pl-3 [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
          {children}
        </div>
      </main>

      <CookieConsentBanner />
    </div>
  );
}
