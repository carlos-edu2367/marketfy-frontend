import { useState } from 'react';
import { Button } from '../ui/Button';
import TaxRuleReview from './TaxRuleReview';

const STEPS = ['Identificação', 'Contexto', 'ICMS', 'Contribuições', 'Revisão/Publicação'];
const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-yellow';

const EMPTY_VALUES = {
  name: '', effective_from: '', effective_to: '', issuer_regime: '', destination_uf: '', document_model: '',
  ncm: '', cest: '', origin: '', cfop: '', cbenef: '', icms_group: '', icms_cst: '', icms_csosn: '',
  icms_mode: '', pis_cst: '', pis_base: '', pis_rate: '', pis_amount: '', cofins_cst: '', cofins_base: '',
  cofins_rate: '', cofins_amount: '', approval_reference: '', approval_checksum: '', homologation_xml_storage_key: '',
};

function Field({ label, name, values, onChange, type = 'text', required = false }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input type={type} name={name} value={values[name]} onChange={onChange} required={required} className={`mt-1 ${inputClass}`} />
    </label>
  );
}

export default function TaxRuleWizard({ onSubmit, isSubmitting = false, onCancel }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [error, setError] = useState('');
  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const next = () => setStep((current) => Math.min(current + 1, STEPS.length - 1));
  const previous = () => setStep((current) => Math.max(current - 1, 0));

  const submit = async (event) => {
    event.preventDefault();
    if (!values.approval_reference.trim() || !/^[0-9a-fA-F]{64}$/.test(values.approval_checksum) || !values.homologation_xml_storage_key.trim()) {
      setError('Informe a referência oficial, o checksum SHA-256 e a chave do XML de homologação antes de publicar.');
      return;
    }
    setError('');
    await onSubmit({
      name: values.name,
      effective_from: values.effective_from || null,
      effective_to: values.effective_to || null,
      issuer_regime: values.issuer_regime || null,
      destination_uf: values.destination_uf || null,
      document_model: values.document_model || null,
      ncm: values.ncm || null,
      cest: values.cest || null,
      origin: values.origin || null,
      cfop: values.cfop || null,
      cbenef: values.cbenef || null,
      icms: values.icms_group ? { group: values.icms_group, cst: values.icms_cst || null, csosn: values.icms_csosn || null, mode: values.icms_mode } : null,
      pis: values.pis_cst ? { group: 'PIS', cst: values.pis_cst, base: values.pis_base, rate: values.pis_rate, amount: values.pis_amount } : null,
      cofins: values.cofins_cst ? { group: 'COFINS', cst: values.cofins_cst, base: values.cofins_base, rate: values.cofins_rate, amount: values.cofins_amount } : null,
      approval: { reference: values.approval_reference, checksum: values.approval_checksum },
      homologation_xml_storage_key: values.homologation_xml_storage_key,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="Assistente de regra fiscal">
      <ol className="grid grid-cols-2 gap-2 text-xs font-bold sm:grid-cols-5">
        {STEPS.map((name, index) => <li key={name} className={index === step ? 'text-brand-dark' : 'text-slate-400'}>{index + 1}. {name}</li>)}
      </ol>
      <h4 className="text-lg font-black text-slate-900">{STEPS[step]}</h4>
      {step === 0 && <div className="grid gap-3 sm:grid-cols-2"><Field label="Nome da regra" name="name" values={values} onChange={change} required /><Field label="Início de vigência" name="effective_from" values={values} onChange={change} type="date" /><Field label="Fim de vigência" name="effective_to" values={values} onChange={change} type="date" /></div>}
      {step === 1 && <div className="grid gap-3 sm:grid-cols-2"><Field label="Regime do emitente" name="issuer_regime" values={values} onChange={change} /><Field label="UF de destino" name="destination_uf" values={values} onChange={change} /><Field label="Modelo do documento" name="document_model" values={values} onChange={change} /><Field label="NCM" name="ncm" values={values} onChange={change} /><Field label="CEST" name="cest" values={values} onChange={change} /><Field label="Origem" name="origin" values={values} onChange={change} /><Field label="CFOP" name="cfop" values={values} onChange={change} /><Field label="cBenef" name="cbenef" values={values} onChange={change} /></div>}
      {step === 2 && <div className="grid gap-3 sm:grid-cols-2"><Field label="Grupo ICMS" name="icms_group" values={values} onChange={change} /><Field label="CST ICMS" name="icms_cst" values={values} onChange={change} /><Field label="CSOSN" name="icms_csosn" values={values} onChange={change} /><Field label="Modo ICMS" name="icms_mode" values={values} onChange={change} /><p className="sm:col-span-2 text-xs text-slate-500">Informe somente valores comprovados pela fonte oficial e pela revisão responsável. Este assistente não sugere códigos fiscais.</p></div>}
      {step === 3 && <div className="grid gap-3 sm:grid-cols-3"><Field label="CST PIS" name="pis_cst" values={values} onChange={change} /><Field label="Base PIS" name="pis_base" values={values} onChange={change} /><Field label="Alíquota PIS" name="pis_rate" values={values} onChange={change} /><Field label="Valor PIS" name="pis_amount" values={values} onChange={change} /><Field label="CST COFINS" name="cofins_cst" values={values} onChange={change} /><Field label="Base COFINS" name="cofins_base" values={values} onChange={change} /><Field label="Alíquota COFINS" name="cofins_rate" values={values} onChange={change} /><Field label="Valor COFINS" name="cofins_amount" values={values} onChange={change} /></div>}
      {step === 4 && <><TaxRuleReview values={values} /><div className="grid gap-3"><Field label="Referência oficial/revisão" name="approval_reference" values={values} onChange={change} /><Field label="Checksum SHA-256" name="approval_checksum" values={values} onChange={change} /><Field label="Chave do XML de homologação" name="homologation_xml_storage_key" values={values} onChange={change} /></div></>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-between gap-3">
        <div>{step > 0 && <Button type="button" variant="secondary" onClick={previous}>Voltar</Button>}</div>
        <div className="flex gap-3">{onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>}{step < STEPS.length - 1 ? <Button type="button" onClick={next}>Próximo</Button> : <Button type="submit" isLoading={isSubmitting}>Publicar regra</Button>}</div>
      </div>
    </form>
  );
}
