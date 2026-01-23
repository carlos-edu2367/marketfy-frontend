import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FileText, Key, ShieldCheck, Upload, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FiscalSettings({ marketId }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  
  // Observa o arquivo para mostrar o nome
  const certFile = watch('certificate_file');

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/fiscal/${marketId}/config`);
      setConfig(data);
      
      // Preenche o formulário com dados existentes
      setValue('environment', data.environment);
      setValue('csc_id', data.csc_id);
      setValue('csc_token', ''); // Token é sensível, geralmente não retorna ou retorna mascarado. O user preenche se quiser mudar.
      setValue('default_ncm', data.default_ncm);
    } catch (error) {
      console.error("Erro ao carregar config fiscal:", error);
      toast.error("Não foi possível carregar as configurações fiscais.");
    } finally {
      setLoading(false);
    }
  }, [marketId, setValue]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const onSubmit = async (data) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('environment', data.environment);
      formData.append('csc_id', data.csc_id);
      formData.append('csc_token', data.csc_token);
      formData.append('certificate_password', data.certificate_password);
      if (data.default_ncm) formData.append('default_ncm', data.default_ncm);
      
      // Só anexa arquivo se o usuário selecionou um novo
      if (data.certificate_file && data.certificate_file.length > 0) {
        formData.append('certificate_file', data.certificate_file[0]);
      }

      await api.post(`/fiscal/${marketId}/config`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success("Configurações fiscais salvas com sucesso!");
      loadConfig(); // Recarrega para atualizar status do certificado
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Erro ao salvar configurações.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-brand-yellow" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-start gap-4 mb-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
        <ShieldCheck className="text-blue-600 shrink-0" size={24} />
        <div>
          <h3 className="font-bold text-blue-900">Emissão de NFC-e</h3>
          <p className="text-sm text-blue-700 mt-1">
            Para emitir notas fiscais, você precisa de um Certificado Digital A1 (arquivo .pfx) e do código CSC fornecido pela SEFAZ do seu estado.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        
        {/* AMBIENTE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Ambiente de Emissão</label>
                <select 
                    {...register('environment')} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-yellow outline-none bg-white"
                >
                    <option value="homologacao">Homologação (Testes)</option>
                    <option value="producao">Produção (Validade Jurídica)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Use &quot;Homologação&quot; para testar antes de emitir notas reais.</p>
            </div>

            <Input 
                label="NCM Padrão" 
                placeholder="Ex: 00000000" 
                {...register('default_ncm')}
                maxLength={8}
            />
        </div>

        <hr className="border-gray-100" />

        {/* CERTIFICADO */}
        <div>
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-gray-400"/> Certificado Digital (A1)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                    <input 
                        type="file" 
                        accept=".pfx" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        {...register('certificate_file')}
                    />
                    <Upload className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                        {certFile && certFile.length > 0 ? certFile[0].name : "Clique para selecionar o arquivo .pfx"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Tamanho máx: 2MB</p>
                </div>

                <div className="space-y-4">
                    <Input 
                        label="Senha do Certificado" 
                        type="password" 
                        icon={Key} 
                        placeholder="••••••"
                        {...register('certificate_password', { 
                            required: !config?.has_certificate // Obrigatório apenas se não tiver um salvo
                        })}
                        error={errors.certificate_password && "Senha obrigatória para novo certificado"}
                    />
                    
                    {config?.has_certificate && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg text-sm font-medium">
                            <CheckCircle size={16} /> Certificado Ativo no Sistema
                        </div>
                    )}
                </div>
            </div>
        </div>

        <hr className="border-gray-100" />

        {/* CSC */}
        <div>
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Key size={18} className="text-gray-400"/> Dados do CSC (Token SEFAZ)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                    label="ID do Token (CSC ID)" 
                    placeholder="Ex: 000001" 
                    {...register('csc_id', { required: true })}
                />
                <Input 
                    label="Código CSC (Token)" 
                    placeholder="Ex: A1B2C3D4..." 
                    type="password"
                    {...register('csc_token', { 
                        required: !config?.csc_id // Assume que se tem ID, tem token salvo. Mas melhor pedir se editar.
                    })}
                />
            </div>
        </div>

        <div className="pt-4">
            <Button type="submit" variant="primary" size="lg" isLoading={uploading}>
                Salvar Configurações
            </Button>
        </div>

      </form>
    </div>
  );
}