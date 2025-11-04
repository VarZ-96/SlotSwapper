// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 1. DEFINE THE ERROR STATE
  const [error, setError] = useState(null); 

  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      // ... (rest of the code)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      setIsLoading(false); 
      return true; // Success
    } catch (error) {
      // 2. SET THE ERROR STATE
      setError(error.response?.data?.error || 'Failed to log in');
      setIsLoading(false); 
      setIsAuthenticated(false);
      return false; // Failure
    }
  };

  const signup = async (name, email, password) => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    
    try {
      const response = await api.post('/auth/signup', { name, email, password });
      const { token, user } = response.data;
      // ... (rest of the code)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      setIsLoading(false); 
      return true; // Success
    } catch (error) {
      // 3. SET THE ERROR STATE
      setError(error.response?.data?.error || 'Failed to sign up');
      setIsLoading(false); 
      setIsAuthenticated(false);
      return false; // Failure
    }
  };

  const logout = () => {
    // ... (logout code)
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // 4. PROVIDE THE ERROR STATE
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    error, // <-- Add this
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};