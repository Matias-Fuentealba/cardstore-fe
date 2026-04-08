import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../components/ui/Toast';

export function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithSupabase } = useAuthStore();
  const processed = useRef(false);

  useEffect(() => {
    async function handleSession(session) {
      if (processed.current) return;
      processed.current = true;

      try {
        const { user } = await loginWithSupabase(session);
        showToast('¡Bienvenido!');
        navigate(user?.role === 'admin' ? '/admin/cards' : '/', { replace: true });
      } catch {
        showToast('Error al verificar la sesión', 'error');
        navigate('/login', { replace: true });
      }
    }

    // Register listener BEFORE anything else so we don't miss INITIAL_SESSION.
    // With PKCE flow, Supabase exchanges the "code" param automatically on init
    // and fires INITIAL_SESSION (or SIGNED_IN) once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        handleSession(session);
        return;
      }
      // INITIAL_SESSION with no session means the code exchange failed or there's no session
      if (event === 'INITIAL_SESSION' && !session && !processed.current) {
        processed.current = true;
        showToast('No se pudo iniciar sesión con Google', 'error');
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        <p className="text-sm">Verificando sesión...</p>
      </div>
    </div>
  );
}
