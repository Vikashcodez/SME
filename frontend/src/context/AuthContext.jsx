import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setRole(userData.role);
      }
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await auth.verify();
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        setRole(userData.role);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await auth.login({ email, password });
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Set user data with all fields
        const userData = {
          ...user,
          is_super_admin: user.is_super_admin || false,
          is_company_admin: user.is_company_admin || false,
          role: user.role || 'employee'
        };
        
        setToken(token);
        setUser(userData);
        setRole(userData.role);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        toast.success('Login successful!');
        return { success: true, user: userData };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    token,
    role,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
    isSuperAdmin: role === 'super_admin' || user?.is_super_admin === true,
    isCompanyAdmin: user?.is_company_admin === true || role === 'company_admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};