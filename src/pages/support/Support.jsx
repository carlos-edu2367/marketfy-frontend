import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MessageSquare, Send, Plus, List, ChevronRight, User, ArrowLeft } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function Support() {
  const [view, setView] = useState('list'); // 'list', 'new', 'detail'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();
  const messagesEndRef = useRef(null);

  // 1. Listar Meus Tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/support/tickets');
      setTickets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket]);

  // 2. Criar Ticket
  const handleCreate = async (data) => {
    try {
      await api.post('/support/tickets', {
        ...data,
        priority: 'media'
      });
      toast.success('Chamado aberto com sucesso!');
      reset();
      fetchTickets();
      setView('list');
    } catch (error) {
      toast.error('Erro ao abrir chamado.');
    }
  };

  // 3. Responder
  const handleReply = async (e) => {
      e.preventDefault();
      if (!replyText.trim()) return;

      try {
          await api.post(`/support/tickets/${selectedTicket.id}/reply`, { content: replyText });
          
          // Simula atualização local ou recarrega
          const newMsg = {
              content: replyText,
              is_internal: false,
              created_at: new Date().toISOString(),
              sender_name: "Você"
          };
          
          setSelectedTicket(prev => ({
              ...prev,
              messages: [...(prev.messages || []), newMsg]
          }));
          
          setReplyText("");
      } catch (error) {
          toast.error("Erro ao enviar resposta.");
      }
  };

  // --- RENDERS ---

  if (view === 'new') {
      return (
        <div className="max-w-2xl mx-auto p-6">
            <Button variant="ghost" onClick={() => setView('list')} className="mb-4 pl-0">
                <ArrowLeft size={18} /> Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Novo Chamado</h1>
            <p className="text-gray-500 mb-8">Descreva seu problema para nossa equipe.</p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
                    <Input label="Assunto" placeholder="Ex: Erro ao emitir nota" {...register('subject', { required: true })} />
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Mensagem</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-yellow outline-none min-h-[120px]"
                            placeholder="Descreva detalhadamente..."
                            {...register('message', { required: true })}
                        ></textarea>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button variant="primary" isLoading={isSubmitting}>
                            <Send size={18} /> Enviar Chamado
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      );
  }

  if (view === 'detail' && selectedTicket) {
      return (
          <div className="max-w-3xl mx-auto p-4 h-[calc(100vh-100px)] flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                  <Button variant="ghost" onClick={() => setView('list')}>
                      <ArrowLeft size={18} /> Voltar
                  </Button>
                  <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h2>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase font-bold">
                          {selectedTicket.status}
                      </span>
                  </div>
              </div>

              <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                      {selectedTicket.messages?.map((msg, i) => (
                          <div key={i} className={`flex ${msg.is_internal ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm ${
                                  msg.is_internal 
                                  ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none' 
                                  : 'bg-brand-yellow text-brand-dark rounded-tr-none'
                              }`}>
                                  <p className="font-bold text-xs mb-1 opacity-70">
                                       • {formatDate(msg.created_at)}
                                  </p>
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                              </div>
                          </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 bg-white border-t border-gray-100">
                      <form onSubmit={handleReply} className="flex gap-2">
                          <input 
                              className="flex-1 border border-gray-300 rounded-lg p-3 outline-none focus:border-brand-yellow"
                              placeholder="Digite sua resposta..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                          />
                          <Button type="submit" variant="primary">
                              <Send size={18} />
                          </Button>
                      </form>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Meus Chamados</h1>
                <p className="text-gray-500">Histórico de atendimento e suporte.</p>
            </div>
            <Button onClick={() => setView('new')}>
                <Plus size={18} /> Novo Chamado
            </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
                <div className="p-10 text-center text-gray-400">Carregando...</div>
            ) : tickets.length === 0 ? (
                <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                    <MessageSquare size={48} className="mb-2 opacity-20" />
                    <p>Você ainda não tem chamados abertos.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {tickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => { setSelectedTicket(ticket); setView('detail'); }}
                            className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-2 rounded-full ${ticket.status === 'aberto' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-brand-dark transition-colors">{ticket.subject}</h3>
                                    <p className="text-xs text-gray-500">
                                        Atualizado em {formatDate(ticket.updated_at || ticket.created_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                                    ticket.status === 'aberto' ? 'bg-yellow-100 text-yellow-700' : 
                                    ticket.status === 'respondido' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {ticket.status}
                                </span>
                                <ChevronRight size={18} className="text-gray-300" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}