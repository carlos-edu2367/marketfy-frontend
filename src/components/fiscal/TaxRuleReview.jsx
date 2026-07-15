export default function TaxRuleReview({ values }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-bold text-slate-900">Revisão da publicação</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div><dt className="text-slate-500">Nome</dt><dd>{values.name || 'Não informado'}</dd></div>
        <div><dt className="text-slate-500">Vigência inicial</dt><dd>{values.effective_from || 'Não informada'}</dd></div>
        <div><dt className="text-slate-500">Referência oficial</dt><dd className="break-all">{values.approval_reference || 'Não informada'}</dd></div>
        <div><dt className="text-slate-500">Checksum</dt><dd className="break-all font-mono text-xs">{values.approval_checksum || 'Não informado'}</dd></div>
      </dl>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        Ao publicar, esta versão da regra se torna imutável. Para corrigir a tributação, crie uma versão sucessora; não altere a regra publicada.
      </p>
    </div>
  );
}
