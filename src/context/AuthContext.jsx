import { useState, useEffect, useCallback } from 'react';
import api, { clearAccessToken, setAccessToken } from '../lib/api';
import { db } from '../lib/db';
import { AuthContext } from './AuthContextDefinition';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data } = await api.get('/billing/subscription');
      setSubscription(data);
      return data;
    } catch (error) {
      if (error?.response?.status !== 401) {
        console.warn('[billing] Erro ao buscar assinatura:', error?.response?.status);
      }
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    refreshSubscription().catch(() => {});
    return data;
  }, [refreshSubscription]);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.access_token);
        await refreshUser();
      } catch {
        clearAccessToken();
        setUser(null);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [refreshUser]);

  const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const { data: tokenData } = await api.post('/auth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    setAccessToken(tokenData.access_token);
    return refreshUser();
  };

  const registerUser = async (userData) => {
    const { data } = await api.post('/identity/register', userData);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout local segue mesmo se a sessao no servidor ja expirou.
    }
    clearAccessToken();
    setUser(null);
    setSubscription(null);
    await db.sales_queue.clear();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        login,
        logout,
        registerUser,
        refreshUser,
        refreshSubscription,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
