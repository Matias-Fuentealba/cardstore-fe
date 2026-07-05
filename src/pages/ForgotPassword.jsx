import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
    } catch {
      // Swallow the error intentionally — don't reveal whether the email exists.
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="https://i.imgur.com/dVTFMJf.png" alt="La Tech TCG" className="h-[104px] w-auto object-contain mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Tu tienda TCG de confianza</p>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-600/15 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-violet-400 text-3xl">mark_email_read</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Revisá tu email</h2>
              <p className="text-sm text-gray-400 mb-6">
                Si <span className="text-white font-semibold">{email}</span> está registrado, te enviamos un link para restablecer tu contraseña. Puede tardar unos minutos.
              </p>
              <p className="text-xs text-gray-500 mb-6">¿No llegó? Revisá la carpeta de spam.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors font-semibold"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Recuperar contraseña</h2>
                <p className="text-sm text-gray-400">Ingresá tu email y te enviamos un link para crear una nueva contraseña.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="tu@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading
                    ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    : <span className="material-symbols-outlined text-base">send</span>}
                  {loading ? 'Enviando…' : 'Enviar link de recuperación'}
                </button>
              </form>
            </>
          )}
        </div>

        {!sent && (
          <p className="text-center text-gray-500 text-sm mt-6">
            <Link to="/login" className="text-violet-400 hover:text-violet-300">
              ← Volver al inicio de sesión
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
