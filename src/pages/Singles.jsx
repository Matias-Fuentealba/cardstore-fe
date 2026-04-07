import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api, formatCLP, Auth, COND_LABELS } from '../api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../components/ui/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const LIMIT = 24;

const SORT_OPTIONS = [
  { label: 'Más relevante',         value: '' },
  { label: 'Precio: menor a mayor', value: 'price_asc' },
  { label: 'Precio: mayor a menor', value: 'price_desc' },
  { label: 'Nombre A–Z',            value: 'name_asc' },
  { label: 'Más recientes',         value: 'newest' },
];

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

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Filter group (collapsible) ───────────────────────────────────────────────
function FilterGroup({ icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-400 text-base">{icon}</span>
          {title}
        </span>
        <span className="material-symbols-outlined text-gray-400 text-base transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          expand_more
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ─── Checkbox filter ──────────────────────────────────────────────────────────
function FilterCheck({ label, name, value, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1">
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-white/20 bg-white/5 text-violet-600 focus:ring-violet-500"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

// ─── Card item ────────────────────────────────────────────────────────────────
function CardItem({ card, viewMode }) {
  const [selectedCond, setSelectedCond] = useState('');
  const [addState, setAddState] = useState('idle'); // 'idle' | 'loading' | 'done'
  const { isLoggedIn } = useAuthStore();
  const refreshCart = useCartStore(s => s.refresh);

  const inv = card.inventory && typeof card.inventory === 'object' ? card.inventory : {};
  const firstLang = inv.default || Object.values(inv)[0] || {};

  const availableConds = ['nm', 'lp', 'mp', 'hp'].map(c => {
    const data = firstLang[c];
    return data ? { key: c, price: data.price ?? 0, stock: data.stock ?? 0 } : null;
  }).filter(Boolean);

  const firstCond = availableConds[0];
  const price = firstCond?.price ?? 0;
  const totalStock = Object.values(inv).flatMap(l => Object.values(l)).reduce((s, c) => s + (c.stock ?? 0), 0);
  const outOfStock = totalStock === 0;

  const activeCond = selectedCond || firstCond?.key || 'nm';
  const activeCondData = availableConds.find(c => c.key === activeCond);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (addState !== 'idle') return;
    setAddState('loading');
    try {
      await api.cart.addItem(card.id, activeCond, 1);
      await refreshCart();
      setAddState('done');
      setTimeout(() => setAddState('idle'), 1500);
    } catch (ex) {
      setAddState('idle');
      showToast(ex.message || ex.error || 'Error al agregar al carrito', 'error');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { showToast('Inicia sesión para guardar en wishlist', 'warn'); return; }
    try {
      await api.user.addToWishlist(card.id);
      showToast('Añadido a tu wishlist');
    } catch (ex) {
      showToast(ex.message || ex.error || 'Error', 'error');
    }
  };

  const img = card.imageSm || card.image || '';
  const rStyle = rarityStyle(card.rarity);

  const CartBtn = ({ className = '' }) => {
    if (outOfStock) {
      return (
        <span className={`p-2 rounded-xl bg-white/5 text-gray-500 cursor-not-allowed ${className}`}>
          <span className="material-symbols-outlined text-lg">remove_shopping_cart</span>
        </span>
      );
    }
    return (
      <button
        onClick={handleAddToCart}
        disabled={addState !== 'idle'}
        className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
          addState === 'done'
            ? 'bg-green-500 text-white'
            : 'bg-violet-500/10 hover:bg-violet-600 text-violet-400 hover:text-white'
        } ${className}`}
      >
        <span className="material-symbols-outlined text-lg">
          {addState === 'loading' ? 'progress_activity' : addState === 'done' ? 'check' : 'add_shopping_cart'}
        </span>
      </button>
    );
  };

  // ── Grid view ──────────────────────────────────────────────────────────────
  if (viewMode === 'grid') {
    return (
      <div className={`group bg-white/5 border border-white/10 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all ${outOfStock ? 'opacity-60' : ''}`}>
        <Link to={`/card/${card.id}`} className="block">
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-4 bg-black/20">
            <img
              src={img}
              alt={card.name}
              className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${outOfStock ? 'grayscale' : ''}`}
            />
            <span className={`absolute top-2 left-2 ${rStyle} text-[10px] font-black px-2 py-0.5 rounded-full uppercase`}>
              {card.rarity || ''}
            </span>
            {outOfStock
              ? <span className="absolute bottom-2 left-0 right-0 mx-auto w-fit bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Sin stock</span>
              : <button
                  onClick={handleWishlist}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 text-gray-300"
                >
                  <span className="material-symbols-outlined text-base">favorite_border</span>
                </button>
            }
          </div>
          <h4 className="font-bold text-white truncate text-sm">{card.name}</h4>
          <p className="text-xs text-gray-400 mb-2">{card.setName || card.set || ''}</p>
        </Link>

        {outOfStock
          ? <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-gray-500">Sin stock</span>
              <CartBtn />
            </div>
          : <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
              <select
                value={activeCond}
                onChange={e => setSelectedCond(e.target.value)}
                className="flex-1 text-xs font-semibold bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-gray-200 focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                {availableConds.map(c => (
                  <option key={c.key} value={c.key} disabled={c.stock === 0}>
                    {COND_LABELS[c.key]} — {c.stock === 0 ? 'Sin stock' : formatCLP(c.price)}
                  </option>
                ))}
              </select>
              <CartBtn />
            </div>
        }
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:shadow-lg transition-all ${outOfStock ? 'opacity-60' : ''}`}>
      <Link to={`/card/${card.id}`} className="flex-shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-black/20">
        <img src={img} alt={card.name} className={`w-full h-full object-contain ${outOfStock ? 'grayscale' : ''}`} />
      </Link>
      <Link to={`/card/${card.id}`} className="flex-1 min-w-0">
        <h4 className="font-bold text-white truncate text-sm">{card.name}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{card.setName || card.set || ''}</p>
        <span className={`inline-block mt-1.5 ${rStyle} text-[10px] font-black px-2 py-0.5 rounded-full uppercase`}>{card.rarity || ''}</span>
      </Link>
      <div className="flex items-center gap-3 flex-shrink-0">
        {outOfStock
          ? <span className="text-xs font-bold text-red-400">Sin stock</span>
          : <span className="text-base font-black text-violet-400">{formatCLP(activeCondData?.price ?? price)}</span>
        }
        <CartBtn />
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ currentPage, total, limit, onPage }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = new Set(
    [1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(p => p >= 1 && p <= totalPages)
  );
  const sorted = [...pages].sort((a, b) => a - b);

  const btn = (label, page, disabled = false, active = false) => (
    <button
      key={label}
      onClick={() => !disabled && onPage(page)}
      disabled={disabled}
      className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-colors
        ${active ? 'bg-violet-600 text-white font-bold' : 'bg-white/5 border border-white/10 hover:border-violet-500 hover:text-violet-400 text-gray-400'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  );

  let prev = null;
  const pageButtons = [];
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) {
      pageButtons.push(<span key={`ellipsis-${p}`} className="w-10 h-10 flex items-center justify-center text-gray-500 text-sm">…</span>);
    }
    pageButtons.push(btn(p, p, false, p === currentPage));
    prev = p;
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {btn(<span className="material-symbols-outlined text-base">chevron_left</span>, currentPage - 1, currentPage === 1)}
      {pageButtons}
      {btn(<span className="material-symbols-outlined text-base">chevron_right</span>, currentPage + 1, currentPage === totalPages)}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Singles() {
  const [searchParams] = useSearchParams();

  // Filters
  const [games, setGames]       = useState([]); // all games from API
  const [rarities, setRarities] = useState([]);
  const [allSets, setAllSets]   = useState([]);
  const [setQuery, setSetQuery] = useState('');

  const [selectedGames,      setSelectedGames]      = useState(() => searchParams.get('game') ? [searchParams.get('game')] : []);
  const [selectedRarities,   setSelectedRarities]   = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedSets,       setSelectedSets]       = useState([]);
  const [priceMax,           setPriceMax]           = useState(5000000);
  const [sort,               setSort]               = useState('');
  const [search,             setSearch]             = useState('');
  const [page,               setPage]               = useState(1);
  const [viewMode,           setViewMode]           = useState('grid'); // 'grid' | 'list'
  const [mobileOpen,         setMobileOpen]         = useState(false);

  // Results
  const [cards,   setCards]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  const debouncedSearch = useDebounce(search, 350);
  const debouncedPrice  = useDebounce(priceMax, 400);

  // Load games
  useEffect(() => {
    api.games().then(data => setGames(data?.games || data || [])).catch(() => {});
  }, []);

  // Load rarities when games change
  useEffect(() => {
    api.rarities(selectedGames).then(data => setRarities(data?.rarities || data || [])).catch(() => {});
  }, [selectedGames]);

  // Load sets when games change
  useEffect(() => {
    if (!selectedGames.length) { setAllSets([]); return; }
    Promise.all(selectedGames.map(g => api.sets(g).catch(() => []))).then(results => {
      setAllSets(results.flat());
    });
    setSelectedSets([]);
  }, [selectedGames]);

  // Load cards
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const filters = {
      game:      selectedGames,
      rarity:    selectedRarities,
      condition: selectedConditions,
      set:       selectedSets,
      priceMax:  debouncedPrice < 5000000 ? debouncedPrice : undefined,
      q:         debouncedSearch || undefined,
      sort:      sort || undefined,
      page,
      limit: LIMIT,
    };
    api.cards.list(filters).then(res => {
      if (cancelled) return;
      const data = res.data || res;
      setCards(Array.isArray(data) ? data : []);
      setTotal(res.total ?? (Array.isArray(data) ? data.length : 0));
    }).catch(() => {
      if (!cancelled) setCards([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedGames, selectedRarities, selectedConditions, selectedSets, debouncedPrice, debouncedSearch, sort, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [selectedGames, selectedRarities, selectedConditions, selectedSets, debouncedPrice, debouncedSearch, sort]);

  const toggleFilter = (setter, value) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const clearAll = () => {
    setSelectedGames([]);
    setSelectedRarities([]);
    setSelectedConditions([]);
    setSelectedSets([]);
    setPriceMax(5000000);
    setSearch('');
    setSort('');
    setPage(1);
  };

  const filteredSets = allSets.filter(s =>
    (s.name || s.setName || '').toLowerCase().includes(setQuery.toLowerCase())
  );

  // ── Filter panel (shared between desktop sidebar + mobile drawer) ──────────
  const FilterPanel = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-white">Filtros</h2>
        <button onClick={clearAll} className="text-xs text-violet-400 hover:underline font-semibold">
          Limpiar todo
        </button>
      </div>

      {/* Game */}
      <FilterGroup icon="sports_esports" title="Juego">
        <div className="space-y-1 pt-1">
          {games.length === 0
            ? <p className="text-xs text-gray-500">Cargando...</p>
            : games.map(g => (
                <FilterCheck key={g.id} label={g.name} name="game" value={g.id}
                  checked={selectedGames.includes(g.id)}
                  onChange={() => toggleFilter(setSelectedGames, g.id)} />
              ))
          }
        </div>
      </FilterGroup>

      {/* Rarity */}
      <FilterGroup icon="auto_awesome" title="Rareza">
        <div className="space-y-1 pt-1">
          {rarities.length === 0
            ? <p className="text-xs text-gray-500">{selectedGames.length ? 'Cargando...' : 'Selecciona un juego.'}</p>
            : rarities.map(r => {
                const val = r.name || r.id || r;
                return <FilterCheck key={val} label={r.name || r} name="rarity" value={val}
                  checked={selectedRarities.includes(val)}
                  onChange={() => toggleFilter(setSelectedRarities, val)} />;
              })
          }
        </div>
      </FilterGroup>

      {/* Price */}
      <FilterGroup icon="payments" title="Precio">
        <div className="pt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>$0</span><span>{formatCLP(priceMax)}</span>
          </div>
          <input type="range" min={0} max={5000000} step={10000} value={priceMax}
            onChange={e => setPriceMax(Number(e.target.value))}
            className="w-full accent-violet-600" />
          <p className="text-xs text-gray-500 mt-2">Hasta {formatCLP(priceMax)}</p>
        </div>
      </FilterGroup>

      {/* Condition */}
      <FilterGroup icon="verified" title="Condición">
        <div className="space-y-1 pt-1">
          {Object.entries(COND_LABELS).map(([key, label]) => (
            <FilterCheck key={key} label={label} name="condition" value={key}
              checked={selectedConditions.includes(key)}
              onChange={() => toggleFilter(setSelectedConditions, key)} />
          ))}
        </div>
      </FilterGroup>

      {/* Set */}
      <FilterGroup icon="folder" title="Set / Expansión">
        <div className="pt-2 space-y-2">
          {!selectedGames.length
            ? <p className="text-xs text-gray-500">Selecciona un juego primero.</p>
            : <>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Buscar set..."
                    value={setQuery}
                    onChange={e => setSetQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredSets.map(s => {
                    const val = s.id || s.setId || s.code || '';
                    return <FilterCheck key={val} label={s.name || s.setName || val} name="set" value={val}
                      checked={selectedSets.includes(val)}
                      onChange={() => toggleFilter(setSelectedSets, val)} />;
                  })}
                </div>
              </>
          }
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Mobile filter drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[85vw] max-w-sm bg-[#141414] border-r border-white/10 h-full overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Filtros</h2>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-white/5 rounded-xl">
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
          <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
          <span className="text-white font-medium">Singles</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-1">Singles</h1>
        <p className="text-gray-500 mb-8">Cartas individuales en stock</p>

        <div className="flex gap-6 lg:gap-8 items-start">

          {/* ── Desktop filter sidebar ── */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24">
            <FilterPanel />
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">

            {/* Top bar */}
            <div className="flex flex-col gap-3 mb-6 bg-white/5 rounded-2xl border border-white/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  <span className="font-bold text-white">{loading ? '—' : total.toLocaleString('es-CL')}</span> resultados
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Mobile filter button */}
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400"
                >
                  <span className="material-symbols-outlined text-base">tune</span>
                  Filtros
                </button>

                {/* Search */}
                <div className="relative flex-1 min-w-[140px]">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">search</span>
                  <input
                    type="text"
                    placeholder="Buscar carta..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="pl-3 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {/* View toggle */}
                <div className="flex items-center bg-white/5 rounded-xl p-1 gap-1">
                  {['grid', 'list'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                        ${viewMode === mode ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {mode === 'grid' ? 'grid_view' : 'view_list'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid / List */}
            {loading ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'
                : 'flex flex-col gap-3'
              }>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`bg-white/5 rounded-2xl animate-pulse ${viewMode === 'grid' ? 'aspect-[3/4]' : 'h-24'}`} />
                ))}
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <span className="material-symbols-outlined text-5xl block mb-4">search_off</span>
                <p className="font-semibold">No se encontraron cartas con esos filtros.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'
                : 'flex flex-col gap-3'
              }>
                {cards.map(card => <CardItem key={card.id} card={card} viewMode={viewMode} />)}
              </div>
            )}

            <Pagination currentPage={page} total={total} limit={LIMIT} onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </div>
        </div>
      </div>
    </div>
  );
}
