import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../api';
import { showToast } from '../../components/ui/Toast';

const PAGE_SIZE = 25;

// ─── One Piece static sets ────────────────────────────────────────────────────
const ONEPIECE_SETS = [
  { id: 'OP-01', name: 'Romance Dawn' }, { id: 'OP-02', name: 'Paramount War' },
  { id: 'OP-03', name: 'Pillars of Strength' }, { id: 'OP-04', name: 'Kingdoms of Intrigue' },
  { id: 'OP-05', name: 'Awakening of the New Era' }, { id: 'OP-06', name: 'Wings of the Captain' },
  { id: 'OP-07', name: '500 Years in the Future' }, { id: 'OP-08', name: 'Two Legends' },
  { id: 'OP-09', name: 'The Four Emperors' }, { id: 'OP-10', name: 'Royal Blood' },
  { id: 'ST-01', name: 'Starter Deck: Straw Hat Crew' }, { id: 'ST-02', name: 'Starter Deck: Worst Generation' },
  { id: 'ST-12', name: 'Starter Deck: Zoro & Sanji' }, { id: 'ST-13', name: 'Starter Deck: The Three Captains' },
];

// ─── Rarity badge ─────────────────────────────────────────────────────────────
function rarityBadge(r = '') {
  const rl = r.toLowerCase();
  if (rl.includes('secret') || rl.includes('starlight')) return 'bg-yellow-500/15 text-yellow-400';
  if (rl.includes('ultra')) return 'bg-purple-500/15 text-purple-400';
  if (rl.includes('rare'))  return 'bg-blue-500/15 text-blue-400';
  return 'bg-white/5 text-gray-400';
}

// ─── Card preview tile ────────────────────────────────────────────────────────
function PreviewTile({ card, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(card.id)}
      className={`relative cursor-pointer rounded-xl overflow-hidden aspect-[3/4] bg-white/5 transition-all ${selected ? 'ring-2 ring-violet-500' : ''}`}
      title={card.name}
    >
      <img
        src={card.image || ''}
        alt={card.name}
        loading="lazy"
        className="w-full h-full object-contain"
        onError={e => { e.target.src = ''; }}
      />
      {selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-600 rounded-md flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-xs">check</span>
        </div>
      )}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-violet-600 transition-colors relative">
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  );
}

// ─── Edit card modal ──────────────────────────────────────────────────────────
function EditModal({ card, onSave, onClose }) {
  const [name, setName] = useState(card.name || '');
  const [lang, setLang] = useState('en');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const inv = card.inventory && typeof card.inventory === 'object' ? card.inventory : {};
    const existingLang = Object.keys(inv).find(l => l !== 'default') || 'en';
    setLang(existingLang);
  }, [card]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.admin.cards.update(card.id, { name: name.trim(), language: lang });
      onSave();
      showToast('Carta actualizada');
    } catch (ex) {
      showToast(ex.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white">Editar carta</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Idioma</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm">
              {[['en','Inglés'],['es','Español'],['jp','Japonés'],['pt','Portugués'],['fr','Francés'],['de','Alemán'],['ko','Coreano']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-violet-400 text-base mt-0.5">info</span>
            <p className="text-xs text-gray-400">Para ajustar precio y stock, usá la sección <span className="font-semibold text-gray-300">Inventario</span>.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Clear catalog modal ──────────────────────────────────────────────────────
function ClearModal({ count, onConfirm, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleConfirm() {
    if (!password) { setError('Ingresá tu contraseña.'); return; }
    setLoading(true); setError('');
    try {
      await onConfirm(password);
    } catch (ex) {
      setError(ex.error || 'Contraseña incorrecta o error al eliminar.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-red-400 text-xl">warning</span>
          </div>
          <div>
            <h3 className="font-bold text-white">Limpiar catálogo completo</h3>
            <p className="text-xs text-red-400 font-semibold">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Se eliminarán <strong className="text-white">{count ? `las ${count.toLocaleString('es-CL')} cartas` : 'todas las cartas'}</strong>. Ingresá tu contraseña para confirmar.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
            autoFocus
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm"
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition">Cancelar</button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
            {loading ? 'Eliminando...' : 'Eliminar todo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk stock modal ─────────────────────────────────────────────────────────
function BulkStockModal({ total, onConfirm, onClose }) {
  const [lang,   setLang]   = useState('en');
  const [data,   setData]   = useState({ nm: { price: '', qty: '' }, lp: { price: '', qty: '' }, mp: { price: '', qty: '' }, hp: { price: '', qty: '' } });
  const [saving, setSaving] = useState(false);

  function setField(cond, field, val) {
    setData(d => ({ ...d, [cond]: { ...d[cond], [field]: val } }));
  }

  async function handleConfirm() {
    const conditions = ['nm', 'lp', 'mp', 'hp']
      .filter(c => parseInt(data[c].price) > 0 || parseInt(data[c].qty) > 0)
      .map(c => ({ condition: c, price: parseInt(data[c].price) || 0, qty: parseInt(data[c].qty) || 0 }));
    if (!conditions.length) { showToast('Ingresá al menos un precio o stock', 'warn'); return; }
    setSaving(true);
    try {
      await onConfirm(lang, conditions);
    } catch (ex) {
      showToast(ex.error || 'Error al aplicar stock', 'error');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-violet-600/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-violet-400">inventory_2</span>
          </div>
          <div>
            <h3 className="font-bold text-white">Stock masivo</h3>
            <p className="text-xs text-gray-400">Se aplicará a <span className="font-semibold text-white">{total?.toLocaleString('es-CL') ?? '?'} cartas</span> según el filtro actual</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Idioma</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm">
              {[['en','Inglés'],['es','Español'],['jp','Japonés'],['pt','Portugués'],['fr','Francés'],['de','Alemán'],['ko','Coreano']].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  {['Condición', 'Precio (CLP)', 'Stock'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[['nm','NM','text-green-400'],['lp','LP','text-blue-400'],['mp','MP','text-amber-400'],['hp','HP','text-red-400']].map(([c, label, color]) => (
                  <tr key={c}>
                    <td className={`px-3 py-2 font-bold ${color}`}>{label}</td>
                    <td className="px-3 py-2">
                      <input type="number" value={data[c].price} min="0" placeholder="—"
                        onChange={e => setField(c, 'price', e.target.value)}
                        className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" value={data[c].qty} min="0" placeholder="—"
                        onChange={e => setField(c, 'qty', e.target.value)}
                        className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-amber-400 text-base mt-0.5">warning</span>
            <p className="text-xs text-gray-400">Solo se aplican las condiciones donde ingreses precio o stock. Las filas vacías no se tocan.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition">Cancelar</button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
            {saving ? 'Aplicando...' : 'Aplicar stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdminCards() {
  // Import panel
  const [importOpen,    setImportOpen]    = useState(false);
  const [currentGame,   setCurrentGame]   = useState('pokemon');
  const [allSets,       setAllSets]       = useState([]);
  const [setsLoading,   setSetsLoading]   = useState(false);
  const [setSearch,     setSetSearch]     = useState('');
  const [setDropOpen,   setSetDropOpen]   = useState(false);
  const [selectedSet,   setSelectedSet]   = useState(null);
  const [previewCards,  setPreviewCards]  = useState([]);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [previewing,    setPreviewing]    = useState(false);
  const [importing,     setImporting]     = useState(false);

  // Table
  const [tableCards,    setTableCards]    = useState([]);
  const [tableLoading,  setTableLoading]  = useState(true);
  const [tableTotal,    setTableTotal]    = useState(0);
  const [tableSearch,   setTableSearch]   = useState('');
  const [filterGame,         setFilterGame]         = useState('');
  const [filterSet,          setFilterSet]          = useState('');
  const [filterRarity,       setFilterRarity]       = useState('');
  const [tablePage,          setTablePage]          = useState(1);
  const [tableSets,          setTableSets]          = useState([]);
  const [tableSetsLoading,   setTableSetsLoading]   = useState(false);
  const [tableRarities,      setTableRarities]      = useState([]);

  // Stats
  const [stats, setStats] = useState({});

  // Modals
  const [editCard,        setEditCard]        = useState(null);
  const [clearModal,      setClearModal]      = useState(false);
  const [bulkStockModal,  setBulkStockModal]  = useState(false);

  const filterTimeout  = useRef(null);
  const setDropRef     = useRef(null);
  const isFirstRender  = useRef(true);

  useEffect(() => { loadStats(); loadTable(); }, []);

  // Re-fetch table whenever filters change (avoids stale closure from setTimeout)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    clearTimeout(filterTimeout.current);
    filterTimeout.current = setTimeout(() => loadTable(1), 350);
  }, [filterGame, filterSet, filterRarity, tableSearch]);

  // Close set dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (setDropRef.current && !setDropRef.current.contains(e.target)) setSetDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadStats() {
    try {
      const s = await api.admin.stats();
      setStats(s);
    } catch {}
  }

  async function loadTable(page = 1) {
    setTablePage(page);
    setTableLoading(true);
    try {
      const params = { limit: PAGE_SIZE, page };
      if (tableSearch)  params.q = tableSearch;
      if (filterGame)   params.game = filterGame;
      if (filterSet)    params.set = filterSet;
      if (filterRarity) params.rarity = filterRarity;
      console.log('[Cards] rarity enviada:', JSON.stringify(filterRarity), '| tableRarities:', tableRarities);
      const data = await api.admin.cards.list(params);
      setTableCards(data.data || data || []);
      setTableTotal(data.total ?? (data.data || data || []).length);
    } catch {
      setTableCards([]);
    } finally {
      setTableLoading(false);
    }
  }

  async function loadTableSets(game) {
    setTableSetsLoading(true);
    try {
      const data = await api.sets(game);
      setTableSets(data || []);
    } catch {
      setTableSets([]);
    } finally {
      setTableSetsLoading(false);
    }
  }

  async function loadTableRarities(game) {
    try {
      const data = await api.rarities(game ? [game] : []);
      setTableRarities(data?.rarities || data || []);
    } catch {
      setTableRarities([]);
    }
  }

  // ── Game switch ──────────────────────────────────────────────────────────────
  async function switchGame(game) {
    setCurrentGame(game);
    setAllSets([]);
    setSelectedSet(null);
    setSetSearch('');
    setPreviewCards([]);
    setSelectedIds(new Set());
    await loadSetsForGame(game);
  }

  async function loadSetsForGame(game) {
    setSetsLoading(true);
    try {
      let sets = [];
      if (game === 'pokemon') {
        const r = await fetch('https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=250');
        const d = await r.json();
        sets = d.data.map(s => ({ id: s.id, name: s.name, total: s.total, releaseDate: s.releaseDate }));
      } else if (game === 'yugioh') {
        const r = await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php');
        const d = await r.json();
        sets = d.map(s => ({ id: s.set_name, name: s.set_name, total: s.num_of_cards }));
      } else if (game === 'magic') {
        const r = await fetch('https://api.scryfall.com/sets');
        const d = await r.json();
        sets = d.data
          .filter(s => ['expansion','core','masters','draft_innovation'].includes(s.set_type))
          .sort((a, b) => (b.released_at || '').localeCompare(a.released_at || ''))
          .map(s => ({ id: s.code, name: s.name, total: s.card_count, releaseDate: s.released_at }));
      } else if (game === 'riftbound') {
        const r = await fetch('https://api.riftcodex.com/sets?size=100');
        const d = await r.json();
        sets = (d.items || []).map(s => ({ id: s.set_id.toLowerCase(), name: s.name, total: s.card_count, releaseDate: s.published_on?.slice(0, 10) }));
      } else if (game === 'onepiece') {
        sets = ONEPIECE_SETS;
      }
      setAllSets(sets);
      if (sets.length > 0) setSetDropOpen(true);
    } catch {
      showToast('Error al cargar sets', 'error');
    } finally {
      setSetsLoading(false);
    }
  }

  // ── Preview set ──────────────────────────────────────────────────────────────
  async function previewSet() {
    if (!selectedSet) return;
    setPreviewing(true);
    setPreviewCards([]);
    setSelectedIds(new Set());
    try {
      let cards = [];
      if (currentGame === 'pokemon') {
        const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${selectedSet.id}&pageSize=250&orderBy=number`);
        const d = await r.json();
        cards = d.data.map(c => ({ id: c.id, name: c.name, rarity: c.rarity || 'Common', image: c.images?.large || c.images?.small, game: 'pokemon', setId: selectedSet.id, setName: selectedSet.name, type: c.supertype, hp: c.hp, attacks: c.attacks, abilities: c.abilities, weaknesses: c.weaknesses, retreatCost: c.convertedRetreatCost, artist: c.artist, description: c.flavorText, imageSm: c.images?.small }));
      } else if (currentGame === 'yugioh') {
        const r = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${encodeURIComponent(selectedSet.id)}`);
        const d = await r.json();
        cards = (d.data || []).map(c => ({ id: `ygo-${c.id}`, name: c.name, rarity: c.card_sets?.find(s => s.set_name === selectedSet.id)?.set_rarity || 'Common', image: c.card_images?.[0]?.image_url, imageSm: c.card_images?.[0]?.image_url_small, game: 'yugioh', setId: selectedSet.id, setName: selectedSet.name, type: c.type, atk: c.atk, def: c.def, level: c.level, attribute: c.attribute, description: c.desc }));
      } else if (currentGame === 'magic') {
        const r = await fetch(`https://api.scryfall.com/cards/search?q=set:${selectedSet.id}&order=set&unique=prints`);
        const d = await r.json();
        cards = (d.data || []).map(c => ({ id: c.id, name: c.name, rarity: c.rarity, image: c.image_uris?.large || c.card_faces?.[0]?.image_uris?.large, imageSm: c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small, game: 'magic', setId: selectedSet.id, setName: selectedSet.name, type: c.type_line, manaCost: c.mana_cost, cmc: c.cmc, power: c.power, toughness: c.toughness, artist: c.artist, colors: c.colors, description: c.flavor_text || c.oracle_text }));
      } else if (currentGame === 'riftbound') {
        const r = await fetch(`https://api.riftcodex.com/cards?set_id=${selectedSet.id}&size=100&sort=collector_number`);
        const d = await r.json();
        cards = (d.items || []).map(c => ({ id: c.riftbound_id || c.id, name: c.name, rarity: c.classification?.rarity || 'Common', image: c.media?.image_url, imageSm: c.media?.image_url, game: 'riftbound', setId: selectedSet.id, setName: selectedSet.name, type: c.classification?.type }));
      } else if (currentGame === 'onepiece') {
        const r = await fetch(`https://www.optcgapi.com/api/sets/${selectedSet.id}/`);
        const d = await r.json();
        cards = (d || []).map(c => ({ id: c.card_set_id, name: c.card_name, rarity: c.rarity, image: c.card_image, imageSm: c.card_image, game: 'onepiece', setId: selectedSet.id, setName: selectedSet.name, type: c.card_type, atk: c.card_power ? parseInt(c.card_power) : null, cost: c.card_cost ? parseInt(c.card_cost) : null, description: c.card_text }));
      }
      setPreviewCards(cards);
      setSelectedIds(new Set(cards.map(c => c.id)));
    } catch (ex) {
      showToast('Error al cargar las cartas del set', 'error');
    } finally {
      setPreviewing(false);
    }
  }

  function toggleCard(id) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function toggleSelectAll(checked) {
    setSelectedIds(checked ? new Set(previewCards.map(c => c.id)) : new Set());
  }

  // ── Import ───────────────────────────────────────────────────────────────────
  async function importSet() {
    if (selectedIds.size === 0) { showToast('Seleccioná al menos una carta', 'warn'); return; }
    setImporting(true);
    const cards = previewCards.filter(c => selectedIds.has(c.id));
    try {
      await api.admin.cards.importSet({ game: currentGame, setId: selectedSet.id, setName: selectedSet.name, active: false, cards });
      showToast(`${cards.length} cartas importadas correctamente`);
      loadTable();
      loadStats();
    } catch (ex) {
      showToast(ex.error || 'Error al importar', 'error');
    } finally {
      setImporting(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────
  async function toggleActive(id, active) {
    try {
      await api.admin.cards.setActive(id, active);
      setTableCards(prev => prev.map(c => c.id === id ? { ...c, active } : c));
      showToast(active ? 'Carta activada' : 'Carta desactivada');
    } catch (ex) {
      showToast(ex.error || 'Error al actualizar', 'error');
    }
  }

  // ── Activate all visible ──────────────────────────────────────────────────────
  async function activateAllVisible() {
    let allCards;
    try {
      const params = { limit: 9999 };
      if (tableSearch)  params.q = tableSearch;
      if (filterGame)   params.game = filterGame;
      if (filterSet)    params.set = filterSet;
      if (filterRarity) params.rarity = filterRarity;
      const data = await api.admin.cards.list(params);
      allCards = data.data || data || [];
    } catch {
      showToast('Error al cargar cartas', 'error');
      return;
    }
    const inactive = allCards.filter(c => !c.active);
    if (!inactive.length) { showToast('Todas las cartas del filtro ya están activas'); return; }
    if (!confirm(`¿Activar ${inactive.length} carta${inactive.length !== 1 ? 's' : ''} inactivas?`)) return;
    await Promise.all(inactive.map(c => api.admin.cards.setActive(c.id, true).catch(() => {})));
    loadTable(tablePage);
    showToast(`${inactive.length} cartas activadas`);
  }

  async function handleBulkStock(lang, conditions) {
    let allCards;
    try {
      const params = { limit: 9999 };
      if (tableSearch)  params.q = tableSearch;
      if (filterGame)   params.game = filterGame;
      if (filterSet)    params.set = filterSet;
      if (filterRarity) params.rarity = filterRarity;
      const data = await api.admin.cards.list(params);
      allCards = data.data || data || [];
    } catch {
      showToast('Error al cargar cartas', 'error');
      return;
    }
    if (!allCards.length) { showToast('No hay cartas que coincidan con el filtro', 'warn'); return; }
    const rows = [];
    allCards.forEach(card => {
      conditions.forEach(({ condition, price, qty }) => {
        rows.push({ cardId: card.id, condition, qty, price, language: lang });
      });
    });
    await api.admin.inventory.bulkUpload(rows);
    showToast(`Stock aplicado a ${allCards.length} carta${allCards.length !== 1 ? 's' : ''}`);
    setBulkStockModal(false);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function deleteCard(id) {
    if (!confirm('¿Eliminar esta carta del catálogo?')) return;
    try {
      await api.admin.cards.delete(id);
      showToast('Carta eliminada');
      loadTable();
    } catch (ex) {
      showToast(ex.error || 'Error al eliminar', 'error');
    }
  }

  // ── Clear catalog ─────────────────────────────────────────────────────────────
  async function handleClearCatalog(password) {
    await api.admin.cards.clearCatalog(password);
    setClearModal(false);
    showToast('Catálogo eliminado');
    loadTable();
    loadStats();
  }

  const filteredSets = allSets.filter(s => s.name.toLowerCase().includes(setSearch.toLowerCase()));
  const totalPages   = Math.ceil(tableTotal / PAGE_SIZE);

  const GAMES = [
    { id: 'pokemon',   label: '⚡ Pokémon TCG'   },
    { id: 'yugioh',    label: '⭐ Yu-Gi-Oh!'      },
    { id: 'magic',     label: '🔮 Magic'           },
    { id: 'riftbound', label: '⚔️ Riftbound'       },
    { id: 'onepiece',  label: '☠️ One Piece'       },
  ];
  const GAME_LABELS = Object.fromEntries(GAMES.map(g => [g.id, g.label]));

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 space-y-8">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: 'Cartas en catálogo',  icon: 'style',             color: 'text-violet-400', bg: 'bg-violet-600/15', val: stats.totalCards },
          { label: 'Sets importados',     icon: 'collections_bookmark', color: 'text-purple-400', bg: 'bg-purple-600/15', val: stats.totalSets },
          { label: 'Juegos activos',      icon: 'sports_esports',    color: 'text-orange-400', bg: 'bg-orange-500/15', val: 5 },
          { label: 'Nuevas esta semana',  icon: 'trending_up',       color: 'text-green-400',  bg: 'bg-green-500/15',  val: stats.newThisWeek },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined ${s.color} text-xl`}>{s.icon}</span>
            </div>
            <p className="text-3xl font-black text-white">{s.val?.toLocaleString('es-CL') ?? '—'}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Import panel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/15 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-400 text-lg">cloud_download</span>
            </div>
            <div>
              <h2 className="font-bold text-white">Importar edición completa</h2>
              <p className="text-xs text-gray-400">Carga todas las cartas de un set directamente desde la API oficial</p>
            </div>
          </div>
          <button
            onClick={() => {
              const opening = !importOpen;
              setImportOpen(opening);
              if (opening && allSets.length === 0) loadSetsForGame(currentGame);
            }}
            className="text-sm font-semibold text-violet-400 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">{importOpen ? 'expand_less' : 'expand_more'}</span>
            {importOpen ? 'Colapsar' : 'Expandir'}
          </button>
        </div>

        {importOpen && (
          <>
            {/* Step 1: game */}
            <div className="p-6 border-b border-white/10">
              <p className="text-sm font-semibold text-gray-300 mb-3">1. Selecciona el juego</p>
              <div className="flex gap-2 flex-wrap">
                {GAMES.map(g => (
                  <button key={g.id} onClick={() => switchGame(g.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      currentGame === g.id
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-white/10 text-gray-400 hover:border-violet-500/50 hover:text-white'
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: set */}
            <div className="p-6 border-b border-white/10">
              <p className="text-sm font-semibold text-gray-300 mb-3">2. Elige el set / edición</p>
              <div className="flex gap-3">
                <div className="relative flex-1" ref={setDropRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={setSearch}
                      onChange={e => setSetSearch(e.target.value)}
                      onFocus={() => { if (allSets.length) setSetDropOpen(true); }}
                      placeholder="Buscar set por nombre..."
                      className="w-full pl-4 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none">search</span>
                  </div>
                  {setDropOpen && filteredSets.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto">
                      {filteredSets.slice(0, 80).map(s => (
                        <button key={s.id}
                          onMouseDown={() => { setSelectedSet(s); setSetSearch(s.name); setSetDropOpen(false); }}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-left transition-colors text-sm"
                        >
                          <span className="font-medium text-white">{s.name}</span>
                          <span className="text-gray-500 text-xs flex-shrink-0 ml-2">{s.total ? `${s.total} cartas` : ''} {s.releaseDate ? `· ${s.releaseDate?.slice(0, 7)}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {setsLoading && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Cargando sets...
                    </div>
                  )}
                </div>
                <button onClick={previewSet} disabled={!selectedSet || previewing}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">{previewing ? 'progress_activity' : 'visibility'}</span>
                  {previewing ? 'Cargando...' : 'Previsualizar'}
                </button>
              </div>
            </div>

            {/* Step 3: preview */}
            {previewCards.length > 0 && (
              <>
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-300">3. Previsualiza y selecciona las cartas</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedSet?.name} — {selectedSet?.total || '?'} cartas</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input type="checkbox"
                          checked={selectedIds.size === previewCards.length}
                          onChange={e => toggleSelectAll(e.target.checked)}
                          className="w-4 h-4 accent-violet-600" />
                        Seleccionar todo
                      </label>
                      <span className="text-sm font-semibold text-violet-400">{selectedIds.size} seleccionadas</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                    {previewCards.map(c => (
                      <PreviewTile key={c.id} card={c} selected={selectedIds.has(c.id)} onToggle={toggleCard} />
                    ))}
                  </div>
                </div>

                <div className="p-6 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {selectedIds.size} carta{selectedIds.size !== 1 ? 's' : ''} de "{selectedSet?.name}" se agregarán al catálogo
                  </p>
                  <button onClick={importSet} disabled={importing || selectedIds.size === 0}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    {importing ? 'Importando...' : 'Importar al catálogo'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Cards table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
          <h2 className="font-bold text-white">Cartas del catálogo</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none">search</span>
              <input type="text" value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                placeholder="Buscar carta..."
                className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors w-56" />
            </div>
            {/* Juego */}
            <select value={filterGame}
              onChange={e => {
                const g = e.target.value;
                setFilterGame(g); setFilterSet(''); setFilterRarity(''); setTableSets([]); setTableRarities([]);
                if (g) { loadTableSets(g); loadTableRarities(g); }
              }}
              className="bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
              <option value="">Todos los juegos</option>
              {GAMES.map(g => <option key={g.id} value={g.id}>{g.label.split(' ').slice(1).join(' ')}</option>)}
            </select>
            {/* Edición (solo si hay juego seleccionado) */}
            {filterGame && (
              <select value={filterSet} onChange={e => setFilterSet(e.target.value)}
                className="bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">{tableSetsLoading ? 'Cargando...' : 'Todas las ediciones'}</option>
                {tableSets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {/* Rareza */}
            <select value={filterRarity} onChange={e => setFilterRarity(e.target.value)}
              className="bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
              <option value="">Todas las rarezas</option>
              {tableRarities.map(r => {
                const val = r.name || r.id || r;
                return <option key={val} value={val}>{r.name || r}</option>;
              })}
            </select>
            <button onClick={activateAllVisible}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-xl transition border border-white/10">
              <span className="material-symbols-outlined text-base">toggle_on</span>
              Activar todo
            </button>
            <button onClick={() => setBulkStockModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-xl transition border border-white/10">
              <span className="material-symbols-outlined text-base">inventory_2</span>
              Stock masivo
            </button>
            <button onClick={() => setClearModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-xl transition border border-red-500/20">
              <span className="material-symbols-outlined text-base">delete_sweep</span>
              Limpiar catálogo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr className="text-left">
                {['Carta', 'Juego', 'Set', 'Rareza', 'Activo', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tableLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin block mb-2">progress_activity</span>
                    <p className="text-sm text-gray-400">Cargando catálogo...</p>
                  </td>
                </tr>
              )}
              {!tableLoading && tableCards.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-600 block mb-2">style</span>
                    <p className="text-sm text-gray-500">Backend no disponible o catálogo vacío.</p>
                  </td>
                </tr>
              )}
              {!tableLoading && tableCards.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        <img src={c.image || ''} alt={c.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-white">{c.name}</p>
                        <p className="text-xs text-gray-500">#{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{GAME_LABELS[c.game] || c.game}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.setName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${rarityBadge(c.rarity)}`}>{c.rarity || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={c.active !== false} onChange={active => toggleActive(c.id, active)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditCard(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-violet-600/15 text-gray-500 hover:text-violet-400 transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => deleteCard(c.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {tableTotal > 0
              ? `Mostrando ${(tablePage - 1) * PAGE_SIZE + 1}–${Math.min(tablePage * PAGE_SIZE, tableTotal)} de ${tableTotal} cartas`
              : 'Sin resultados'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => loadTable(tablePage - 1)} disabled={tablePage === 1}
                className="w-8 h-8 text-sm font-semibold rounded-lg text-gray-500 hover:bg-white/10 disabled:opacity-30 transition">‹</button>
              {(() => {
                const pages = [];
                for (let p = 1; p <= totalPages; p++) {
                  if (p === 1 || p === totalPages || Math.abs(p - tablePage) <= 2) pages.push(p);
                  else if (pages[pages.length - 1] !== '…') pages.push('…');
                }
                return pages.map((p, i) => p === '…'
                  ? <span key={i} className="w-8 h-8 flex items-center justify-center text-gray-500 text-sm">…</span>
                  : <button key={p} onClick={() => loadTable(p)}
                      className={`w-8 h-8 text-sm font-semibold rounded-lg transition ${p === tablePage ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-white/10'}`}>{p}</button>
                );
              })()}
              <button onClick={() => loadTable(tablePage + 1)} disabled={tablePage === totalPages}
                className="w-8 h-8 text-sm font-semibold rounded-lg text-gray-500 hover:bg-white/10 disabled:opacity-30 transition">›</button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editCard && (
        <EditModal
          card={editCard}
          onSave={() => { setEditCard(null); loadTable(); }}
          onClose={() => setEditCard(null)}
        />
      )}
      {clearModal && (
        <ClearModal
          count={tableTotal}
          onConfirm={handleClearCatalog}
          onClose={() => setClearModal(false)}
        />
      )}
      {bulkStockModal && (
        <BulkStockModal
          total={tableTotal}
          onConfirm={handleBulkStock}
          onClose={() => setBulkStockModal(false)}
        />
      )}
    </div>
  );
}
