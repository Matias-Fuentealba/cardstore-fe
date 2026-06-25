/**
 * La Tech TCG — API Client
 */
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

// ─── Token helpers ────────────────────────────────────────────────────────────
export const Auth = {
  getToken() { return localStorage.getItem('accessToken'); },
  setToken(t) { localStorage.setItem('accessToken', t); },
  removeToken() { localStorage.removeItem('accessToken'); },
  getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },
  setUser(u) { localStorage.setItem('user', JSON.stringify(u)); },
  removeUser() { localStorage.removeItem('user'); },
  isLoggedIn() { return !!this.getToken(); },
  clear() { this.removeToken(); this.removeUser(); },
  isSupabaseToken(t = this.getToken()) {
    try {
      const { iss } = JSON.parse(atob(t.split('.')[1]));
      return typeof iss === 'string' && iss.includes('supabase');
    } catch { return false; }
  },
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
    ...options.headers,
  };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (res.status === 401 && retry) {
    // If it's a Supabase token, the backend doesn't support it yet — don't redirect
    if (Auth.isSupabaseToken()) {
      const err = await res.json().catch(() => ({}));
      throw { status: 401, ...err };
    }

    // 1. Try refreshing via Supabase (for Google OAuth users)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && session.access_token !== token) {
        Auth.setToken(session.access_token);
        return apiFetch(path, options, false);
      }
    } catch { /* ignore */ }

    // 2. Fall back to backend refresh (for email/password users)
    const refreshed = await api.auth.refresh().catch(() => null);
    if (refreshed) {
      Auth.setToken(refreshed.accessToken);
      return apiFetch(path, options, false);
    } else {
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
const GET    = (path, opts) => apiFetch(path, { method: 'GET', ...opts });
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
      return apiFetch('/users/me/avatar', {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      });
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Auth.getToken()}` },
      }),
      importSet: (payload) => POST('/admin/sets/import', payload),
    },
    inventory: {
      list: (params = {}) => GET(`/admin/inventory?${new URLSearchParams(params)}`),
      updateStock: (cardId, data) => PATCH(`/admin/inventory/${cardId}`, data),
      bulkUpload: (rows) => apiFetch('/admin/inventory/bulk', {
        method: 'POST',
        body: JSON.stringify(rows),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Auth.getToken()}` },
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
