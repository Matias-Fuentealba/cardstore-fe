/**
 * La Tech TCG — API Client
 * Access tokens are kept in memory only (never persisted to localStorage).
 * Non-sensitive user fields are cached in localStorage for UI rendering only.
 */

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const SAFE_USER_FIELDS = ['id', 'firstName', 'lastName', 'email', 'role', 'avatar', 'provider'];

// In-memory access token — never persisted to localStorage.
// Set on every login (email/password and Google OAuth). Cleared on logout or page reload.
// Refresh token lives in the backend httpOnly cookie; access token lives here.
let _bearer = null;
export const setBearer = (t) => { _bearer = t; };
export const clearBearer = () => { _bearer = null; };

// ─── User cache (no tokens, no PII) ──────────────────────────────────────────
export const Auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  setUser(u) {
    if (!u) { localStorage.removeItem('user'); return; }
    const safe = Object.fromEntries(
      SAFE_USER_FIELDS.filter(k => k in u).map(k => [k, u[k]])
    );
    localStorage.setItem('user', JSON.stringify(safe));
  },
  removeUser() { localStorage.removeItem('user'); },
  clear() { this.removeUser(); },
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'ngrok-skip-browser-warning': '1',
    ...(_bearer ? { 'Authorization': `Bearer ${_bearer}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (res.status === 401 && retry) {
    try {
      const refreshed = await api.auth.refresh();
      if (refreshed?.accessToken) setBearer(refreshed.accessToken);
      return apiFetch(path, options, false);
    } catch {
      clearBearer();
      Auth.clear();
      window.location.href = '/login';
      return;
    }
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw { status: res.status, ...(data || {}) };
  return data;
}

// ─── Shorthand helpers ────────────────────────────────────────────────────────
const GET    = (path, opts)       => apiFetch(path, { method: 'GET',    ...opts });
const POST   = (path, body, opts) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body), ...opts });
const PATCH  = (path, body, opts) => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body), ...opts });
const DELETE = (path, opts)       => apiFetch(path, { method: 'DELETE', ...opts });

// ─── API namespace ────────────────────────────────────────────────────────────
export const api = {

  auth: {
    register: (firstName, lastName, email, password) =>
      POST('/auth/register', { firstName, lastName, email, password }),
    login: (email, password, remember = false) =>
      POST('/auth/login', { email, password, remember }),
    logout: () => POST('/auth/logout', {}),
    refresh: () => apiFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({}) }, false),
    forgotPassword: (email) => POST('/auth/forgot-password', { email }),
    resetPassword: (token, password) => POST('/auth/reset-password', { token, password }),
    verifyEmail: (email, code) => POST('/auth/verify-email', { email, code }),
    resendVerification: (email) => POST('/auth/resend-verification', { email }),
    // One-time exchange: Supabase OAuth token → backend session cookie
    socialLogin: (supabaseToken) => fetch(`${API_BASE}/auth/social-login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
        'Authorization': `Bearer ${supabaseToken}`,
      },
      body: JSON.stringify({}),
    }).then(async res => {
      if (!res.ok) throw { status: res.status, ...(await res.json().catch(() => ({}))) };
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }),
  },

  cards: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      ['game', 'rarity', 'condition', 'set', 'type'].forEach(key => {
        if (params[key]) [].concat(params[key]).forEach(v => qs.append(key + '[]', v));
      });
      ['priceMin', 'priceMax', 'q', 'sort', 'page', 'limit'].forEach(key => {
        if (params[key] !== undefined && params[key] !== '') qs.set(key, params[key]);
      });
      return GET(`/cards?${qs.toString()}`);
    },
    get: (id) => GET(`/cards/${id}`),
    featured: () => GET('/cards?sort=price_desc&limit=4&inStock=true'),
  },

  games: () => GET('/games'),
  rarities: (games = []) => GET(`/rarities${games.length ? '?' + games.map(g => 'game[]=' + g).join('&') : ''}`),
  sets: (game) => GET(`/sets${game ? '?game=' + game : ''}`),
  cardTypes: (game) => GET(`/card-types${game ? '?game=' + game : ''}`),

  cart: {
    get: () => GET('/cart'),
    addItem: (cardId, condition, qty, language, foil = false) =>
      POST('/cart/items', { cardId, condition, qty, foil, ...(language ? { language } : {}) }),
    updateItem: (itemId, qty) => PATCH(`/cart/items/${itemId}`, { qty }),
    removeItem: (itemId) => DELETE(`/cart/items/${itemId}`),
    clear: () => DELETE('/cart'),
    applyPromo: (code) => POST('/cart/promo', { code }),
    removePromo: () => DELETE('/cart/promo'),
  },

  shipping: {
    methods: () => GET('/shipping-methods'),
    communes: (q) => GET(`/shipping/communes?q=${encodeURIComponent(q)}`),
    quote: (body) => POST('/shipping/quote', body),
  },

  orders: {
    create: (payload) => POST('/orders', payload),
    get: (id) => GET(`/orders/${id}`),
  },

  payments: {
    start: (payload) => POST('/payments/start', payload),
    getStatus: (tokenTrx) => GET(`/payments/${tokenTrx}`),
  },

  mpPayments: {
    start: (payload) => POST('/mp-payments/start', payload),
    getStatus: (tokenTrx) => GET(`/mp-payments/${tokenTrx}`),
  },

  user: {
    me: () => GET('/users/me'),
    update: (data) => PATCH('/users/me', data),
    uploadAvatar: (file) => {
      const form = new FormData();
      form.append('avatar', file);
      return apiFetch('/users/me/avatar', { method: 'POST', body: form });
    },
    delete: () => DELETE('/users/me'),
    orders: (page = 1) => GET(`/users/me/orders?page=${page}`),
    order: (id) => GET(`/users/me/orders/${id}`),
    addresses: () => GET('/users/me/addresses'),
    addAddress: (data) => POST('/users/me/addresses', data),
    updateAddress: (id, data) => PATCH(`/users/me/addresses/${id}`, data),
    deleteAddress: (id) => DELETE(`/users/me/addresses/${id}`),
    setPrimaryAddress: (id) => PATCH(`/users/me/addresses/${id}/primary`, {}),
    wishlist: () => GET('/users/me/wishlist'),
    addToWishlist: (cardId) => POST('/users/me/wishlist', { cardId }),
    removeFromWishlist: (cardId) => DELETE(`/users/me/wishlist/${cardId}`),
    notifications: () => GET('/users/me/notifications'),
    updateNotifications: (prefs) => PATCH('/users/me/notifications', prefs),
    changePassword: (currentPassword, newPassword) =>
      POST('/users/me/change-password', { currentPassword, newPassword }),
    enable2FA: () => POST('/users/me/2fa/enable', {}),
    verify2FA: (code) => POST('/users/me/2fa/verify', { code }),
    disable2FA: () => DELETE('/users/me/2fa'),
    sessions: () => GET('/users/me/sessions'),
    deleteSession: (id) => DELETE(`/users/me/sessions/${id}`),
    deleteOtherSessions: () => DELETE('/users/me/sessions'),
  },

  admin: {
    stats: () => GET('/admin/stats'),
    cards: {
      list: (params = {}) => GET(`/admin/cards?${new URLSearchParams(params)}`),
      update: (id, data) => PATCH(`/admin/cards/${id}`, data),
      setActive: (id, active) => PATCH(`/admin/cards/${id}/active`, { active }),
      delete: (id) => DELETE(`/admin/cards/${id}`),
      clearCatalog: (password) => DELETE('/admin/cards', {
        body: JSON.stringify({ password }),
        headers: { 'Content-Type': 'application/json' },
      }),
      importSet: (payload) => POST('/admin/sets/import', payload),
    },
    inventory: {
      list: (params = {}) => GET(`/admin/inventory?${new URLSearchParams(params)}`),
      updateStock: (cardId, data) => PATCH(`/admin/inventory/${cardId}`, data),
      bulkUpload: (rows) => apiFetch('/admin/inventory/bulk', {
        method: 'POST',
        body: JSON.stringify(rows),
        headers: { 'Content-Type': 'application/json' },
      }),
    },
    orders: {
      list: (params = {}) => GET(`/admin/orders?${new URLSearchParams(params)}`),
      get: (id) => GET(`/admin/orders/${id}`),
      updateStatus: (id, status, data = {}) => PATCH(`/admin/orders/${id}/status`, { status, ...data }),
    },
  },

  decks: {
    list: () => GET('/decks'),
    create: (name, game, cartas) => POST('/decks', { name, game, cartas }),
    get: (id) => GET(`/decks/${id}`),
    update: (id, data) => PATCH(`/decks/${id}`, data),
    delete: (id) => DELETE(`/decks/${id}`),
    addToCart: (id) => POST(`/decks/${id}/cart`, {}),
    export: (id) => GET(`/decks/${id}/export`),
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatCLP(n) {
  return '$' + parseInt(n).toLocaleString('es-CL');
}

export const COND_LABELS = {
  nm: 'Near Mint',
  lp: 'Lightly Played',
  mp: 'Moderately Played',
  hp: 'Heavily Played',
};
