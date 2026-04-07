import { create } from 'zustand';
import { Auth, api } from '../api';

let _refreshTimer = null;

function scheduleTokenRefresh(token) {
  clearTimeout(_refreshTimer);
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const msUntilRefresh = msUntilExpiry - 60_000;
    if (msUntilRefresh <= 0) return;
    _refreshTimer = setTimeout(async () => {
      const data = await api.auth.refresh().catch(() => null);
      if (data?.accessToken) {
        Auth.setToken(data.accessToken);
        useAuthStore.setState({ token: data.accessToken });
        scheduleTokenRefresh(data.accessToken);
      }
    }, msUntilRefresh);
  } catch { /* no es JWT válido */ }
}

export const useAuthStore = create((set, get) => ({
  user: Auth.getUser(),
  token: Auth.getToken(),
  isLoggedIn: Auth.isLoggedIn(),

  login: async (email, password, remember = false) => {
    const data = await api.auth.login(email, password, remember);
    Auth.setToken(data.accessToken);
    Auth.setUser(data.user);
    scheduleTokenRefresh(data.accessToken);
    set({ user: data.user, token: data.accessToken, isLoggedIn: true });
    return data;
  },

  logout: async () => {
    await api.auth.logout().catch(() => {});
    clearTimeout(_refreshTimer);
    Auth.clear();
    set({ user: null, token: null, isLoggedIn: false });
  },

  setUser: (user) => {
    Auth.setUser(user);
    set({ user });
  },

  init: () => {
    const token = Auth.getToken();
    if (token) scheduleTokenRefresh(token);
  },
}));
