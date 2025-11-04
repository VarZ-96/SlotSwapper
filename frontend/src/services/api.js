// src/services/api.js
import axios from 'axios';

// The API's base URL, pointing to your backend
const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

// === This is the key part ===
// We use an "interceptor" to automatically add the auth token
// to every outgoing request.
api.interceptors.request.use(
  (config) => {
    // 1. Get the token from localStorage
    const token = localStorage.getItem('token');

    // 2. If the token exists, add it to the Authorization header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;