import React, { createContext, useState, useEffect, useContext } from 'react';
import Cookies from 'js-cookie';
import { userApi } from '../Redux/User';
import { store } from '../Redux/store';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const profile = await store
        .dispatch(userApi.endpoints.getAdminProfile.initiate(undefined, { forceRefetch: true }))
        .unwrap();
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
      await store.dispatch(userApi.endpoints.logoutAdmin.initiate()).unwrap();
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
