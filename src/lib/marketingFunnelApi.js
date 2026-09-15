import api from './api';

export const createFunnelEvent = (payload) => api.post('/marketing-funnel/events', payload);

export const createFunnelLead = (payload) => api.post('/marketing-funnel/leads', payload);

export const getMarketingFunnelSummary = () => api.get('/admin/marketing-funnel/summary');

export const getMarketingFunnelLeads = (variant) =>
  api.get('/admin/marketing-funnel/leads', { params: variant ? { variant } : {} });
