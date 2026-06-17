import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import optcgImg  from '../assets/optcg.webp';
import ptcgImg   from '../assets/ptcg.webp';
import rbtcgImg  from '../assets/rbtcg.jpg';

const GAME_META = {
  'pokemon':    { img: ptcgImg,  gradient: 'from-yellow-600/80 to-orange-700/80' },
  'ptcg':       { img: ptcgImg,  gradient: 'from-yellow-600/80 to-orange-700/80' },
  'onepiece':   { img: optcgImg, gradient: 'from-red-700/80 to-rose-900/80'      },
  'one-piece':  { img: optcgImg, gradient: 'from-red-700/80 to-rose-900/80'      },
  'optcg':      { img: optcgImg, gradient: 'from-red-700/80 to-rose-900/80'      },
  'riftbound':  { img: rbtcgImg, gradient: 'from-violet-700/80 to-indigo-900/80' },
  'rbtcg':      { img: rbtcgImg, gradient: 'from-violet-700/80 to-indigo-900/80' },
};

function gameMeta(id = '', name = '') {
  const key = (id + name).toLowerCase().replace(/[\s\-_]/g, '');
  for (const [pattern, meta] of Object.entries(GAME_META)) {
    if (key.includes(pattern.replace(/-/g, ''))) return meta;
  }
  return { img: null, gradient: 'from-violet-700/80 to-purple-900/80' };
}

export function Singles() {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);

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
              <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
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
              const meta = gameMeta(game.id, game.name);
              return (
                <Link
                  key={game.id}
                  to={`/singles/${game.id}`}
                  className="group relative overflow-hidden rounded-2xl h-48 border border-white/10 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl transition-all"
                >
                  {/* Background image */}
                  {meta.img
                    ? <img src={meta.img} alt={game.name} className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500" />
                    : <div className="absolute inset-0 bg-white/5" />
                  }

                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${meta.gradient} via-black/40 to-black/10`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">{game.name}</h2>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">Ver cartas disponibles</span>
                      <span className="material-symbols-outlined text-base text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
                    </div>
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
