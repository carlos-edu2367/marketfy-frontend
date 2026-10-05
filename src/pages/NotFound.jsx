import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { LogoBadge } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="mf-grid-bg min-h-screen flex flex-col items-center justify-center p-4 bg-brand-yellow text-center">
      <LogoBadge size={96} className="mb-6 shadow-sticker ring-2 ring-brand-ink" />

      <h1 className="font-display text-8xl font-black text-brand-ink mb-2">404</h1>
      <h2 className="text-2xl font-black text-brand-ink mb-4">Página não encontrada</h2>

      <p className="text-brand-ink/70 font-medium max-w-md mb-8">
        Ops! Parece que você tentou acessar uma rota que não existe ou foi movida.
      </p>

      <Button onClick={() => navigate('/dashboard')} variant="ink" size="lg" className="rounded-2xl">
        <Home size={18} />
        Voltar para o Início
      </Button>
    </div>
  );
}
