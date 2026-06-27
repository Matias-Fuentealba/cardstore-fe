import { create } from 'zustand';
import { Auth, api, API_BASE, setBearer, clearBearer } from '../api';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  // Optimistic cache from localStorage (safe fields only — no tokens, no PII).
  // Replaced by backend truth after hydrate() resolves.
  user: Auth.getUser(),
  isLoggedIn: !!Auth.getUser(),
  hydrated: false,
  _loginAt: 0, // timestamp of last explicit login, used to detect race with hydrate()

  // Bootstrap: verify current session, resolve auth state.
  // Order of attempts:
  //   1. Backend cookie (email/password users)
  //   2. Supabase session (Google OAuth users — persisted by Supabase SDK across tabs/reloads)
  //   3. Give up → logged out
  hydrate: async () => {
    const fetchStarted = Date.now();

    const tryMe = (token) => fetch(`${API_BASE}/users/me`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    try {
      // 1. Try cookie auth (no Bearer)
      let res = await tryMe(null);

      // 2. If cookie fails, check if Supabase has a session (new tab / page reload for OAuth users)
      if (!res.ok) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setBearer(session.access_token);
          res = await tryMe(session.access_token);
        }
      }

      if (!res.ok) throw new Error('unauthenticated');

      const user = await res.json();
      Auth.setUser(user);
      set({ user, isLoggedIn: true, hydrated: true, _loginAt: Date.now() });
    } catch {
      // If a login happened while this fetch was in-flight, don't clear that state.
      if (get()._loginAt > fetchStarted) {
        set({ hydrated: true });
        return;
      }
      clearBearer();
      Auth.removeUser();
      set({ user: null, isLoggedIn: false, hydrated: true });
    }
  },

  login: async (email, password, remember = false) => {
    const data = await api.auth.login(email, password, remember);
    if (data.accessToken) setBearer(data.accessToken);
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

    setBearer(access_token);

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
    const { useCartStore } = await import('./cartStore');
    useCartStore.getState().refresh().catch(() => {});
    return { user };
  },

  logout: async () => {
    await api.auth.logout().catch(() => {}); // backend clears httpOnly cookie
    await supabase.auth.signOut().catch(() => {});
    clearBearer();
    Auth.clear();
    set({ user: null, isLoggedIn: false });
  },

  setUser: (user) => {
    Auth.setUser(user);
    set({ user });
  },
}));
