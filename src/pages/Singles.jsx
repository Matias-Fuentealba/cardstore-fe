import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const GAME_STYLES = {
  'pokemon':    { gradient: 'from-yellow-500 to-orange-500', icon: 'catching_pokemon', bg: 'bg-yellow-500/10' },
  'yugioh':     { gradient: 'from-indigo-500 to-purple-600', icon: 'auto_awesome',     bg: 'bg-indigo-500/10' },
  'yu-gi-oh':   { gradient: 'from-indigo-500 to-purple-600', icon: 'auto_awesome',     bg: 'bg-indigo-500/10' },
  'magic':      { gradient: 'from-emerald-500 to-teal-600',  icon: 'stars',            bg: 'bg-emerald-500/10' },
  'lorcana':    { gradient: 'from-blue-500 to-cyan-500',     icon: 'music_note',       bg: 'bg-blue-500/10' },
  'onepiece':   { gradient: 'from-red-500 to-rose-600',      icon: 'sailing',          bg: 'bg-red-500/10' },
  'one-piece':  { gradient: 'from-red-500 to-rose-600',      icon: 'sailing',          bg: 'bg-red-500/10' },
  'dragonball': { gradient: 'from-orange-500 to-red-500',    icon: 'flare',            bg: 'bg-orange-500/10' },
};

function gameStyle(id = '', name = '') {
  const key = (id + name).toLowerCase().replace(/\s/g, '');
  for (const [pattern, style] of Object.entries(GAME_STYLES)) {
    if (key.includes(pattern.replace(/-/g, ''))) return style;
  }
  return { gradient: 'from-violet-500 to-purple-600', icon: 'playing_cards', bg: 'bg-violet-500/10' };
}

export function Singles() {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.games()
      .then(data => setGames(data?.games || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
          <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
          <span className="text-white font-medium">Singles</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">Singles</h1>
          <p className="text-gray-400">Selecciona un juego para ver las cartas disponibles.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <span className="material-symbols-outlined text-5xl block mb-4">sports_esports</span>
            <p className="font-semibold">No hay juegos disponibles por el momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map(game => {
              const style = gameStyle(game.id, game.name);
              return (
                <Link
                  key={game.id}
                  to={`/singles/${game.id}`}
                  className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-7 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl transition-all"
                >
                  {/* Background glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

                  <div className="relative flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl ${style.bg} flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:scale-110 transition-transform`}>
                      <span className={`material-symbols-outlined text-3xl bg-gradient-to-br ${style.gradient} bg-clip-text text-transparent`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {style.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-extrabold text-white group-hover:text-violet-300 transition-colors truncate">{game.name}</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Ver cartas disponibles</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all ml-auto flex-shrink-0">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
