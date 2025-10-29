// public/assets/js/config.js
const API_CONFIG = {
  baseURL: 'api.fleemaster.com/api',
  timeout: 30000,
};

// Helper للـ API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };
  
  const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  });
  
  if (response.status === 401) {
    // Token expired
    localStorage.removeItem('token');
    window.location.href = '/auth/login.html';
    return;
  }
  
  return response.json();
}