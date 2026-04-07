import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatCLP, COND_LABELS } from '../api';
import { useCartStore } from '../store/cartStore';
import { showToast } from '../components/ui/Toast';

const RARITY_COLORS = {
  'starlight': 'bg-yellow-400 text-slate-900',
  'secret':    'bg-pink-500 text-white',
  'ultra':     'bg-slate-900 text-white',
  'mythic':    'bg-indigo-600 text-white',
  'rare':      'bg-blue-600 text-white',
  'common':    'bg-slate-400 text-white',
};
function rarityClass(r) {
  const key = (r || '').toLowerCase().split(' ')[0];
  return RARITY_COLORS[key] || 'bg-slate-700 text-white';
}

// ─── Cart item row ────────────────────────────────────────────────────────────
function CartItem({ item, onRemove, onQtyChange }) {
  const [qty, setQty]         = useState(item.qty);
  const [removing, setRemoving] = useState(false);
  const debounceRef = useRef(null);

  const handleQty = (delta) => {
    const next = Math.max(1, Math.min(99, qty + delta));
    setQty(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onQtyChange(item.itemId, next), 500);
  };

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.itemId);
  };

  return (
    <div
      className={`bg-white/5 border border-white/10 rounded-2xl p-5 transition-all duration-300 ${
        removing ? 'opacity-0 translate-x-10 max-h-0 overflow-hidden py-0' : 'opacity-100'
      }`}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <Link to={`/card/${item.card?.id}`} className="flex-shrink-0">
          <div className="w-20 h-28 rounded-xl overflow-hidden bg-black/20">
            <img
              src={item.card?.image || ''}
              alt={item.card?.name}
              className="w-full h-full object-contain hover:scale-105 transition-transform"
            />
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`inline-flex items-center gap-1 ${rarityClass(item.card?.rarity)} text-[10px] font-black px-2 py-0.5 rounded-full uppercase mb-1.5`}>
                {item.card?.rarity || ''}
              </span>
              <h3 className="font-bold text-white text-base leading-tight">
                <Link to={`/card/${item.card?.id}`} className="hover:text-violet-400 transition-colors">
                  {item.card?.name}
                </Link>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {item.card?.game || ''} · {item.card?.set || item.card?.setName || ''}
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                {COND_LABELS[item.condition] || item.condition?.toUpperCase()} · En stock
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Eliminar"
            >
              <span className="material-symbols-outlined text-base">delete_outline</span>
            </button>
          </div>

          <div className="flex items-center justify-between mt-4">
            {/* Qty stepper */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => handleQty(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-violet-600 text-white transition-colors text-lg font-bold"
              >−</button>
              <span className="w-8 text-center font-black text-sm text-white">{qty}</span>
              <button
                onClick={() => handleQty(+1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-violet-600 text-white transition-colors text-lg font-bold"
              >+</button>
            </div>
            <span className="text-lg font-black text-violet-400">
              {formatCLP((item.unitPrice ?? 0) * qty)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Cart() {
  const navigate = useNavigate();
  const refreshCart = useCartStore(s => s.refresh);

  const [cart,        setCart]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [promoCode,   setPromoCode]   = useState('');
  const [promoMsg,    setPromoMsg]    = useState(null); // { text, ok }
  const [promoLoading, setPromoLoading] = useState(false);
  const [featured,    setFeatured]    = useState([]);

  useEffect(() => {
    loadCart();
    api.cards.featured().then(res => {
      const data = res?.data || res;
      setFeatured(Array.isArray(data) ? data.slice(0, 4) : []);
    }).catch(() => {});
  }, []);

  async function loadCart() {
    setLoading(true);
    try {
      const data = await api.cart.get();
      setCart(data);
    } catch {
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(itemId) {
    try {
      await api.cart.removeItem(itemId);
      const updated = await api.cart.get();
      setCart(updated);
      refreshCart();
    } catch {
      showToast('Error al eliminar el ítem', 'error');
    }
  }

  async function handleQtyChange(itemId, qty) {
    try {
      const updated = await api.cart.updateItem(itemId, qty);
      if (updated) { setCart(updated); refreshCart(); }
    } catch {
      showToast('Error al actualizar cantidad', 'error');
    }
  }

  async function handleApplyPromo() {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoMsg(null);
    try {
      const res = await api.cart.applyPromo(code);
      setPromoMsg({
        text: `¡Código aplicado! ${res.type === 'porcentaje' ? res.value + '%' : formatCLP(res.value)} de descuento.`,
        ok: true,
      });
      const updated = await api.cart.get();
      setCart(updated);
      refreshCart();
    } catch (ex) {
      setPromoMsg({ text: ex.error || 'Código inválido o expirado.', ok: false });
    } finally {
      setPromoLoading(false);
    }
  }

  const items   = cart?.items ?? [];
  const isEmpty = !loading && items.length === 0;

  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discount ?? 0;
  const total    = cart?.total ?? subtotal;
  const itemCount = items.reduce((sum, i) => sum + (i.qty || 0), 0);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
          <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
          <span className="text-white font-medium">Carrito</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Tu carrito</h1>
          {!isEmpty && <span className="text-sm text-gray-400">{itemCount} artículo{itemCount !== 1 ? 's' : ''}</span>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-24">
            <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin">progress_activity</span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-gray-400">shopping_cart</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-500 mb-8">Añade cartas para comenzar tu compra.</p>
            <Link
              to="/singles"
              className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all"
            >
              <span className="material-symbols-outlined">storefront</span>
              Explorar singles
            </Link>
          </div>
        )}

        {/* Cart content */}
        {!loading && !isEmpty && (
          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => (
                <CartItem
                  key={item.itemId}
                  item={item}
                  onRemove={handleRemove}
                  onQtyChange={handleQtyChange}
                />
              ))}
              <div className="pt-2">
                <Link
                  to="/singles"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-violet-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Seguir comprando
                </Link>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-6">Resumen del pedido</h2>

                {/* Promo code */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-gray-300 block mb-2">Código promocional</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="INFINITY10"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                      className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading}
                      className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      {promoLoading ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {promoMsg && (
                    <p className={`text-xs mt-2 ${promoMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {promoMsg.text}
                    </p>
                  )}
                </div>

                <hr className="border-white/10 mb-5" />

                {/* Totals */}
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-semibold text-white">{formatCLP(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">sell</span>
                        Descuento
                      </span>
                      <span className="font-bold text-green-400">−{formatCLP(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Envío</span>
                    <span className="text-gray-500 text-xs italic">Se calcula en el checkout</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-4 border-t border-white/10 mb-6">
                  <span className="text-base font-bold text-white">Total</span>
                  <span className="text-2xl font-black text-violet-400">{formatCLP(total)}</span>
                </div>

                <Link
                  to="/checkout"
                  className="flex w-full items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-600/30 text-white font-bold rounded-xl transition-all"
                >
                  <span className="material-symbols-outlined">lock</span>
                  Proceder al checkout
                </Link>

                <div className="flex items-center justify-center gap-4 mt-5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-green-400 text-sm">verified_user</span>
                    Pago seguro
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-violet-400 text-sm">replay</span>
                    Devoluciones fáciles
                  </span>
                </div>
              </div>

              {/* Payment methods */}
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                <p className="text-xs text-gray-400 text-center mb-3 font-semibold uppercase tracking-wider">Métodos de pago</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {['WebPay', 'VISA', 'Mastercard', 'Débito', 'Transferencia', 'Mercado Pago'].map(m => (
                    <div key={m} className="h-7 px-3 bg-white/5 rounded-lg flex items-center justify-center text-xs font-black text-gray-300">
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Related cards */}
        {featured.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">También podría interesarte</h2>
                <p className="text-gray-500 text-sm mt-1">Cartas destacadas de la tienda</p>
              </div>
              <Link to="/singles" className="text-violet-400 font-bold hover:underline text-sm flex items-center gap-1">
                Ver más <span className="material-symbols-outlined text-base">east</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {featured.map(card => (
                <Link
                  key={card.id}
                  to={`/card/${card.id}`}
                  className="group bg-white/5 border border-white/10 p-4 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all block"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-4 bg-black/20">
                    <img
                      src={card.imageSm || card.image || ''}
                      alt={card.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="font-bold text-white truncate text-sm">{card.name}</h4>
                  <p className="text-xs text-gray-400 mb-3">{card.setName || ''}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
