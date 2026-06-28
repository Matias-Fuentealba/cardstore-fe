import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { showToast } from '../components/ui/Toast';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token    = searchParams.get('token');
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const setF = k => v => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }
    if (form.password.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      showToast(
        err.status === 400 || err.status === 404
          ? 'El link expiró o ya fue usado. Solicitá uno nuevo.'
          : 'Error al restablecer la contraseña. Intentá nuevamente.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Token ausente en la URL
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-red-400 text-3xl">link_off</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link inválido</h2>
          <p className="text-sm text-gray-400 mb-6">Este link de recuperación no es válido o ya expiró.</p>
          <Link to="/forgot-password" className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors text-sm">
            Solicitar un nuevo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="https://i.imgur.com/dVTFMJf.png" alt="La Tech TCG" className="h-[104px] w-auto object-contain mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Tu tienda TCG de confianza</p>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
              <p className="text-sm text-gray-400 mb-6">Ya podés iniciar sesión con tu nueva contraseña.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Nueva contraseña</h2>
                <p className="text-sm text-gray-400">Elegí una contraseña nueva y segura.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Nueva contraseña</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setF('password')(e.target.value)}
                    required
                    autoFocus
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={form.confirm}
                    onChange={e => setF('confirm')(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Repetí la contraseña"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading
                    ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    : <span className="material-symbols-outlined text-base">lock_reset</span>}
                  {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
                </button>
              </form>
            </>
          )}
        </div>

        {!done && (
          <p className="text-center text-gray-500 text-sm mt-6">
            <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300">
              ← Solicitar un nuevo link
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
