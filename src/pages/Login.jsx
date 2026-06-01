import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';

export function Login() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: false });
  // Estado para email no verificado
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendingVerif, setResendingVerif] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setUnverifiedEmail(null);
    setLoading(true);
    try {
      const data = await login(loginForm.email, loginForm.password, loginForm.remember);
      showToast('¡Bienvenido de vuelta!');
      navigate(data.user?.role === 'admin' ? '/admin/cards' : '/');
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.status === 403) {
        setUnverifiedEmail(loginForm.email);
      } else {
        showToast(err.message || 'Credenciales incorrectas', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendFromLogin = async () => {
    if (!unverifiedEmail) return;
    setResendingVerif(true);
    try {
      await api.auth.resendVerification(unverifiedEmail);
      showToast('Código reenviado a ' + unverifiedEmail);
    } catch (err) {
      showToast(err.message || 'Error al reenviar el código', 'error');
    } finally {
      setResendingVerif(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      showToast('Error al iniciar sesión con Google', 'error');
      setGoogleLoading(false);
    }
    // Si no hay error, Supabase redirige al proveedor — no se necesita setGoogleLoading(false)
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regForm.password !== regForm.confirm) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await api.auth.register(regForm.firstName, regForm.lastName, regForm.email, regForm.password);
      if (data?.requiresVerification) {
        navigate('/verify-email', { state: { email: regForm.email } });
      } else {
        showToast('Cuenta creada. Ahora inicia sesión.');
        setTab('login');
      }
    } catch (err) {
      showToast(err.message || 'Error al registrar', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-3xl">playing_cards</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Infinity Store</h1>
          <p className="text-gray-400 text-sm mt-1">Tu tienda TCG de confianza</p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                  ${tab === t ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" type="email" value={loginForm.email}
                onChange={(v) => { setLoginForm(f => ({ ...f, email: v })); setUnverifiedEmail(null); }} />
              <Field label="Contraseña" type="password" value={loginForm.password}
                onChange={(v) => setLoginForm(f => ({ ...f, password: v }))} />

              {/* Banner email no verificado */}
              {unverifiedEmail && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-300">
                  <p className="font-semibold mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Debes verificar tu email
                  </p>
                  <p className="text-yellow-400/80 mb-2">Revisa tu bandeja de entrada o{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/verify-email', { state: { email: unverifiedEmail } })}
                      className="underline hover:text-yellow-300"
                    >ingresa el código aquí</button>.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendFromLogin}
                    disabled={resendingVerif}
                    className="text-yellow-300 hover:text-yellow-200 disabled:opacity-50 underline text-xs"
                  >
                    {resendingVerif ? 'Reenviando…' : 'Reenviar código'}
                  </button>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loginForm.remember}
                  onChange={(e) => setLoginForm(f => ({ ...f, remember: e.target.checked }))}
                  className="rounded border-white/20 bg-white/5 text-violet-600"
                />
                <span className="text-sm text-gray-400">Recordarme</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading
                  ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  : 'Iniciar sesión'}
              </button>

              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Google */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#141414] px-2 text-gray-500">O continuar con</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                {googleLoading
                  ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  : <GoogleIcon />}
                Continuar con Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre" value={regForm.firstName}
                  onChange={(v) => setRegForm(f => ({ ...f, firstName: v }))} />
                <Field label="Apellido" value={regForm.lastName}
                  onChange={(v) => setRegForm(f => ({ ...f, lastName: v }))} />
              </div>
              <Field label="Email" type="email" value={regForm.email}
                onChange={(v) => setRegForm(f => ({ ...f, email: v }))} />
              <Field label="Contraseña" type="password" value={regForm.password}
                onChange={(v) => setRegForm(f => ({ ...f, password: v }))} />
              <Field label="Confirmar contraseña" type="password" value={regForm.confirm}
                onChange={(v) => setRegForm(f => ({ ...f, confirm: v }))} />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading
                  ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link to="/" className="text-violet-400 hover:text-violet-300">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
      />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}
