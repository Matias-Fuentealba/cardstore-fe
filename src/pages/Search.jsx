import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatCLP } from '../api';
import { useCartStore } from '../store/cartStore';
import { showToast } from '../components/ui/Toast';

const LIMIT = 20;

const RARITY_STYLES = {
  'starlight rare': 'bg-yellow-400 text-slate-900',
  'secret rare':    'bg-pink-500 text-white',
  'ultra rare':     'bg-slate-900 text-white',
  'mythic':         'bg-indigo-600 text-white',
  'rare':           'bg-orange-500 text-white',
  'common':         'bg-slate-400 text-white',
};
function rarityStyle(r) {
  return RARITY_STYLES[(r || '').toLowerCase()] || 'bg-slate-700 text-white';
}

function Pagination({ page, total, onPage }) {
  const totalPages = Math.ceil(total / LIMIT);
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-10 flex-wrap">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors
            ${p === page ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-gray-400 hover:border-violet-500 hover:text-violet-400'}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function Search() {
  const navigate = useNavigate();
  const refreshCart = useCartStore(s => s.refresh);

  // Read initial query from sessionStorage or URL
  const [query, setQuery] = useState(() => {
    const q = sessionStorage.getItem('searchQuery') || new URLSearchParams(window.location.search).get('q') || '';
    sessionStorage.removeItem('searchQuery');
    return q;
  });

  const [cards,   setCards]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.cards.list({ q: query || undefined, page, limit: LIMIT })
      .then(res => {
        if (cancelled) return;
        const data = res.data || res;
        setCards(Array.isArray(data) ? data : []);
        setTotal(res.total ?? (Array.isArray(data) ? data.length : 0));
      })
      .catch(() => { if (!cancelled) setCards([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleAddToCart = async (e, card) => {
    e.preventDefault();
    e.stopPropagation();
    const inv = card.inventory && typeof card.inventory === 'object' ? card.inventory : {};
    const firstLang = inv.default || Object.values(inv)[0] || {};
    const cond = firstLang.nm ? 'nm' : firstLang.lp ? 'lp' : firstLang.mp ? 'mp' : 'hp';
    try {
      await api.cart.addItem(card.id, cond, 1);
      await refreshCart();
      showToast('Agregado al carrito');
    } catch (ex) {
      showToast(ex.message || 'Error al agregar', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 mb-1">Resultados para</p>
          <h1 className="text-3xl font-extrabold text-white">
            {query ? `"${query}"` : 'Todas las cartas'}
          </h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-1">
              {total} resultado{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Buscar cartas, expansiones..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </form>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <span className="material-symbols-outlined text-5xl block mb-4">search_off</span>
            <p className="font-semibold text-lg">{query ? `Sin resultados para "${query}"` : 'No hay cartas disponibles.'}</p>
            {query && <p className="text-sm mt-2">Probá con otro nombre o revisá la ortografía.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {cards.map(card => {
              const inv = card.inventory && typeof card.inventory === 'object' ? card.inventory : {};
              const firstLang = inv.default || Object.values(inv)[0] || {};
              const firstCond = firstLang.nm || firstLang.lp || firstLang.mp || firstLang.hp;
              const price = firstCond?.price ?? 0;
              const totalStock = Object.values(inv).flatMap(l => Object.values(l)).reduce((s, c) => s + (c.stock ?? 0), 0);
              const outOfStock = totalStock === 0;

              return (
                <Link
                  key={card.id}
                  to={`/card/${card.id}`}
                  className={`group bg-white/5 border border-white/10 p-4 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all block ${outOfStock ? 'opacity-60' : ''}`}
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3 bg-black/20">
                    <img
                      src={card.imageSm || card.image || ''}
                      alt={card.name}
                      className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${outOfStock ? 'grayscale' : ''}`}
                    />
                    <span className={`absolute top-2 left-2 ${rarityStyle(card.rarity)} text-[10px] font-black px-2 py-0.5 rounded-full uppercase`}>
                      {card.rarity || ''}
                    </span>
                    {outOfStock && (
                      <span className="absolute bottom-2 left-0 right-0 mx-auto w-fit bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Sin stock
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white truncate text-sm mb-0.5">{card.name}</h4>
                  <p className="text-xs text-gray-400 mb-2">{card.setName || ''}</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-base font-black ${outOfStock ? 'text-gray-500' : 'text-violet-400'}`}>
                      {outOfStock ? 'Sin stock' : formatCLP(price)}
                    </p>
                    {!outOfStock && (
                      <button
                        onClick={(e) => handleAddToCart(e, card)}
                        className="p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-600 text-violet-400 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Pagination page={page} total={total} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
    </div>
  );
}
