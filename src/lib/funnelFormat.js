export const STATUS_LABEL = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' };

/** 0.05 -> "5,0%" */
export const formatPct = (value) => `${(value * 100).toFixed(1).replace('.', ',')}%`;
