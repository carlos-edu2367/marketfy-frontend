import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
      <div className="bg-yellow-100 p-4 rounded-full text-yellow-600 mb-6">
        <AlertTriangle size={48} />
      </div>
      
      <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-700 mb-4">Página não encontrada</h2>
      
      <p className="text-gray-500 max-w-md mb-8">
        Ops! Parece que você tentou acessar uma rota que não existe ou foi movida.
      </p>

      <Button onClick={() => navigate('/dashboard')} variant="primary" size="lg">
        <Home size={18} />
        Voltar para o Início
      </Button>
    </div>
  );
}