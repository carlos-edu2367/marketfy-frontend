import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { 
  Search, Loader2, MessageSquare, 
  User, Mail, Send 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      // Tenta rota padrão documentada
      // Se der 404, verifique no backend (main.py) o prefixo do router_support
      const res = await api.get('/support/tickets/all');
      setTickets(res.data || []);
    } catch (error) {
      console.error("Erro ao carregar tickets:", error);
      // Se for 404, pode ser que a rota não exista ou o prefixo esteja diferente
      if (error.response?.status === 404) {
          toast.error("Endpoint de tickets não encontrado (404). Verifique a API.");
      } else {
          toast.error("Não foi possível carregar os chamados.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Scroll para última mensagem
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket]);

  const handleReply = async (e) => {
      e.preventDefault();
      if (!replyText.trim()) return;

      setIsSending(true);
      try {
          await api.post(`/support/tickets/${selectedTicket.id}/reply`, {
              content: replyText
          });
          
          toast.success("Resposta enviada!");
          setReplyText("");
          
          // Atualiza a lista e o ticket selecionado
          // Idealmente, o backend retornaria o ticket atualizado ou a nova mensagem
          // Aqui fazemos um fetch full para garantir
          const res = await api.get('/support/tickets/all');
          setTickets(res.data);
          const updated = res.data.find(t => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);

      } catch (error) {
          toast.error("Erro ao enviar resposta.");
      } finally {
          setIsSending(false);
      }
  };

  const filteredTickets = tickets.filter(t => 
      (filter === 'all' || t.status === filter) &&
      (t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
       t.id.includes(searchTerm))
  );

  const getStatusColor = (status) => {
      switch(status) {
          case 'aberto': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          case 'respondido': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'fechado': return 'bg-green-100 text-green-700 border-green-200';
          default: return 'bg-gray-100 text-gray-600';
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR: LISTA */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800 mb-4">Chamados de Suporte</h2>
              
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {['all', 'aberto', 'respondido', 'fechado'].map(st => (
                      <button 
                          key={st}
                          onClick={() => setFilter(st)}
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-colors ${
                              filter === st 
                              ? 'bg-slate-900 text-white' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                      >
                          {st === 'all' ? 'Todos' : st}
                      </button>
                  ))}
              </div>

              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                      placeholder="Buscar ticket..." 
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
              {loading ? (
                  <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : filteredTickets.length === 0 ? (
                  <p className="p-10 text-center text-slate-400">Nenhum chamado encontrado.</p>
              ) : (
                  filteredTickets.map(t => (
                      <div 
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedTicket?.id === t.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusColor(t.status)}`}>
                                  {t.status}
                              </span>
                              <span className="text-xs text-slate-400">{formatDate(t.created_at)}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 truncate">{t.subject}</h4>
                          <p className="text-sm text-slate-500 truncate mt-1">
                              {t.messages?.[0]?.content || "Sem mensagem inicial"}
                          </p>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* MAIN: CHAT */}
      <div className="flex-1 flex flex-col bg-slate-50">
          {selectedTicket ? (
              <>
                  {/* HEADER DO CHAT */}
                  <div className="bg-white border-b border-slate-200 p-6 flex justify-between items-center shadow-sm z-10">
                      <div>
                          <h2 className="text-xl font-bold text-slate-800">{selectedTicket.subject}</h2>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><User size={14}/> {selectedTicket.user_name || 'Usuário'}</span>
                              <span className="flex items-center gap-1"><Mail size={14}/> {selectedTicket.user_email || 'Email não disponível'}</span>
                          </div>
                      </div>
                      
                      <div className="flex gap-2">
                          <Button variant="secondary" size="sm">Marcar como Fechado</Button>
                      </div>
                  </div>

                  {/* MENSAGENS */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {selectedTicket.messages?.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.is_internal ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-2xl p-4 shadow-sm ${
                                  msg.is_internal 
                                  ? 'bg-blue-600 text-white rounded-tr-none' 
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                              }`}>
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  <p className={`text-[10px] mt-2 text-right opacity-70 ${msg.is_internal ? 'text-blue-100' : 'text-slate-400'}`}>
                                      {formatDate(msg.created_at)} • {msg.sender_name || (msg.is_internal ? 'Suporte' : 'Usuário')}
                                  </p>
                              </div>
                          </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>

                  {/* INPUT */}
                  <div className="p-4 bg-white border-t border-slate-200">
                      <form onSubmit={handleReply} className="flex gap-4">
                          <textarea
                              className="flex-1 border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                              rows="2"
                              placeholder="Escreva sua resposta..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => {
                                  if(e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleReply(e);
                                  }
                              }}
                          ></textarea>
                          <Button type="submit" variant="primary" className="h-auto px-6 rounded-xl bg-slate-900 text-white hover:bg-slate-800" isLoading={isSending}>
                              <Send size={18} />
                          </Button>
                      </form>
                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare size={64} className="mb-4 opacity-20" />
                  <p>Selecione um chamado para ver os detalhes</p>
              </div>
          )}
      </div>
    </div>
  );
}