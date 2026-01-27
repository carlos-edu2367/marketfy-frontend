import axios from 'axios';

// Configuração base apontando para o Backend FastAPI
const api = axios.create({
  baseURL: 'https://marketfy-backend.neectify.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o Token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratamento de erros global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirou ou inválido
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;