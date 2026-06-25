import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCLP } from '../api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { showToast } from '../components/ui/Toast';

// ─── Game rules ───────────────────────────────────────────────────────────────
const GAME_RULES = {
  pokemon:   { min: 60, max: 60, limit: 4 },
  yugioh:    { min: 40, max: 60, limit: 3 },
  magic:     { min: 60, max: 99, limit: 4 },
  riftbound: { min: 40, max: 60, limit: 3 },
  onepiece:  { min: 50, max: 50, limit: 4 },
  default:   { min: 40, max: 60, limit: 4 },
};
function gRules(gameId) { return GAME_RULES[gameId] || GAME_RULES.default; }

// ─── Progress bar fill color ──────────────────────────────────────────────────
function progressColor(total, g) {
  if (total > g.max)  return 'from-red-500 to-red-400';
  if (total >= g.min) return 'from-green-500 to-green-400';
  if (total >= g.min * 0.75) return 'from-amber-500 to-amber-400';
  return 'from-violet-600 to-violet-400';
}

// ─── Card tile (grid view) ────────────────────────────────────────────────────
function CardTile({ card, inDeck, maxed, flashing, onAdd }) {
  return (
    <div
      className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[3/4] bg-white/5 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl hover:z-10 group ${flashing ? 'ring-2 ring-violet-400' : ''}`}
      onClick={() => onAdd(card.id)}
    >
      <img src={card.img} alt={card.name} className="w-full h-full object-contain" />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
        <p className="text-white text-[11px] font-bold leading-tight mb-1.5 truncate">{card.name}</p>
        <button
          disabled={maxed}
          onClick={e => { e.stopPropagation(); onAdd(card.id); }}
          className="w-full py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 text-white"
        >
          <span className="material-symbols-outlined text-xs">add</span>
          {inDeck > 0 ? `x${inDeck}` : 'Agregar'}
        </button>
      </div>

      {/* Qty badge */}
      {inDeck > 0 && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-600 text-white text-[10px] font-black rounded-md flex items-center justify-center shadow">
          {inDeck}
        </div>
      )}
    </div>
  );
}

// ─── Card row (list view) ─────────────────────────────────────────────────────
function CardRow({ card, inDeck, maxed, onAdd }) {
  return (
    <div
      className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10 hover:border-violet-500/50 transition-colors cursor-pointer group"
      onClick={() => onAdd(card.id)}
    >
      <img src={card.img} alt={card.name} className="w-10 h-14 object-cover flex-shrink-0 rounded-lg" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate text-white">{card.name}</p>
        <p className="text-xs text-gray-400">{card.type} · {card.rarity}</p>
      </div>
      <button
        disabled={maxed}
        onClick={e => { e.stopPropagation(); onAdd(card.id); }}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex-shrink-0 ${maxed ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-violet-600/20 text-violet-400 hover:bg-violet-600 hover:text-white'}`}
      >
        {inDeck > 0 ? `x${inDeck} +` : '+ Agregar'}
      </button>
    </div>
  );
}

// ─── Deck card row ────────────────────────────────────────────────────────────
function DeckRow({ card, qty, onRemove }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="w-[22px] h-[22px] bg-violet-600 text-white text-[11px] font-black rounded-md flex items-center justify-center flex-shrink-0">
        {qty}
      </div>
      <img src={card.img} alt={card.name} className="w-7 h-9 rounded-md object-contain flex-shrink-0 border border-white/10" />
      <span className="text-xs font-semibold text-gray-300 flex-1 truncate">{card.name}</span>
      <button
        onClick={() => onRemove(card.id)}
        className="w-[22px] h-[22px] rounded-md text-gray-600 group-hover:text-red-400 group-hover:bg-red-400/10 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <span className="material-symbols-outlined text-sm">remove</span>
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Deckbuilder() {
  const { isLoggedIn } = useAuthStore();
  const { refresh: refreshCart } = useCartStore();
  const navigate = useNavigate();

  const [games,         setGames]         = useState([]);
  const [gamesLoading,  setGamesLoading]  = useState(true);
  const [currentGame,   setCurrentGame]   = useState(null);
  const [allCards,      setAllCards]      = useState([]);
  const [cardsLoading,  setCardsLoading]  = useState(false);
  const [deck,          setDeck]          = useState({});   // { [id]: { card, qty } }
  const [deckName,      setDeckName]      = useState('Mi Deck');
  const [search,        setSearch]        = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeType,    setActiveType]    = useState('all');
  const [currentView,   setCurrentView]   = useState('grid');
  const [savedDeckId,   setSavedDeckId]   = useState(null);
  const [mobileDeckOpen, setMobileDeckOpen] = useState(false);
  const [flashIds,      setFlashIds]      = useState(new Set());
  const [saving,        setSaving]        = useState(false);
  const [addingToCart,  setAddingToCart]  = useState(false);

  const searchDebounce = useRef(null);

  // ── Load games ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api.games().then(res => {
      const list = res.games || res || [];
      setGames(list);
      if (list.length > 0) setCurrentGame(list[0].id);
    }).catch(() => {}).finally(() => setGamesLoading(false));
  }, []);

  // ── Load cards when game changes ────────────────────────────────────────────
  useEffect(() => {
    if (!currentGame) return;
    setCardsLoading(true);
    setAllCards([]);
    setActiveType('all');
    setSearch('');
    setDebouncedSearch('');
    setDeck({});
    setSavedDeckId(null);

    api.cards.list({ game: [currentGame], limit: 80 }).then(res => {
      const data = res.data || res || [];
      setAllCards(data.map(c => {
        const inv = c.inventory && typeof c.inventory === 'object' ? c.inventory : {};
        const lang = inv.default || Object.values(inv)[0] || {};
        const price = (lang.nm || lang.lp || lang.mp || lang.hp)?.price ?? 0;
        return { id: c.id, name: c.name, type: c.type || 'Otro', img: c.imageSm || c.image || '', rarity: c.rarity || '', price };
      }));
    }).catch(() => {}).finally(() => setCardsLoading(false));
  }, [currentGame]);

  // ── Search debounce ─────────────────────────────────────────────────────────
  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(val), 250);
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const types         = [...new Set(allCards.map(c => c.type).filter(Boolean))];
  const filteredCards = allCards.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchType   = activeType === 'all' || c.type === activeType;
    return matchSearch && matchType;
  });

  const deckEntries = Object.values(deck);
  const deckTotal   = deckEntries.reduce((s, v) => s + v.qty, 0);
  const g           = gRules(currentGame);
  const deckPct     = currentGame ? Math.min((deckTotal / g.min) * 100, 100) : 0;

  // ── Add / remove ────────────────────────────────────────────────────────────
  function addCard(id) {
    const card    = allCards.find(c => c.id === id);
    if (!card) return;
    const rules   = gRules(currentGame);
    const current = deck[id]?.qty ?? 0;
    const total   = deckEntries.reduce((s, v) => s + v.qty, 0);
    if (current >= rules.limit || total >= rules.max) return;

    setDeck(prev => ({ ...prev, [id]: { card, qty: (prev[id]?.qty ?? 0) + 1 } }));

    // Flash ring
    setFlashIds(prev => new Set([...prev, id]));
    setTimeout(() => setFlashIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 400);
  }

  function removeCard(id) {
    setDeck(prev => {
      const next = { ...prev };
      if (!next[id]) return next;
      const newQty = next[id].qty - 1;
      if (newQty <= 0) { delete next[id]; } else { next[id] = { ...next[id], qty: newQty }; }
      return next;
    });
  }

  function clearDeck() {
    setDeck({});
    setSavedDeckId(null);
  }

  // ── Save deck ───────────────────────────────────────────────────────────────
  async function saveDeck() {
    if (!isLoggedIn) { showToast('Inicia sesión para guardar decks', 'warn'); return; }
    const name   = deckName.trim() || 'Mi Deck';
    const cartas = deckEntries.map(({ card, qty }) => ({ cardId: card.id, qty }));
    if (cartas.length === 0) { showToast('El deck está vacío', 'warn'); return; }
    setSaving(true);
    try {
      if (savedDeckId) {
        await api.decks.update(savedDeckId, { name, cartas });
      } else {
        const result = await api.decks.create(name, currentGame, cartas);
        setSavedDeckId(result.id);
      }
      showToast('¡Deck guardado correctamente!', 'success');
    } catch (ex) {
      showToast(ex.error || 'Error al guardar el deck', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Add deck to cart ────────────────────────────────────────────────────────
  async function addDeckToCart() {
    setAddingToCart(true);
    try {
      if (savedDeckId) {
        await api.decks.addToCart(savedDeckId);
      } else {
        for (const { card, qty } of deckEntries) {
          await api.cart.addItem(card.id, 'nm', qty);
        }
      }
      showToast('¡Deck agregado al carrito!', 'success');
      refreshCart();
      navigate('/cart');
    } catch (ex) {
      showToast(ex.error || 'Error al agregar al carrito', 'error');
      setAddingToCart(false);
    }
  }

  // ── Deck status message ─────────────────────────────────────────────────────
  function deckStatusMsg() {
    if (!currentGame) return '';
    if (deckTotal === 0)       return 'Añadí cartas para empezar';
    if (deckTotal < g.min)     return `Faltan ${g.min - deckTotal} cartas para el mínimo`;
    if (deckTotal === g.min)   return '¡Deck completo al mínimo!';
    if (deckTotal < g.max)     return `${g.max - deckTotal} lugares disponibles`;
    return '¡Deck al máximo!';
  }

  // ── Price breakdown ─────────────────────────────────────────────────────────
  const typeBreakdown = {};
  let grandTotal = 0;
  deckEntries.forEach(({ card, qty }) => {
    const line = card.price * qty;
    grandTotal += line;
    typeBreakdown[card.type] = (typeBreakdown[card.type] || 0) + line;
  });

  // ── Deck groups ─────────────────────────────────────────────────────────────
  const deckGroups = {};
  deckEntries.forEach(({ card, qty }) => {
    if (!deckGroups[card.type]) deckGroups[card.type] = [];
    deckGroups[card.type].push({ card, qty });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Deck panel (shared between desktop right column and mobile drawer)
  // ────────────────────────────────────────────────────────────────────────────
  const DeckPanel = () => (
    <div className="bg-[#111] border-l border-white/10 flex flex-col h-full">

      {/* Header */}
      <div className="p-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-violet-400 text-xl">style</span>
          <input
            type="text"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            placeholder="Nombre del deck..."
            className="flex-1 bg-transparent border-none outline-none text-base font-extrabold text-white placeholder-gray-500"
          />
        </div>

        {/* Count + progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cartas</span>
          <div className="flex items-center gap-1">
            <span className="font-black text-2xl text-violet-400 leading-none">{deckTotal}</span>
            <span className="text-gray-600 font-bold text-lg leading-none">/</span>
            <span className="text-gray-500 font-bold text-base leading-none">{currentGame ? g.min : 40}</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${progressColor(deckTotal, g)}`}
            style={{ width: `${deckPct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500 font-medium">{deckStatusMsg()}</p>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={clearDeck}
            className="flex-1 py-2 text-xs font-bold text-gray-500 border border-white/10 rounded-xl hover:border-red-500/50 hover:text-red-400 transition-all flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>Limpiar
          </button>
          <button
            onClick={saveDeck}
            disabled={saving}
            className="flex-1 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">{saving ? 'progress_activity' : 'save'}</span>
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {deckEntries.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl text-gray-600">style</span>
          </div>
          <p className="text-sm font-bold text-gray-500 mb-1">El deck está vacío</p>
          <p className="text-xs text-gray-600">Haz clic en una carta para agregarla</p>
        </div>
      )}

      {/* Card list */}
      {deckEntries.length > 0 && (
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {Object.entries(deckGroups).map(([type, items]) => {
            const typeCount = items.reduce((s, i) => s + i.qty, 0);
            return (
              <div key={type}>
                <div className="flex items-center justify-between px-2 pt-3 pb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{type}</span>
                  <span className="text-[10px] font-black text-gray-500">{typeCount}</span>
                </div>
                {items.map(({ card, qty }) => (
                  <DeckRow key={card.id} card={card} qty={qty} onRemove={removeCard} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Price summary */}
      {deckEntries.length > 0 && (
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Resumen de precio</p>
          <div className="space-y-1.5 mb-3">
            {Object.entries(typeBreakdown).map(([type, amount]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{type}</span>
                <span className="font-semibold text-gray-300">{formatCLP(amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between py-2.5 border-t border-white/10">
            <span className="text-sm font-bold text-white">Total deck</span>
            <span className="text-base font-black text-violet-400">{formatCLP(grandTotal)}</span>
          </div>
          <button
            onClick={addDeckToCart}
            disabled={addingToCart}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-sm">shopping_cart</span>
            {addingToCart ? 'Agregando...' : 'Agregar al carrito'}
          </button>
        </div>
      )}
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_360px]">

      {/* ══ LEFT: Card search ══ */}
      <div className="overflow-y-auto bg-[#0f0f0f]">
        <div className="p-5">

          {/* Game tabs */}
          <div className="flex gap-2 mb-5">
            {gamesLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Cargando juegos...
              </div>
            ) : games.length === 0 ? (
              <p className="text-xs text-gray-500">No hay juegos disponibles.</p>
            ) : (
              games.map(game => (
                <button
                  key={game.id}
                  onClick={() => setCurrentGame(game.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                    currentGame === game.id
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:border-violet-500/50 hover:text-white'
                  }`}
                >
                  {game.name}
                </button>
              ))
            )}
          </div>

          {/* Search + filters row */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-base">search</span>
              <input
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          {/* Type chips */}
          {types.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              <button
                onClick={() => setActiveType('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all flex-shrink-0 ${
                  activeType === 'all'
                    ? 'border-violet-500 text-violet-400 bg-violet-600/10'
                    : 'border-white/10 text-gray-500 hover:border-violet-500/50 hover:text-white'
                }`}
              >
                Todos
              </button>
              {types.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all flex-shrink-0 ${
                    activeType === type
                      ? 'border-violet-500 text-violet-400 bg-violet-600/10'
                      : 'border-white/10 text-gray-500 hover:border-violet-500/50 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {/* Count + view toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500 font-medium">
              {cardsLoading ? '...' : `${filteredCards.length} cartas encontradas`}
            </p>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setCurrentView('grid')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${currentView === 'grid' ? 'bg-violet-600 text-white' : 'text-gray-500'}`}
              >
                <span className="material-symbols-outlined text-sm">grid_view</span>
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${currentView === 'list' ? 'bg-violet-600 text-white' : 'text-gray-500'}`}
              >
                <span className="material-symbols-outlined text-sm">view_list</span>
              </button>
            </div>
          </div>

          {/* Loading */}
          {cardsLoading && (
            <div className="flex justify-center py-16">
              <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin">progress_activity</span>
            </div>
          )}

          {/* No results */}
          {!cardsLoading && filteredCards.length === 0 && allCards.length > 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-gray-600 block mb-3">search_off</span>
              <p className="text-sm text-gray-500">No hay cartas que coincidan.</p>
            </div>
          )}

          {/* Card grid */}
          {!cardsLoading && filteredCards.length > 0 && currentView === 'grid' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredCards.map(card => {
                const inDeck = deck[card.id]?.qty ?? 0;
                const maxed  = inDeck >= gRules(currentGame).limit;
                return (
                  <CardTile
                    key={card.id}
                    card={card}
                    inDeck={inDeck}
                    maxed={maxed}
                    flashing={flashIds.has(card.id)}
                    onAdd={addCard}
                  />
                );
              })}
            </div>
          )}

          {/* Card list */}
          {!cardsLoading && filteredCards.length > 0 && currentView === 'list' && (
            <div className="flex flex-col gap-2">
              {filteredCards.map(card => {
                const inDeck = deck[card.id]?.qty ?? 0;
                const maxed  = inDeck >= gRules(currentGame).limit;
                return (
                  <CardRow
                    key={card.id}
                    card={card}
                    inDeck={inDeck}
                    maxed={maxed}
                    onAdd={addCard}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT: Deck panel (desktop) ══ */}
      <div className="hidden lg:flex flex-col h-full">
        <DeckPanel />
      </div>

      {/* ══ Mobile deck toggle button ══ */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setMobileDeckOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-600/40 transition-all"
        >
          <span className="material-symbols-outlined text-base">style</span>
          <span>{deckTotal}</span>
        </button>
      </div>

      {/* ══ Mobile deck drawer ══ */}
      {mobileDeckOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col">
          <div className="flex-1 bg-black/60" onClick={() => setMobileDeckOpen(false)} />
          <div className="h-[75vh] overflow-hidden flex flex-col">
            <DeckPanel />
          </div>
        </div>
      )}
    </div>
  );
}
