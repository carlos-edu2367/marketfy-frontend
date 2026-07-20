import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  FileText, Key, ShieldCheck, Upload, CheckCircle, 
  Loader2, Building, MapPin, Settings as SettingsIcon, HelpCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import FiscalCenter from '../fiscal/FiscalCenter';

export default function FiscalSettings({ marketId }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
  
  // Observa o arquivo para mostrar o nome
  const certFile = watch('certificate_file');

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/fiscal/${marketId}/config`);
      setConfig(data);
      
      // Preenche o formulário com dados existentes
      setValue('environment', data.environment || 'homologacao');
      setValue('csc_id', data.csc_id || '');
      setValue('csc_token', ''); // Token é sensível
      setValue('default_ncm', data.default_ncm || '');
      setValue('default_cfop', data.default_cfop || '5102');
      setValue('default_csosn', data.default_csosn || '102');
      setValue('legal_name', data.legal_name || '');
      setValue('trade_name', data.trade_name || '');
      setValue('cnpj', data.cnpj || '');
      setValue('state_registration', data.state_registration || '');
      setValue('tax_regime', data.tax_regime || 'simples_nacional');
      setValue('crt', data.crt || '1');
      setValue('nfce_series', data.nfce_series || 1);

      if (data.address_json) {
        try {
          const addr = typeof data.address_json === 'string' ? JSON.parse(data.address_json) : data.address_json;
          setValue('street', addr.street || '');
          setValue('number', addr.number || '');
          setValue('complement', addr.complement || '');
          setValue('district', addr.district || '');
          setValue('zip_code', addr.zip_code || '');
          setValue('city_name', addr.city_name || '');
          setValue('uf', addr.uf || '');
          setValue('city_code', addr.city_code || '');
        } catch (e) {
          console.error("Erro ao fazer parse do endereço:", e);
        }
      }
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

  // Máscaras de Inputs
  const handleCNPJChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const maskedValue = value
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
    setValue('cnpj', maskedValue);
  };

  const handleCEPChange = async (e) => {
    const value = e.target.value.replace(/\D/g, '');
    const maskedValue = value.replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    setValue('zip_code', maskedValue);

    if (value.length === 8) {
      const toastId = toast.loading('Buscando CEP...');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const addressData = await res.json();
        toast.dismiss(toastId);
        if (!addressData.erro) {
          setValue('street', addressData.logradouro || '');
          setValue('district', addressData.bairro || '');
          setValue('city_name', addressData.localidade || '');
          setValue('uf', addressData.uf || '');
          setValue('city_code', addressData.ibge || '');
          toast.success('Endereço preenchido automaticamente!');
        } else {
          toast.error('CEP não encontrado.');
        }
      } catch (err) {
        toast.dismiss(toastId);
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const onSubmit = async (data) => {
    const syncToastId = 'fiscal-sync-toast';
    try {
      setSaving(true);
      toast.loading("Salvando configurações fiscais locais...", { id: syncToastId });
      
      const formData = new FormData();
      formData.append('environment', data.environment);
      formData.append('legal_name', data.legal_name);
      formData.append('trade_name', data.trade_name || '');
      formData.append('cnpj', data.cnpj.replace(/\D/g, ''));
      formData.append('state_registration', data.state_registration);
      formData.append('tax_regime', data.tax_regime);
      formData.append('crt', data.crt);
      formData.append('csc_id', data.csc_id);
      
      if (data.csc_token?.trim()) formData.append('csc_token', data.csc_token.trim());
      if (data.certificate_password?.trim()) formData.append('certificate_password', data.certificate_password);
      formData.append('nfce_series', data.nfce_series || 1);
      formData.append('default_cfop', data.default_cfop || '5102');
      if (data.default_ncm) formData.append('default_ncm', data.default_ncm);
      formData.append('default_csosn', data.default_csosn || '102');
      
      // Endereço estruturado
      const addressObj = {
        street: data.street,
        number: data.number,
        complement: data.complement,
        district: data.district,
        zip_code: data.zip_code.replace(/\D/g, ''),
        city_name: data.city_name,
        uf: data.uf,
        city_code: data.city_code,
      };
      formData.append('address', JSON.stringify(addressObj));
      
      // Só anexa arquivo se o usuário selecionou um novo
      if (data.certificate_file && data.certificate_file.length > 0) {
        formData.append('certificate_file', data.certificate_file[0]);
      }

      await api.post(`/fiscal/${marketId}/config`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Se for provedor Neectify Fiscal, fazemos sincronizações adicionais transparentes
      if (config && config.provider === 'neectify_fiscal') {
        toast.loading("Sincronizando estabelecimento com Neectify Fiscal...", { id: syncToastId });
        await api.post(`/fiscal/${marketId}/neectify/sync-issuer`);
        
        // Se subiu um novo certificado digital, envia e ativa no Neectify
        if (data.certificate_file && data.certificate_file.length > 0 && data.certificate_password) {
          toast.loading("Enviando e ativando certificado digital no Neectify...", { id: syncToastId });
          const certFormData = new FormData();
          certFormData.append('certificate_file', data.certificate_file[0]);
          certFormData.append('certificate_password', data.certificate_password);
          certFormData.append('environment', data.environment === 'producao' ? 'production' : 'homologation');
          
          await api.post(`/fiscal/${marketId}/neectify/sync-cert`, certFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      toast.success("Configurações e sincronizações fiscais salvas com sucesso!", { id: syncToastId });
      loadConfig(); // Recarrega para atualizar status do certificado
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || "Erro ao salvar configurações fiscais.";
      toast.error(errMsg, { id: syncToastId, duration: 6000 });
    } finally {
      setSaving(false);
    }
  };

  const handleEnableFiscal = async () => {
    const toastId = 'fiscal-enable-toast';
    try {
      setEnabling(true);
      toast.loading("Ativando emissão fiscal...", { id: toastId });
      await api.post(`/fiscal/${marketId}/config/enable`);
      toast.success("Emissão fiscal ativada com sucesso!", { id: toastId });
      loadConfig();
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || "Erro ao ativar emissão fiscal.";
      toast.error(errMsg, { id: toastId, duration: 6000 });
    } finally {
      setEnabling(false);
    }
  };

  if (loading) return <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-brand-yellow mb-2" size={32} /><span className="text-gray-400 font-bold">Buscando configurações fiscais...</span></div>;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-blue-50 p-5 rounded-2xl border border-blue-100">
        <div className="flex items-start gap-4">
          <ShieldCheck className="text-blue-600 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-blue-900 flex items-center gap-2 flex-wrap">
              Configuração de NFC-e (Provedor: {config?.provider === 'neectify_fiscal' ? 'Neectify Fiscal' : config?.provider})
              {config?.enabled ? (
                <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Ativo
                </span>
              ) : (
                <span className="bg-gray-200 text-gray-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Inativo
                </span>
              )}
            </h3>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              Para emitir Notas Fiscais de Consumidor (NFC-e), preencha os dados cadastrais da loja, carregue um Certificado Digital A1 (.pfx) válido e configure o Token CSC fornecido pela SEFAZ de seu estado.
            </p>
          </div>
        </div>
        {!config?.enabled && (
          <Button 
            type="button" 
            variant="primary" 
            onClick={handleEnableFiscal} 
            isLoading={enabling}
            className="shrink-0 font-black shadow-md bg-green-600 hover:bg-green-700 text-white border-none"
          >
            Ativar Emissão Fiscal
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        
        {/* SEÇÃO 1: DADOS DO ESTABELECIMENTO */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <Building size={18} className="text-brand-yellow" /> 1. Dados Fiscais da Empresa
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Razão Social (Legal Name)" 
              placeholder="Ex: Mercadinho do Bairro Ltda" 
              {...register('legal_name', { required: 'Razão social obrigatória' })}
              error={errors.legal_name?.message}
            />
            <Input 
              label="Nome Fantasia (Trade Name)" 
              placeholder="Ex: Mercadinho do Bairro" 
              {...register('trade_name')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input 
              label="CNPJ" 
              placeholder="00.000.000/0000-00" 
              {...register('cnpj', { required: 'CNPJ obrigatório' })}
              onChange={handleCNPJChange}
              error={errors.cnpj?.message}
            />
            <Input 
              label="Inscrição Estadual" 
              placeholder="Apenas números" 
              {...register('state_registration', { required: 'Inscrição estadual obrigatória' })}
              error={errors.state_registration?.message}
            />
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Regime Tributário</label>
              <select 
                {...register('tax_regime', { required: true })} 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-yellow outline-none bg-white text-sm"
              >
                <option value="simples_nacional">Simples Nacional</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
                <option value="mei">MEI (Microempreendedor)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Código CRT SEFAZ</label>
              <select 
                {...register('crt', { required: true })} 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-yellow outline-none bg-white text-sm"
              >
                <option value="1">1 - Simples Nacional</option>
                <option value="2">2 - Simples Nacional (excesso sublimite)</option>
                <option value="3">3 - Regime Normal (Lucro Presumido/Real)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Ambiente</label>
              <select 
                {...register('environment')} 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-yellow outline-none bg-white text-sm font-bold text-gray-700"
              >
                <option value="homologacao">Homologação (Ambiente de Testes)</option>
                <option value="producao">Produção (Notas Reais com Valor Fiscal)</option>
              </select>
            </div>
            <Input 
              label="Série NFC-e" 
              type="number"
              placeholder="Ex: 1" 
              {...register('nfce_series', { required: 'Série NFC-e obrigatória' })}
              error={errors.nfce_series?.message}
            />
          </div>
        </div>

        {/* SEÇÃO 2: ENDEREÇO FISCAL */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <MapPin size={18} className="text-brand-yellow" /> 2. Endereço do Estabelecimento
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Input 
              label="CEP" 
              placeholder="00000-000" 
              {...register('zip_code', { required: 'CEP obrigatório' })}
              onChange={handleCEPChange}
              error={errors.zip_code?.message}
            />
            <div className="md:col-span-2">
              <Input 
                label="Logradouro / Rua" 
                placeholder="Rua, Av..." 
                {...register('street', { required: 'Rua obrigatória' })}
                error={errors.street?.message}
              />
            </div>
            <Input 
              label="Número" 
              placeholder="Ex: 123" 
              {...register('number', { required: 'Número obrigatório' })}
              error={errors.number?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Input 
              label="Complemento" 
              placeholder="Sala, Andar, Fundos..." 
              {...register('complement')}
            />
            <Input 
              label="Bairro" 
              placeholder="Bairro" 
              {...register('district', { required: 'Bairro obrigatório' })}
              error={errors.district?.message}
            />
            <Input 
              label="Cidade" 
              placeholder="Cidade" 
              {...register('city_name', { required: 'Cidade obrigatória' })}
              error={errors.city_name?.message}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="UF" 
                placeholder="SP" 
                {...register('uf', { required: 'UF obrigatória' })}
                error={errors.uf?.message}
                maxLength={2}
              />
              <Input 
                label="Cod IBGE" 
                placeholder="Ex: 3550308" 
                {...register('city_code', { required: 'IBGE obrigatório' })}
                error={errors.city_code?.message}
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: CERTIFICADO DIGITAL A1 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <FileText size={18} className="text-brand-yellow" /> 3. Certificado Digital A1 (.pfx)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors relative flex flex-col justify-center min-h-[140px]">
              <input 
                type="file" 
                accept=".pfx" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                {...register('certificate_file')}
              />
              <Upload className="mx-auto text-gray-400 mb-2" size={24} />
              <p className="text-xs font-bold text-gray-700">
                {certFile && certFile.length > 0 ? certFile[0].name : "Arraste ou clique para selecionar o certificado A1"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">Formato PFX. Tamanho máximo: 2MB</p>
            </div>

            <div className="space-y-4 justify-between flex flex-col">
              <Input 
                label="Senha do Certificado" 
                type="password" 
                icon={Key} 
                placeholder="Digite a senha do PFX"
                {...register('certificate_password', { 
                  required: !config?.has_certificate
                })}
                error={errors.certificate_password && "Senha obrigatória para novo certificado"}
              />
              
              {config?.has_certificate && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2.5 rounded-xl text-xs font-bold border border-green-200">
                  <CheckCircle size={16} /> Certificado A1 Ativo
                  {config.certificate_valid_until && (
                    <span className="text-gray-400 font-medium ml-1">
                      (Válido até: {new Date(config.certificate_valid_until).toLocaleDateString('pt-BR')})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: DADOS DO CSC (TOKEN SEFAZ) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <Key size={18} className="text-brand-yellow" /> 4. Código CSC (Token de Segurança SEFAZ)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="ID do CSC (CSC ID)" 
              placeholder="Ex: 000001" 
              {...register('csc_id', { required: 'CSC ID obrigatório' })}
              error={errors.csc_id?.message}
            />
            <div className="relative">
              <Input 
                label="Token CSC" 
                placeholder="Ex: A1B2C3D4..." 
                type="password"
                {...register('csc_token', { 
                  required: !config?.has_csc
                })}
                error={errors.csc_token && "Token CSC obrigatório"}
              />
              <div className="absolute right-0 top-0 pt-7 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-help" title="Token CSC cadastrado na SEFAZ do seu estado para assinar cupons fiscais.">
                <HelpCircle size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 5: CONFIGURAÇÕES E TRIBUTAÇÃO PADRÃO */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-3">
            <SettingsIcon size={18} className="text-brand-yellow" /> 5. Parametrização Fiscal Padrão
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input 
              label="NCM Geral Padrão" 
              placeholder="Ex: 00000000" 
              {...register('default_ncm')}
              maxLength={8}
            />
            <Input 
              label="CFOP Geral Padrão" 
              placeholder="Ex: 5102" 
              {...register('default_cfop', { required: 'CFOP obrigatório' })}
              maxLength={4}
              error={errors.default_cfop?.message}
            />
            <Input 
              label="CSOSN Padrão" 
              placeholder="Ex: 102" 
              {...register('default_csosn', { required: 'CSOSN obrigatório' })}
              maxLength={3}
              error={errors.default_csosn?.message}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto font-black shadow-lg shadow-yellow-100" isLoading={saving}>
            Salvar e Sincronizar Configurações
          </Button>
          <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto font-bold bg-white" onClick={loadConfig}>
            Descartar Alterações
          </Button>
        </div>

      </form>
      <FiscalCenter marketId={marketId} />
    </div>
  );
}
