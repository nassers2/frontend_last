// public/assets/js/auth.js

// Register
async function register(userData) {
  const response = await apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  if (response.success) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    window.location.href = '/dashboard/';
  }
  
  return response;
}

// Login
async function login(email, password) {
  const response = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (response.success) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    window.location.href = '/dashboard/';
  }
  
  return response;
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

// Check auth
function isAuthenticated() {
  return !!localStorage.getItem('token');
}

// Get current user
function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Protect route
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/auth/login.html';
  }
}