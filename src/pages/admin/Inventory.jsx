import { useState, useEffect, useRef } from 'react';
import { api, formatCLP } from '../../api';
import { showToast } from '../../components/ui/Toast';

const PAGE_SIZE = 25;
const COND_COLORS = {
  nm: 'bg-green-500/15 text-green-400',
  lp: 'bg-blue-500/15 text-blue-400',
  mp: 'bg-amber-500/15 text-amber-400',
  hp: 'bg-red-500/15 text-red-400',
};
const LANG_LABELS = { en: 'EN', es: 'ES', jp: 'JP', pt: 'PT', fr: 'FR', de: 'DE', ko: 'KO' };

// ─── Edit stock modal ─────────────────────────────────────────────────────────
function StockModal({ item, onSave, onClose }) {
  const [cond,  setCond]  = useState(item.condition || 'nm');
  const [lang,  setLang]  = useState((item.language && item.language !== 'default') ? item.language : 'en');
  const [qty,   setQty]   = useState(item.qty ?? 0);
  const [price, setPrice] = useState(item.price ?? 0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!lang) { showToast('Seleccioná un idioma', 'error'); return; }
    setSaving(true);
    try {
      const payload = { condition: cond, language: lang, qty: parseInt(qty) || 0, price: parseInt(price) || 0 };
      if (item.language && item.language !== lang) payload.oldLanguage = item.language;
      await api.admin.inventory.updateStock(item.cardId, payload);
      onSave();
      showToast('Stock actualizado');
    } catch (ex) {
      showToast(ex.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-white">{item.cardName}</h3>
            <p className="text-xs text-gray-400">{item.setName} · {item.condition?.toUpperCase()} · {LANG_LABELS[item.language] || item.language?.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Condición</label>
            <select value={cond} onChange={e => setCond(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm">
              <option value="nm">NM — Near Mint</option>
              <option value="lp">LP — Lightly Played</option>
              <option value="mp">MP — Moderately Played</option>
              <option value="hp">HP — Heavily Played</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Idioma</label>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm">
              <option value="en">Inglés (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="jp">Japonés (JP)</option>
              <option value="pt">Portugués (PT)</option>
              <option value="fr">Francés (FR)</option>
              <option value="de">Alemán (DE)</option>
              <option value="ko">Coreano (KO)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Stock</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Precio (CLP)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-colors text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdminInventory() {
  const [inventory,   setInventory]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterGame,  setFilterGame]  = useState('');
  const [filterCond,  setFilterCond]  = useState('');
  const [filterLang,  setFilterLang]  = useState('');
  const [lowOnly,     setLowOnly]     = useState(false);
  const [page,        setPage]        = useState(1);
  const [editItem,    setEditItem]    = useState(null);
  const [bulkData,    setBulkData]    = useState([]);
  const [bulkFile,    setBulkFile]    = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => { loadInventory(); }, []);

  async function loadInventory() {
    setLoading(true);
    try {
      const data = await api.admin.inventory.list({ limit: 500 });
      setInventory(data.data || data || []);
    } catch {
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const total    = inventory.length;
  const inStock  = inventory.filter(i => i.qty > 0).length;
  const noStock  = inventory.filter(i => i.qty === 0).length;
  const critical = inventory.filter(i => i.qty > 0 && i.qty <= 5).length;

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = inventory.filter(i =>
    (!search  || i.cardName?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterGame || i.game === filterGame) &&
    (!filterCond || i.condition === filterCond) &&
    (!filterLang || (i.language || 'default') === filterLang) &&
    (!lowOnly  || i.qty <= 5)
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Bulk upload ───────────────────────────────────────────────────────────────
  async function parseFile(file) {
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const data = rows.slice(1).filter(r => r[0]).map((r, i) => ({
          row: i + 2,
          cardId:    String(r[0] || '').trim(),
          condition: String(r[1] || '').trim().toLowerCase(),
          qty:       parseInt(r[2]) || 0,
          price:     parseInt(r[3]) || 0,
          language:  String(r[4] || 'en').trim().toLowerCase() || 'en',
          valid: !!r[0] && ['nm', 'lp', 'mp', 'hp'].includes(String(r[1]).toLowerCase().trim()),
        }));
        setBulkData(data);
        setBulkFile(file.name);
      } catch {
        showToast('Error al leer el archivo. Verifica el formato.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleDrop(e) {
    e.preventDefault();
    dropRef.current?.classList.remove('border-violet-500');
    const file = e.dataTransfer?.files?.[0];
    if (file) parseFile(file);
  }

  async function downloadTemplate() {
    const XLSX = await import('xlsx');
    const rows = [
      ['card_id', 'condition', 'qty', 'price', 'language'],
      ['sv3pt5-54', 'nm', 10, 85990, 'en'],
      ['sv3pt5-54', 'lp', 5, 72000, 'en'],
      ['sv3pt5-193', 'nm', 3, 114000, 'en'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, 'plantilla_stock.xlsx');
  }

  async function confirmBulkUpload() {
    const valid = bulkData.filter(r => r.valid);
    if (!valid.length) { showToast('No hay filas válidas para importar', 'warn'); return; }
    setUploading(true);
    try {
      await api.admin.inventory.bulkUpload(valid);
      showToast(`${valid.length} registros importados correctamente`);
      setBulkData([]);
      setBulkFile('');
      loadInventory();
    } catch (ex) {
      showToast(ex.error || 'Error al importar', 'error');
    } finally {
      setUploading(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 space-y-8">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { label: 'Total SKUs',       icon: 'inventory_2',         color: 'text-violet-400', bg: 'bg-violet-600/15', val: total    },
          { label: 'En stock',         icon: 'check_circle',        color: 'text-green-400',  bg: 'bg-green-500/15',  val: inStock  },
          { label: 'Sin stock',        icon: 'remove_shopping_cart', color: 'text-red-400',   bg: 'bg-red-500/15',    val: noStock  },
          { label: 'Stock crítico (≤5)',icon: 'warning',             color: 'text-orange-400', bg: 'bg-orange-500/15', val: critical },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined ${s.color} text-xl`}>{s.icon}</span>
            </div>
            <p className="text-3xl font-black text-white">{loading ? '—' : s.val.toLocaleString('es-CL')}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk upload */}
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-green-400 text-lg">upload_file</span>
          </div>
          <div>
            <h2 className="font-bold text-white">Carga masiva de stock</h2>
            <p className="text-xs text-gray-400">Importa múltiples cartas con stock y precio desde un archivo Excel o CSV</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Format reference */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">Formato del archivo</p>
              <button onClick={downloadTemplate} className="text-xs font-semibold text-violet-400 flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-sm">download</span>
                Descargar plantilla
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-xs">
                <thead className="bg-white/5">
                  <tr>
                    {['Columna', 'Campo', 'Ejemplo'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[['A','card_id','sv3pt5-54'],['B','condition','nm / lp / mp / hp'],['C','qty','10'],['D','price (CLP)','85990'],['E','language','en / es / jp (opcional)']].map(([col, field, ex]) => (
                    <tr key={col}>
                      <td className="px-3 py-2 font-bold text-violet-400">{col}</td>
                      <td className="px-3 py-2 text-gray-300">{field}</td>
                      <td className="px-3 py-2 text-gray-500">{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Drop zone */}
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-3">Subir archivo</p>
            <div
              ref={dropRef}
              className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-600/5 transition-all"
              onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('border-violet-500'); }}
              onDragLeave={() => dropRef.current?.classList.remove('border-violet-500')}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <span className="material-symbols-outlined text-4xl text-gray-600 mb-3 block">upload_file</span>
              <p className="text-sm font-semibold text-gray-400">Arrastrá tu archivo aquí</p>
              <p className="text-xs text-gray-500 mt-1">o hacé clic para seleccionar</p>
              <p className="text-xs text-gray-600 mt-3">.xlsx · .xls · .csv</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }}
            />
          </div>
        </div>

        {/* Preview */}
        {bulkData.length > 0 && (
          <div className="border-t border-white/10">
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{bulkFile}</p>
                <p className="text-xs text-gray-400">
                  {bulkData.length} filas · {bulkData.filter(r => r.valid).length} válidas · {bulkData.filter(r => !r.valid).length} con errores
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setBulkData([]); setBulkFile(''); if (fileRef.current) fileRef.current.value = ''; }}
                  className="px-4 py-2 border border-white/10 text-gray-300 text-sm font-semibold rounded-xl hover:bg-white/5 transition">
                  Cancelar
                </button>
                <button onClick={confirmBulkUpload} disabled={uploading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  {uploading ? 'Importando...' : 'Confirmar carga'}
                </button>
              </div>
            </div>
            <div className="px-6 pb-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left">
                    {['#', 'card_id', 'Condición', 'Idioma', 'Stock', 'Precio', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bulkData.map(r => (
                    <tr key={r.row} className={r.valid ? '' : 'bg-red-500/5'}>
                      <td className="px-4 py-2 text-gray-500 text-xs">{r.row}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-300">{r.cardId}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${r.valid ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          {r.condition || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400">{(r.language || 'en').toUpperCase()}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{r.qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-300">{formatCLP(r.price)}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${r.valid ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                          <span className="material-symbols-outlined text-xs">{r.valid ? 'check' : 'error'}</span>
                          {r.valid ? 'OK' : 'Condición inválida'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Inventory table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
          <h2 className="font-bold text-white">Stock por carta</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none">search</span>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar carta..."
                className="pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors w-56" />
            </div>
            {[
              { val: filterGame,  setter: setFilterGame, options: [['','Todos los juegos'],['pokemon','Pokémon'],['onepiece','One Piece TCG'],['riftbound','Riftbound'],['yugioh','Yu-Gi-Oh!'],['magic','Magic']] },
              { val: filterCond,  setter: setFilterCond, options: [['','Todas las cond.'],['nm','NM'],['lp','LP'],['mp','MP'],['hp','HP']] },
              { val: filterLang,  setter: setFilterLang, options: [['','Todos los idiomas'],['en','Inglés (EN)'],['es','Español (ES)'],['jp','Japonés (JP)'],['pt','Portugués (PT)']] },
            ].map((f, i) => (
              <select key={i} value={f.val} onChange={e => { f.setter(e.target.value); setPage(1); }}
                className="bg-[#1a1a1a] [color-scheme:dark] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
                {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            ))}
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={lowOnly} onChange={e => { setLowOnly(e.target.checked); setPage(1); }} className="w-4 h-4 accent-violet-600" />
              Solo crítico
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr className="text-left">
                {['Carta', 'Set', 'Cond.', 'Idioma', 'Stock', 'Precio (CLP)', 'Actualizado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin block mb-2">progress_activity</span>
                    <p className="text-sm text-gray-400">Cargando inventario...</p>
                  </td>
                </tr>
              )}
              {!loading && pageSlice.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-600 block mb-2">warehouse</span>
                    <p className="text-sm text-gray-500">Sin resultados</p>
                  </td>
                </tr>
              )}
              {!loading && pageSlice.map((item, i) => {
                const lang = item.language || 'default';
                const stockColor = item.qty === 0 ? 'text-red-400' : item.qty <= 5 ? 'text-orange-400 font-bold' : 'text-white';
                return (
                  <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                          <img src={item.image || ''} alt={item.cardName} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-white">{item.cardName}</p>
                          <p className="text-xs text-gray-500">{item.cardId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{item.setName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${COND_COLORS[item.condition] || 'bg-white/5 text-gray-400'}`}>
                        {item.condition?.toUpperCase() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/5 text-gray-400">
                        {LANG_LABELS[lang] || (lang !== 'default' ? lang.toUpperCase() : '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${stockColor}`}>{item.qty}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-300">{formatCLP(item.price || 0)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditItem(item)}
                        className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:underline">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filtered.length > 0
              ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}`
              : 'Sin resultados'}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
                className="w-8 h-8 text-sm font-semibold rounded-lg text-gray-500 hover:bg-white/10 disabled:opacity-30 transition">‹</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm font-semibold rounded-lg transition ${p === page ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-white/10'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
                className="w-8 h-8 text-sm font-semibold rounded-lg text-gray-500 hover:bg-white/10 disabled:opacity-30 transition">›</button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editItem && (
        <StockModal
          item={editItem}
          onSave={() => { setEditItem(null); loadInventory(); }}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}
