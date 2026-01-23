import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { db } from '../lib/db';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função memorizada para buscar dados atualizados do usuário (Plano, Status, etc)
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const { data } = await api.get('/auth/me');
      
      // Mescla o token existente com os novos dados
      const fullUser = { ...data, token };
      
      setUser(fullUser);
      localStorage.setItem('user_data', JSON.stringify(fullUser));
      return fullUser;
    } catch (error) {
      console.warn("Erro ao atualizar dados do usuário:", error);
      // Se der 401, o interceptor do axios já lida com logout
    }
  }, []);

  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_data');
      
      if (token) {
        // Carrega dados em cache primeiro para UI instantânea
        if (savedUser) {
           setUser(JSON.parse(savedUser));
        }
        
        api.defaults.headers.Authorization = `Bearer ${token}`;
        
        // Valida e atualiza com o servidor (Plano pode ter mudado)
        await refreshUser();
      }
      setLoading(false);
    }
    loadUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    // 1. Pega o Token
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const { data: tokenData } = await api.post('/auth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const token = tokenData.access_token;
    localStorage.setItem('access_token', token);
    api.defaults.headers.Authorization = `Bearer ${token}`;

    // 2. Busca dados completos usando a mesma função de refresh
    const fullUser = await refreshUser();
    
    return fullUser;
  };

  const registerUser = async (userData) => {
    const { data } = await api.post('/identity/register', userData);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
    db.sales_queue.clear(); 
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      registerUser,
      refreshUser, // Exposto para ser chamado manualmente (ex: após pagar plano)
      loading, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);