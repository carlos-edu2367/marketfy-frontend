export function shouldBlockOfflineCheckout(fiscalState) {
  return fiscalState?.enforcement === 'block';
}

export function fiscalBlockError(error) {
  const detail = error?.response?.data?.detail;
  const normalized = typeof detail === 'object' && detail !== null ? detail : {};
  return {
    code: normalized.code || error?.code || 'sale.fiscal_rule_invalid',
    items: Array.isArray(normalized.items) ? normalized.items : [],
  };
}

export function fiscalPreflightPayload(sale) {
  return {
    occurred_at: sale.created_at,
    items: sale.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
  };
}
