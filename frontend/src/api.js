const BASE = '';

function getToken() {
  return localStorage.getItem('nutri_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('nutri_token');
    localStorage.removeItem('nutri_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Setup (public)
  getSetupStatus: () => request('/api/auth/setup-status'),
  setupAdmin: (data) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify(data) }),

  // Auth
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/api/auth/me'),
  updateGoals: (data) => request('/api/auth/goals', { method: 'PUT', body: JSON.stringify(data) }),

  // Admin
  listUsers: () => request('/api/auth/users'),
  deleteUser: (id) => request(`/api/auth/users/${id}`, { method: 'DELETE' }),

  // OIDC
  getOidcEnabled: () => request('/api/auth/oidc/enabled'),
  getOidcLoginUrl: () => request('/api/auth/oidc/login'),
  oidcCallback: (code, state) => request(`/api/auth/oidc/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`),

  // Foods
  searchFoods: (q) => request(`/api/foods/search?q=${encodeURIComponent(q)}`),
  lookupBarcode: (code) => request(`/api/foods/barcode/${code}`),
  createCustomFood: (data) => request('/api/foods/custom', { method: 'POST', body: JSON.stringify(data) }),
  recentFoods: () => request('/api/foods/recent'),

  // Meals
  logMeal: (data) => request('/api/meals/', { method: 'POST', body: JSON.stringify(data) }),
  getMeals: (date) => request(`/api/meals/?date=${date}`),
  deleteMeal: (id) => request(`/api/meals/${id}`, { method: 'DELETE' }),
  getDailySummary: (date) => request(`/api/meals/summary?date=${date}`),
  getCalorieHistory: (days) => request(`/api/meals/history?days=${days}`),

  // Weight
  logWeight: (data) => request('/api/weight/', { method: 'POST', body: JSON.stringify(data) }),
  getWeightHistory: (days) => request(`/api/weight/?days=${days}`),
  deleteWeight: (id) => request(`/api/weight/${id}`, { method: 'DELETE' }),

  // Workouts
  logWorkout: (data) => request('/api/workouts/', { method: 'POST', body: JSON.stringify(data) }),
  getWorkouts: (date) => request(`/api/workouts/?date=${date}`),
  deleteWorkout: (id) => request(`/api/workouts/${id}`, { method: 'DELETE' }),
};
