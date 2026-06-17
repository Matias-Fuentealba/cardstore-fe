import { Link } from 'react-router-dom';

export function ComingSoon({ title = 'Sellado', subtitle = 'Próximamente' }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-violet-400 text-4xl">inventory_2</span>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-3">{subtitle}</p>
        <h1 className="text-3xl font-extrabold text-white mb-4">{title}</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Estamos preparando algo increíble. Pronto tendremos productos sellados disponibles para ti.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
