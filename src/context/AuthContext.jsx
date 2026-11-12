import React, { createContext, useState, useEffect, useContext } from 'react';
import Cookies from 'js-cookie';
import { getAdminProfile, logoutAdmin as apiLogout } from '../api/userApi';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const profile = await getAdminProfile();
      setAdmin(profile);
      setIsAuthenticated(true);
    } catch (error) {
      setAdmin(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (adminData) => {
    setAdmin(adminData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setAdmin(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
