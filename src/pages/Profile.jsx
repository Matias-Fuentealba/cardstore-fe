import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatCLP, Auth, COND_LABELS } from '../api';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../components/ui/Toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  delivered:  { text: 'Entregado',  cls: 'bg-green-500/15 text-green-400' },
  confirmed:  { text: 'Confirmado', cls: 'bg-blue-500/15 text-blue-400' },
  processing: { text: 'Procesando', cls: 'bg-blue-500/15 text-blue-400' },
  shipped:    { text: 'En camino',  cls: 'bg-yellow-500/15 text-yellow-400' },
  cancelled:  { text: 'Cancelado',  cls: 'bg-red-500/15 text-red-400' },
};

const TIER_STYLES = {
  gold:     'from-yellow-500 to-amber-400',
  silver:   'from-gray-400 to-gray-300',
  platinum: 'from-indigo-500 to-purple-400',
};

const TABS = [
  { id: 'pedidos',        icon: 'receipt_long',     label: 'Mis pedidos' },
  { id: 'wishlist',       icon: 'favorite',         label: 'Wishlist' },
  { id: 'datos',          icon: 'manage_accounts',  label: 'Mis datos' },
  { id: 'notificaciones', icon: 'notifications',    label: 'Notificaciones' },
  { id: 'seguridad',      icon: 'shield',           label: 'Seguridad' },
];

// ─── Form input ───────────────────────────────────────────────────────────────
function FInput({ label, type = 'text', value, onChange, disabled, extra }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        {extra}
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-violet-600' : 'bg-white/20'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ─── Order detail modal ───────────────────────────────────────────────────────
function OrderModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.user.order(orderId).then(setOrder).catch(() => {}).finally(() => setLoading(false));
  }, [orderId]);

  const s = order ? (STATUS_LABEL[order.status] || { text: order.status, cls: 'bg-blue-500/15 text-blue-400' }) : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase">Detalle del pedido</p>
            <h3 className="font-black text-violet-400 text-lg">{orderId}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">
            <span className="material-symbols-outlined text-gray-400">close</span>
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-violet-400 text-3xl">progress_activity</span>
            </div>
          ) : order ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estado</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.text}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fecha</span>
                <span className="font-semibold text-white">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-CL') : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Método de pago</span>
                <span className="font-semibold text-white capitalize">{order.paymentMethod || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Envío</span>
                <span className="font-semibold text-white">{order.shippingMethod || '—'}</span>
              </div>
              {order.shipping?.address && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Dirección</span>
                  <span className="font-semibold text-white text-right max-w-xs">
                    {[order.shipping.address, order.shipping.city, order.shipping.region].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <hr className="border-white/10" />
              <div className="space-y-3">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {item.card?.image && <img src={item.card.image} className="w-10 h-14 object-contain rounded-lg flex-shrink-0" alt={item.card?.name} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.card?.name || item.name || '—'}</p>
                      <p className="text-xs text-gray-400">x{item.qty} · {(item.condition || '').toUpperCase()}</p>
                    </div>
                    <span className="text-sm font-bold text-violet-400 flex-shrink-0">{formatCLP(item.unitPrice * item.qty)}</span>
                  </div>
                ))}
              </div>
              <hr className="border-white/10" />
              <div className="flex justify-between font-black text-base">
                <span className="text-white">Total</span>
                <span className="text-violet-400">{formatCLP(order.total)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-400 text-center py-4">Error al cargar el pedido.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────
function PanelPedidos({ orders, loading }) {
  const [modalId, setModalId] = useState(null);

  if (loading) return <div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-violet-400 text-3xl">progress_activity</span></div>;
  if (!orders.length) return (
    <div className="text-center py-16 text-gray-500">
      <span className="material-symbols-outlined text-4xl block mb-3">receipt_long</span>
      <p className="font-semibold">Todavía no tienes pedidos.</p>
      <Link to="/singles" className="mt-4 inline-flex items-center gap-1 text-violet-400 font-bold hover:underline text-sm">
        <span className="material-symbols-outlined text-base">storefront</span> Explorar el catálogo
      </Link>
    </div>
  );

  return (
    <>
      {modalId && <OrderModal orderId={modalId} onClose={() => setModalId(null)} />}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white">Mis pedidos</h2>
          <span className="text-sm text-gray-400">{orders.length} pedidos en total</span>
        </div>
        {orders.map(order => {
          const s = STATUS_LABEL[order.status] || { text: order.status, cls: 'bg-blue-500/15 text-blue-400' };
          return (
            <div key={order.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <span className="text-xs text-gray-500 font-medium">PEDIDO</span>
                  <h3 className="font-black text-violet-400">{order.id}</h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-gray-400">{order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-CL') : '')}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.text}</span>
                  <span className="font-black text-violet-400 text-base">{formatCLP(order.total)}</span>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 flex-shrink-0 bg-white/5 rounded-xl p-3">
                    {item.image && <img src={item.image} className="w-10 h-14 object-contain rounded-lg flex-shrink-0" alt={item.name} />}
                    <div>
                      <p className="text-xs font-bold text-white whitespace-nowrap">{item.name}</p>
                      <p className="text-[11px] text-gray-400">x{item.qty || 1}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setModalId(order.id)} className="text-xs font-bold text-violet-400 hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">visibility</span> Ver detalle
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function PanelWishlist({ items, onRemove }) {
  if (!items.length) return (
    <div className="text-center py-16 text-gray-500">
      <span className="material-symbols-outlined text-4xl block mb-3">favorite_border</span>
      <p className="font-semibold">Tu wishlist está vacía.</p>
    </div>
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Lista de deseos</h2>
        <span className="text-sm text-gray-400">{items.length} cartas guardadas</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(item => {
          const card = item.card || item;
          const cardId = item.cardId || card.id || item.id;
          const inv = card.inventory && typeof card.inventory === 'object' ? card.inventory : {};
          const firstLang = inv.default || Object.values(inv)[0] || {};
          const firstCond = firstLang.nm || firstLang.lp || firstLang.mp || firstLang.hp;
          const price = firstCond?.price ?? 0;
          const hasInventoryData = Object.keys(inv).length > 0;
          const inStock = !hasInventoryData || Object.values(inv).flatMap(l => Object.values(l)).some(c => (c.stock ?? 0) > 0);
          return (
            <div key={cardId} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-transform">
              <Link to={`/card/${cardId}`} className="block relative">
                <img src={card.imageSm || card.image || ''} className={`w-full aspect-[3/4] object-contain bg-black/20 ${inStock ? '' : 'grayscale opacity-60'}`} alt={card.name || ''} />
                {!inStock && <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Sin stock</span>}
              </Link>
              <div className="p-3 flex flex-col flex-1">
                <Link to={`/card/${cardId}`} className="font-bold text-white text-sm truncate hover:text-violet-400 transition-colors">{card.name || '—'}</Link>
                <p className="text-xs text-gray-400 mb-2">{card.setName || card.set || ''}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-violet-400 font-black text-sm">{price ? formatCLP(price) : '—'}</span>
                  <button onClick={() => onRemove(cardId)} className="text-red-400 hover:text-red-300 transition-colors p-1">
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelDatos({ user, onSave }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', birthDate: '', rut: '', address: '', region: '', city: '', cp: '' });
  const [saving, setSaving] = useState(false);
  const setField = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) setForm({
      firstName: user.firstName || '',
      lastName:  user.lastName  || '',
      email:     user.email     || '',
      phone:     user.phone     || '',
      birthDate: user.birthDate ? user.birthDate.slice(0, 10) : '',
      rut:       user.rut       || '',
      address:   user.address   || '',
      region:    user.region    || '',
      city:      user.city      || '',
      cp:        user.cp        || '',
    });
  }, [user]);

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.user.update(form);
      Auth.setUser(updated);
      onSave(updated);
      showToast('Perfil actualizado');
    } catch (ex) {
      showToast(ex.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">Mis datos</h2>
      {/* Form */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-400">person</span>
          Información personal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FInput label="Nombre"   value={form.firstName} onChange={setField('firstName')} />
          <FInput label="Apellido" value={form.lastName}  onChange={setField('lastName')} />
          <FInput label="Email" type="email" value={form.email} onChange={setField('email')}
            extra={<span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-base" title="Verificado">verified</span>}
          />
          <FInput label="Teléfono" type="tel" value={form.phone} onChange={v => setField('phone')(v.replace(/[^\d\s+\-]/g, ''))} />
          <FInput label="RUT" value={form.rut} onChange={v => setField('rut')(v.replace(/[^\d.\-kK]/g, ''))} placeholder="12.345.678-9" />
          <FInput label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={setField('birthDate')} />
        </div>

        <hr className="border-white/10 my-6" />
        <h3 className="font-bold text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-400">home</span>
          Dirección de envío
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <FInput label="Dirección" value={form.address} onChange={setField('address')} placeholder="Calle, número, piso/depto" />
          </div>
          <FInput label="Ciudad / Comuna" value={form.city}   onChange={setField('city')}   placeholder="Santiago" />
          <FInput label="Región"          value={form.region} onChange={setField('region')} placeholder="Región Metropolitana" />
          <FInput label="Código postal"   value={form.cp}     onChange={v => setField('cp')(v.replace(/\D/g, ''))} placeholder="1234567" />
        </div>
        <div className="flex justify-end mt-6 gap-3">
          <button type="button" className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-violet-400 transition-colors">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
          >
            {saving ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span> : <span className="material-symbols-outlined text-base">save</span>}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelNotificaciones() {
  const NOTIFS = [
    { key: 'orderStatus',       label: 'Actualizaciones de pedidos', desc: 'Estado de tus envíos en tiempo real', default: true },
    { key: 'wishlistRestock',   label: 'Restock de wishlist',        desc: 'Cuando una carta de tu wishlist vuelve al stock', default: true },
    { key: 'offers',            label: 'Ofertas exclusivas',         desc: 'Promociones y descuentos para miembros', default: true },
    { key: 'priceAlerts',       label: 'Alertas de precio',          desc: 'Cuando baja el precio de una carta en tu wishlist', default: false },
    { key: 'newsletter',        label: 'Newsletter semanal',         desc: 'Resumen de novedades y análisis del meta', default: false },
    { key: 'pushNotifications', label: 'Notificaciones push',        desc: 'Alertas en el navegador', default: false },
  ];
  const [prefs, setPrefs] = useState(() => Object.fromEntries(NOTIFS.map(n => [n.key, n.default])));

  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    try {
      await api.user.updateNotifications(prefs);
      showToast('Preferencias guardadas');
    } catch (ex) {
      showToast(ex.error || 'Error al guardar preferencias', 'error');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Notificaciones</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        {NOTIFS.map(({ key, label, desc }, i) => (
          <div key={key} className={`flex items-center justify-between py-4 ${i < NOTIFS.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div>
              <p className="text-sm font-bold text-white">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
            <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
          </div>
        ))}
        <div className="mt-5 flex justify-end">
          <button onClick={handleSave} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors">
            Guardar preferencias
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelSeguridad({ onLogout }) {
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const setF = k => v => setPwdForm(f => ({ ...f, [k]: v }));

  const handlePwd = async (e) => {
    e.preventDefault();
    if (pwdForm.new !== pwdForm.confirm) { showToast('Las contraseñas no coinciden', 'error'); return; }
    setPwdSaving(true);
    try {
      await api.user.changePassword(pwdForm.current, pwdForm.new);
      showToast('Contraseña actualizada');
      setPwdForm({ current: '', new: '', confirm: '' });
    } catch (ex) {
      showToast(ex.error || 'Error al cambiar la contraseña', 'error');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-white">Seguridad</h2>

      {/* Change password */}
      <form onSubmit={handlePwd} className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-white mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-400">lock_reset</span>
          Cambiar contraseña
        </h3>
        <div className="space-y-4 max-w-sm">
          <FInput label="Contraseña actual"  type="password" value={pwdForm.current}  onChange={setF('current')}  />
          <FInput label="Nueva contraseña"   type="password" value={pwdForm.new}      onChange={setF('new')}      />
          <FInput label="Confirmar contraseña" type="password" value={pwdForm.confirm} onChange={setF('confirm')}  />
        </div>
        <button type="submit" disabled={pwdSaving} className="mt-5 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2">
          {pwdSaving ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span> : <span className="material-symbols-outlined text-base">lock_reset</span>}
          Actualizar contraseña
        </button>
      </form>

      {/* 2FA */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-green-400 text-xl">security</span>
            </div>
            <div>
              <h3 className="font-bold text-white">Autenticación de dos factores</h3>
              <p className="text-xs text-gray-400 mt-1">Añade una capa extra de seguridad</p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full">No activado</span>
        </div>
        <button className="mt-4 px-5 py-2.5 text-sm font-bold text-violet-400 border-2 border-violet-500/30 rounded-xl hover:bg-violet-600/10 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-base">smartphone</span>
          Activar 2FA
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">warning</span>
          Zona peligrosa
        </h3>
        <p className="text-xs text-red-400/70 mb-4">Una vez que eliminés tu cuenta, no hay vuelta atrás.</p>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 text-sm font-bold text-red-400 border-2 border-red-500/30 rounded-xl hover:bg-red-500/10 transition-all">
            Eliminar cuenta
          </button>
          <button onClick={onLogout} className="px-5 py-2.5 text-sm font-bold text-gray-400 border-2 border-white/10 rounded-xl hover:border-violet-500 hover:text-violet-400 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-base">logout</span>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Profile() {
  const navigate = useNavigate();
  const { user: authUser, setUser, logout } = useAuthStore();

  const [user,    setUserData] = useState(authUser);
  const [orders,  setOrders]   = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [tab,     setTab]      = useState('pedidos');
  const [loadingOrders,  setLoadingOrders]  = useState(true);

  useEffect(() => {
    // Load full user profile
    api.user.me().then(u => { setUserData(u); setUser(u); }).catch(() => {});

    // Load orders
    api.user.orders().then(res => {
      setOrders(res?.orders || []);
    }).catch(() => {}).finally(() => setLoadingOrders(false));

    // Load wishlist
    api.user.wishlist().then(wl => {
      const list = Array.isArray(wl) ? wl : wl?.items || [];
      setWishlist(list);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRemoveWishlist = async (cardId) => {
    try {
      await api.user.removeFromWishlist(cardId);
      setWishlist(w => w.filter(i => (i.cardId || i.card?.id || i.id) !== cardId));
      showToast('Quitado de la wishlist');
    } catch {
      showToast('Error al quitar de la wishlist', 'error');
    }
  };

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const fullName  = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const tier = user?.tier && user.tier !== 'basic' ? user.tier : null;

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
          <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
          <span className="text-white font-medium">Mi perfil</span>
        </nav>

        <div className="flex gap-8 items-start">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-24">
            {/* User card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-3">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-white truncate">{fullName || '—'}</h2>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  {tier && (
                    <span className={`inline-flex items-center gap-1 mt-2 bg-gradient-to-r ${TIER_STYLES[tier] || TIER_STYLES.silver} text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase`}>
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      Miembro {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Pedidos', orders.length], ['Wishlist', wishlist.length], ['Rating', user?.stats?.rating ?? '—']].map(([label, val]) => (
                  <div key={label} className="bg-white/5 rounded-xl p-2.5">
                    <p className="text-lg font-black text-violet-400">{val}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nav */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2 space-y-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left
                    ${tab === t.id ? 'bg-violet-600/15 text-violet-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <span className="material-symbols-outlined text-base">{t.icon}</span>
                  {t.label}
                </button>
              ))}
              <div className="h-px bg-white/5 my-1" />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Cerrar sesión
              </button>
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {/* Mobile tabs */}
            <div className="lg:hidden flex gap-1 overflow-x-auto pb-1 mb-6">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 pb-2 whitespace-nowrap transition-colors
                    ${tab === t.id ? 'text-violet-400 border-violet-500' : 'text-gray-400 border-transparent'}`}
                >
                  <span className="material-symbols-outlined text-base">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Panels */}
            {tab === 'pedidos'        && <PanelPedidos orders={orders} loading={loadingOrders} />}
            {tab === 'wishlist'       && <PanelWishlist items={wishlist} onRemove={handleRemoveWishlist} />}
            {tab === 'datos'          && <PanelDatos user={user} onSave={u => { setUserData(u); setUser(u); }} />}
            {tab === 'notificaciones' && <PanelNotificaciones />}
            {tab === 'seguridad'      && <PanelSeguridad onLogout={handleLogout} />}
          </div>
        </div>
      </div>
    </div>
  );
}
