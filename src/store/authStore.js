import { create } from 'zustand';
import { Auth, api } from '../api';
import { supabase } from '../lib/supabase';

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

  // Called from AuthCallback after Google OAuth success
  loginWithSupabase: async (session) => {
    const { access_token, user: supaUser } = session;
    Auth.setToken(access_token);

    let user;
    try {
      // Backend now accepts Supabase JWTs and does upsert — get real profile with role
      user = await api.user.me();
    } catch {
      // Fallback: build from Supabase metadata if backend is unreachable
      const meta = supaUser.user_metadata ?? {};
      const fullName = (meta.full_name ?? meta.name ?? '').trim();
      const parts = fullName.split(' ');
      user = {
        id: supaUser.id,
        email: supaUser.email,
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' ') ?? '',
        avatar: meta.avatar_url ?? meta.picture ?? null,
        role: 'customer',
      };
    }

    Auth.setUser(user);
    set({ user, token: access_token, isLoggedIn: true });
    return { user };
  },

  logout: async () => {
    await api.auth.logout().catch(() => {});
    await supabase.auth.signOut().catch(() => {});
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
