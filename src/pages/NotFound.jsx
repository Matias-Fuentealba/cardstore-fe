import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-8xl font-bold text-white/10 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-2">Página no encontrada</h1>
        <p className="text-gray-400 mb-6">La página que buscas no existe o fue movida.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-base">home</span>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
