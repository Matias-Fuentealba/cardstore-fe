import { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api, Auth } from '../api';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../components/ui/Toast';

export function VerifyEmail() {
  const location = useLocation();
  const navigate  = useNavigate();
  const email     = location.state?.email ?? '';

  const [code,        setCode]        = useState(['', '', '', '', '', '']);
  const [loading,     setLoading]     = useState(false);
  const [resending,   setResending]   = useState(false);
  const inputRefs = useRef([]);

  // ─── Manejar cada dígito ─────────────────────────────────────────────────
  const handleDigit = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...code];
    next[i]     = digit;
    setCode(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(''));
      inputRefs.current[5]?.focus();
      e.preventDefault();
    }
  };

  // ─── Verificar ────────────────────────────────────────────────────────────
  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) { showToast('Ingresa el código completo', 'error'); return; }
    setLoading(true);
    try {
      const data = await api.auth.verifyEmail(email, fullCode);
      // Backend sets httpOnly cookie on successful verification
      const user = data.user ?? null;
      if (user) Auth.setUser(user);
      useAuthStore.setState({ user, isLoggedIn: !!user });
      showToast('¡Email verificado! Bienvenido.');
      navigate('/');
    } catch {
      showToast('Código incorrecto o expirado. Intenta nuevamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Reenviar ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await api.auth.resendVerification(email);
      showToast('Código reenviado a ' + email);
    } catch {
      showToast('Error al reenviar el código. Intenta nuevamente.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-white text-3xl">mark_email_unread</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Verifica tu email</h1>
          <p className="text-gray-400 text-sm mt-1">
            Enviamos un código de 6 dígitos a{' '}
            <span className="text-violet-400 font-semibold">{email || 'tu correo'}</span>
          </p>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleVerify} className="space-y-6">
            {/* Inputs de dígitos */}
            <div className="flex justify-center gap-3" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || code.join('').length < 6}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                : 'Verificar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">¿No recibiste el código?</p>
            <button
              onClick={handleResend}
              disabled={resending || !email}
              className="mt-2 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
            >
              {resending ? 'Reenviando…' : 'Reenviar código'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link to="/login" className="text-violet-400 hover:text-violet-300">← Volver al login</Link>
        </p>
      </div>
    </div>
  );
}
