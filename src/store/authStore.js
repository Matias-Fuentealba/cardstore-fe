import { create } from 'zustand';
import { Auth, api, API_BASE, setSupabearer, clearSupabearer } from '../api';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  // Optimistic cache from localStorage (safe fields only — no tokens, no PII).
  // Replaced by backend truth after hydrate() resolves.
  user: Auth.getUser(),
  isLoggedIn: !!Auth.getUser(),
  hydrated: false,
  _loginAt: 0, // timestamp of last explicit login, used to detect race with hydrate()

  // Bootstrap: verify current session via backend cookie, resolve auth state.
  // Uses a raw fetch to avoid the 401-redirect logic in apiFetch — a missing
  // session on a public page is expected, not an error.
  hydrate: async () => {
    const fetchStarted = Date.now();
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
      // If a login (email or OAuth) happened while this fetch was in-flight,
      // don't overwrite the auth state it established — just mark as hydrated.
      if (get()._loginAt > fetchStarted) {
        set({ hydrated: true });
        return;
      }
      Auth.removeUser();
      set({ user: null, isLoggedIn: false, hydrated: true });
    }
  },

  login: async (email, password, remember = false) => {
    const data = await api.auth.login(email, password, remember);
    // Backend sets httpOnly session cookie; we only cache non-sensitive fields.
    Auth.setUser(data.user);
    set({ user: data.user, isLoggedIn: true, hydrated: true, _loginAt: Date.now() });
    const { useCartStore } = await import('./cartStore');
    useCartStore.getState().refresh().catch(() => {});
    return data;
  },

  // Called from AuthCallback after Google OAuth success.
  loginWithSupabase: async (session) => {
    const { access_token, user: supaUser } = session;
    let user;

    // Keep the Supabase token in memory so all apiFetch calls include it as
    // Bearer. This is the auth mechanism for Google OAuth users until the
    // backend establishes a proper session cookie for them.
    setSupabearer(access_token);

    try {
      // Exchange Supabase token for backend session cookie via dedicated endpoint.
      const res = await api.auth.socialLogin(access_token);
      user = res?.user ?? res;
    } catch {
      // Fallback: call /users/me — apiFetch now sends the Bearer token above.
      user = await api.user.me();
    }

    Auth.setUser(user);
    // Set hydrated:true so PrivateRoute doesn't block while hydrate() is still
    // in-flight. _loginAt prevents hydrate()'s catch from clearing this state.
    set({ user, isLoggedIn: true, hydrated: true, _loginAt: Date.now() });
    return { user };
  },

  logout: async () => {
    await api.auth.logout().catch(() => {}); // backend clears httpOnly cookie
    await supabase.auth.signOut().catch(() => {});
    clearSupabearer();
    Auth.clear();
    set({ user: null, isLoggedIn: false });
  },

  setUser: (user) => {
    Auth.setUser(user);
    set({ user });
  },
}));
