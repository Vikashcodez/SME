import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { auth, setAccessToken, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setTokenState] = useState(() => getAccessToken());
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setAccessToken(null);
      setTokenState(null);
      setUser(null);
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: { token: null, user: null } }));
    }
  }, []);

  const setAuthData = useCallback((newToken, newUser) => {
    setAccessToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    }
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { token: newToken, user: newUser } }));
  }, []);

  
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      const currentToken = getAccessToken();
      if (currentToken) {
        try {
          const res = await auth.getCurrentUser();
          if (res.data?.success && isMounted) {
            const userData = res.data.data.user;
            setAuthData(currentToken, userData);
          }
        } catch (err) {
          if (err.status === 401 && isMounted) {
            
            try {
              const refreshRes = await auth.refresh();
              if (refreshRes.data?.success && isMounted) {
                const { token: refToken, user: refUser } = refreshRes.data.data;
                setAuthData(refToken, refUser);
              }
            } catch {
              if (isMounted) logout();
            }
          }
        }
      }
      if (isMounted) setLoading(false);
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [logout, setAuthData]);

  const login = async (email, password) => {
    try {
      const response = await auth.login({ email, password });
      if (response.data?.success) {
        const { token: newToken, accessToken, user: newUser } = response.data.data;
        const validToken = accessToken || newToken;
        setAuthData(validToken, newUser);
        return { success: true, user: newUser };
      }
      return {
        success: false,
        message: response.data?.error?.message || response.data?.message || 'Login failed',
      };
    } catch (error) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Invalid credentials or server unavailable';
      return { success: false, message: msg };
    }
  };

  
  const hasPermission = useCallback(
    (module, action = 'view') => {
      if (!user) return false;
      
      if (user.role === 'super_admin' || user.role === 'Super Admin') return true;

      
      const userPermissions = user.permissions || {};
      if (userPermissions[module]) {
        if (Array.isArray(userPermissions[module])) {
          return userPermissions[module].includes(action) || userPermissions[module].includes('all');
        }
        return Boolean(userPermissions[module][action]);
      }

      
      if (user.role === 'admin' || user.role === 'manager') return true;
      if (action === 'view') return true;
      return user.role === 'operator' || user.role === 'user';
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      role: user?.role || 'user',
      loading,
      login,
      logout,
      hasPermission,
      isAuthenticated: Boolean(token),
      isSuperAdmin: user?.role === 'super_admin' || user?.role === 'Super Admin',
    }),
    [user, token, loading, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
