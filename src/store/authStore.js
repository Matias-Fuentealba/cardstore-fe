import { create } from 'zustand';
import { Auth, api, API_BASE } from '../api';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  // Optimistic cache from localStorage (safe fields only — no tokens, no PII).
  // Replaced by backend truth after hydrate() resolves.
  user: Auth.getUser(),
  isLoggedIn: !!Auth.getUser(),
  hydrated: false,

  // Bootstrap: verify current session via backend cookie, resolve auth state.
  // Uses a raw fetch to avoid the 401-redirect logic in apiFetch — a missing
  // session on a public page is expected, not an error.
  hydrate: async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      });
      if (!res.ok) throw new Error('unauthenticated');
      const user = await res.json();
      Auth.setUser(user);
      set({ user, isLoggedIn: true, hydrated: true });
    } catch {
      Auth.removeUser();
      set({ user: null, isLoggedIn: false, hydrated: true });
    }
  },

  login: async (email, password, remember = false) => {
    const data = await api.auth.login(email, password, remember);
    // Backend sets httpOnly session cookie; we only cache non-sensitive fields.
    Auth.setUser(data.user);
    set({ user: data.user, isLoggedIn: true });
    const { useCartStore } = await import('./cartStore');
    useCartStore.getState().refresh().catch(() => {});
    return data;
  },

  // Called from AuthCallback after Google OAuth success.
  loginWithSupabase: async (session) => {
    const { access_token, user: supaUser } = session;
    let user;

    try {
      // Exchange Supabase token for backend session cookie via dedicated endpoint.
      const res = await api.auth.socialLogin(access_token);
      user = res?.user ?? res;
    } catch {
      // Fallback: call /users/me with the Supabase Bearer token directly.
      // Backend must validate Supabase JWT and set its own session cookie here.
      const meRes = await fetch(`${API_BASE}/users/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '1',
          'Authorization': `Bearer ${access_token}`,
        },
      });
      if (!meRes.ok) throw new Error('Social login failed');
      user = await meRes.json();
    }

    Auth.setUser(user);
    set({ user, isLoggedIn: true });
    return { user };
  },

  logout: async () => {
    await api.auth.logout().catch(() => {}); // backend clears httpOnly cookie
    await supabase.auth.signOut().catch(() => {});
    Auth.clear();
    set({ user: null, isLoggedIn: false });
  },

  setUser: (user) => {
    Auth.setUser(user);
    set({ user });
  },
}));
