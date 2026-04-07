import { useState, useEffect, useRef } from 'react';
import { api, formatCLP } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { showToast } from '../../components/ui/Toast';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  cls: 'bg-orange-500/15 text-orange-400', icon: 'hourglass_empty' },
  confirmed: { label: 'Confirmada', cls: 'bg-blue-500/15 text-blue-400',     icon: 'check'           },
  shipped:   { label: 'Enviada',    cls: 'bg-indigo-500/15 text-indigo-400', icon: 'local_shipping'  },
  delivered: { label: 'Entregada',  cls: 'bg-green-500/15 text-green-400',   icon: 'check_circle'    },
  cancelled: { label: 'Cancelada',  cls: 'bg-red-500/15 text-red-400',       icon: 'cancel'          },
};
const NEXT_STATUSES = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
};

const PAGE_SIZE = 20;

// ─── Inline expandable detail row ────────────────────────────────────────────
function OrderDetailRow({ order }) {
  return (
    <tr>
      <td colSpan={8} className="px-4 pb-4">
        <div className="bg-white/5 rounded-xl p-4 ml-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Dirección de envío</p>
            <p className="text-gray-300">{order.shipping?.address || '—'}</p>
            <p className="text-gray-500">{[order.shipping?.city, order.shipping?.zipCode].filter(Boolean).join(' · ')}</p>
            <p className="text-gray-500">{order.shipping?.phone || ''}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Productos</p>
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <div className="w-7 h-9 rounded bg-white/10 overflow-hidden flex-shrink-0">
                  <img src={item.image || ''} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <span className="text-gray-300 truncate">{item.name || '—'} <span className="text-gray-500">×{item.qty || 1}</span></span>
              </div>
            ))}
            {!(order.items?.length) && <p className="text-gray-500">Sin detalle</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Resumen</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Método pago</span><span className="font-medium text-gray-300">{order.paymentMethod || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Costo envío</span><span className="font-medium text-gray-300">{formatCLP(order.shippingCost || 0)}</span></div>
              {order.discount > 0 && <div className="flex justify-between"><span className="text-gray-500">Descuento</span><span className="font-medium text-green-400">-{formatCLP(order.discount)}</span></div>}
              <div className="flex justify-between font-black border-t border-white/10 pt-1 mt-1">
                <span>Total</span><span className="text-violet-400">{formatCLP(order.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Shipping number modal ────────────────────────────────────────────────────
function ShippingModal({ orderId, onConfirm, onClose }) {
  const [tracking, setTracking] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-violet-400">local_shipping</span>
          </div>
          <div>
            <h3 className="font-bold text-white">Número de envío</h3>
            <p className="text-xs text-gray-400">Orden <span className="font-semibold text-violet-400">#{orderId}</span></p>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-300 mb-2">Número de seguimiento (Starken / courier)</label>
          <input
            type="text"
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && tracking.trim()) onConfirm(tracking.trim()); }}
            placeholder="Ej: 1234567890"
            autoFocus
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-white/10 text-gray-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition">Cancelar</button>
          <button
            onClick={() => { if (tracking.trim()) onConfirm(tracking.trim()); }}
            className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">check</span>
            Confirmar envío
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdminOrders() {
  const { user, logout } = useAuthStore();

  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search,    setSearch]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [page,      setPage]      = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [shippingModal, setShippingModal] = useState(null); // { orderId, selectRef }

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await api.admin.orders.list({ limit: 500 });
      setOrders(data.data || data.orders || data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchQ = !q || o.id?.toLowerCase().includes(q) ||
      [o.shipping?.firstName, o.shipping?.lastName, o.shipping?.email].filter(Boolean).join(' ').toLowerCase().includes(q);
    const matchStatus = !statusFilter || o.status === statusFilter;
    const oDate = o.date?.slice(0, 10);
    const matchFrom = !dateFrom || oDate >= dateFrom;
    const matchTo   = !dateTo   || oDate <= dateTo;
    return matchQ && matchStatus && matchFrom && matchTo;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  // ── Export XLSX ──────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!filtered.length) { showToast('No hay pedidos para exportar', 'warn'); return; }
    const XLSX = await import('xlsx');
    const rows = [];
    filtered.forEach(order => {
      (order.items || []).forEach(item => {
        rows.push({
          TCG:        item.game || '—',
          Edición:    item.setName || item.set || '—',
          Idioma:     item.language || '—',
          Número:     item.cardNumber || item.number || '—',
          Nombre:     item.name || '—',
          Condición:  item.condition?.toUpperCase() || '—',
          Cantidad:   item.qty || 1,
          '# Orden':  order.id,
          Cliente:    [order.shipping?.firstName, order.shipping?.lastName].filter(Boolean).join(' ') || '—',
          Fecha:      order.date ? new Date(order.date).toLocaleDateString('es-CL') : '—',
        });
      });
    });
    rows.sort((a, b) => a.TCG.localeCompare(b.TCG) || a.Edición.localeCompare(b.Edición));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [14, 20, 10, 12, 30, 12, 10, 16, 22, 12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
    XLSX.writeFile(wb, `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast(`${rows.length} líneas exportadas`);
  }

  // ── Status update ────────────────────────────────────────────────────────────
  async function handleStatusChange(orderId, newStatus) {
    if (!newStatus) return;
    if (newStatus === 'shipped') {
      setShippingModal({ orderId });
      return;
    }
    await doUpdateStatus(orderId, newStatus, null);
  }

  async function doUpdateStatus(orderId, newStatus, trackingNumber) {
    try {
      await api.admin.orders.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, status: newStatus, ...(trackingNumber ? { trackingNumber } : {}) } : o
      ));
      showToast(`Orden ${orderId} → ${STATUS_CONFIG[newStatus]?.label}${trackingNumber ? ' · ' + trackingNumber : ''}`);
    } catch (ex) {
      showToast(ex.error || 'Error al actualizar', 'error');
    }
  }

  const STATUS_TABS = ['', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  return (
    <div className="p-6 lg:p-8 space-y-8">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        {[
          { id: 'total',    label: 'Total órdenes',  icon: 'receipt_long',    color: 'text-violet-400', bg: 'bg-violet-600/15', val: orders.length },
          { id: 'pending',  label: 'Pendientes',     icon: 'hourglass_empty', color: 'text-orange-400', bg: 'bg-orange-500/15', val: counts.pending || 0 },
          { id: 'shipped',  label: 'En envío',       icon: 'local_shipping',  color: 'text-blue-400',   bg: 'bg-blue-500/15',   val: counts.shipped || 0 },
          { id: 'delivered',label: 'Entregadas',     icon: 'check_circle',    color: 'text-green-400',  bg: 'bg-green-500/15',  val: counts.delivered || 0 },
        ].map(s => (
          <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center mb-4`}>
              <span className={`material-symbols-outlined ${s.color} text-xl`}>{s.icon}</span>
            </div>
            <p className="text-3xl font-black text-white">{loading ? '—' : s.val.toLocaleString('es-CL')}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl">

        {/* Filters */}
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg pointer-events-none">search</span>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por # orden o cliente..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); setPage(1); }}
              className="text-gray-500 hover:text-white text-sm flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-base">filter_alt_off</span>
              Limpiar
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600/15 hover:bg-violet-600/25 text-violet-400 text-sm font-semibold rounded-xl transition border border-violet-500/20">
              <span className="material-symbols-outlined text-base">download</span>
              Exportar
            </button>
            <button onClick={loadOrders}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-gray-400 text-lg">refresh</span>
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map(s => {
              const cfg = STATUS_CONFIG[s];
              const isActive = statusFilter === s;
              const label = s ? cfg?.label : 'Todas';
              const count = s ? counts[s] : orders.length;
              return (
                <button key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap flex items-center gap-1 ${
                    isActive
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'border-white/10 text-gray-400 hover:border-violet-500/50 hover:text-white'
                  }`}
                >
                  {s && <span className="material-symbols-outlined text-sm">{cfg.icon}</span>}
                  {label}
                  {count > 0 && <span className="text-xs opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.03]">
              <tr className="text-left">
                <th className="px-4 py-3 w-8" />
                {['# Orden', 'Cliente', 'Fecha', 'Items', 'Total', 'Estado', 'Cambiar a'].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin block mb-2">progress_activity</span>
                    <p className="text-sm text-gray-400">Cargando órdenes...</p>
                  </td>
                </tr>
              )}
              {!loading && pageSlice.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-600 block mb-2">receipt_long</span>
                    <p className="text-sm text-gray-500">Sin resultados</p>
                  </td>
                </tr>
              )}
              {!loading && pageSlice.map(order => {
                const s = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const customer = [order.shipping?.firstName, order.shipping?.lastName].filter(Boolean).join(' ') || order.shipping?.email || '—';
                const nextStatuses = NEXT_STATUSES[order.status] || [];
                const isExpanded = expandedId === order.id;
                return [
                  <tr
                    key={order.id}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <td className="px-4 py-4 text-center">
                      <span className={`material-symbols-outlined text-sm transition-colors ${isExpanded ? 'text-violet-400' : 'text-gray-600'}`}>
                        {isExpanded ? 'expand_more' : 'chevron_right'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-sm text-white font-mono">{order.id}</p>
                      <p className="text-xs text-gray-500">{order.paymentMethod || '—'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm text-white">{customer}</p>
                      <p className="text-xs text-gray-500">{order.shipping?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">
                      {order.date ? new Date(order.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-400">{order.items?.length ?? '—'}</td>
                    <td className="px-4 py-4 font-black text-violet-400 text-sm">{formatCLP(order.total || 0)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${s.cls}`}>
                        <span className="material-symbols-outlined text-xs">{s.icon}</span>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      {nextStatuses.length > 0 ? (
                        <select
                          defaultValue=""
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-300 focus:outline-none focus:border-violet-500 transition-colors"
                        >
                          <option value="">— Mover a —</option>
                          {nextStatuses.map(ns => (
                            <option key={ns} value={ns}>{STATUS_CONFIG[ns]?.label || ns}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">Final</span>
                      )}
                    </td>
                  </tr>,
                  isExpanded && <OrderDetailRow key={`${order.id}-detail`} order={order} />,
                ];
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filtered.length > 0
              ? `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length} órdenes`
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

      {/* Shipping number modal */}
      {shippingModal && (
        <ShippingModal
          orderId={shippingModal.orderId}
          onConfirm={async (tracking) => {
            setShippingModal(null);
            await doUpdateStatus(shippingModal.orderId, 'shipped', tracking);
          }}
          onClose={() => setShippingModal(null)}
        />
      )}
    </div>
  );
}
