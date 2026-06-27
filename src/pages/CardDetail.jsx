import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatCLP, Auth, COND_LABELS } from '../api';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { showToast } from '../components/ui/Toast';

const LANG_NAMES = { en: 'Inglés', es: 'Español', jp: 'Japonés', pt: 'Portugués', fr: 'Francés', de: 'Alemán', ko: 'Coreano' };

// ─── 3D holographic card component ───────────────────────────────────────────
function HoloCard({ src, alt, rarity }) {
  const wrapperRef = useRef(null);
  const shineRef   = useRef(null);

  const handleMouseMove = (e) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (y - 0.5) * -22;
    const rotY = (x - 0.5) * 22;
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.04,1.04,1.04)`;
    if (shineRef.current) {
      shineRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.28) 0%, transparent 65%)`;
    }
  };

  const handleMouseLeave = () => {
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    }
    if (shineRef.current) shineRef.current.style.background = 'none';
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative max-w-xs w-full mx-auto cursor-crosshair transition-shadow hover:shadow-[0_32px_80px_rgba(109,40,217,0.35),0_8px_24px_rgba(0,0,0,0.25)]"
      style={{ transformStyle: 'preserve-3d', transition: 'transform 0.1s ease-out, box-shadow 0.3s ease', borderRadius: '1rem' }}
    >
      {src
        ? <img src={src} alt={alt} className="w-full rounded-2xl relative z-10 block" />
        : <div className="w-full aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
      }
      {/* Holographic rainbow overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none mix-blend-screen"
        style={{ background: 'conic-gradient(from 0deg at 50% 50%, rgba(255,0,100,0.18), rgba(255,165,0,0.18), rgba(0,255,100,0.18), rgba(0,200,255,0.18), rgba(150,0,255,0.18), rgba(255,0,100,0.18))' }}
      />
      {/* Dynamic shine */}
      <div ref={shineRef} className="absolute inset-0 rounded-2xl pointer-events-none mix-blend-overlay" />
      {/* Sparkles */}
      {[
        { top: '15%', left: '20%', delay: '0s' },
        { top: '30%', left: '75%', delay: '0.4s' },
        { top: '65%', left: '30%', delay: '0.8s' },
        { top: '80%', left: '70%', delay: '1.2s' },
        { top: '50%', left: '50%', delay: '0.6s', size: '6px' },
      ].map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{ top: s.top, left: s.left, width: s.size || '4px', height: s.size || '4px', animationDelay: s.delay,
            animation: 'sparkle 2s ease-in-out infinite' }}
        />
      ))}
    </div>
  );
}

// ─── Condition radio button ───────────────────────────────────────────────────
function CondLabel({ value, label, price, checked, onChange, disabled }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="condition" value={value} checked={checked} onChange={onChange} className="hidden" disabled={disabled} />
      <span className={`block px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all select-none
        ${checked
          ? 'border-violet-600 bg-violet-600/15 text-violet-400'
          : disabled
          ? 'border-white/5 text-gray-600 cursor-not-allowed'
          : 'border-white/10 text-gray-400 hover:border-violet-500 hover:text-violet-400'
        }`}
      >
        {label}
        {price != null && <span className={`font-bold ml-1 ${checked ? 'text-violet-400' : 'text-gray-400'}`}>{formatCLP(price)}</span>}
      </span>
    </label>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CardDetail() {
  const { id } = useParams();
  const { isLoggedIn } = useAuthStore();
  const refreshCart = useCartStore(s => s.refresh);

  const [card,       setCard]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [condition,  setCondition]  = useState('nm');
  const [language,   setLanguage]   = useState(null);
  const [foil,       setFoil]       = useState(false);
  const [qty,        setQty]        = useState(1);
  const [qtyMax,     setQtyMax]     = useState(99);
  const [addState,   setAddState]   = useState('idle'); // 'idle' | 'loading' | 'done'
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.cards.get(id)
      .then(data => {
        setCard(data);
        // Set initial language
        if (data?.inventory && typeof data.inventory === 'object') {
          const langs = Object.keys(data.inventory).filter(l => l !== 'default');
          if (langs.length) setLanguage(langs[0]);
        }
      })
      .catch(() => setCard(null))
      .finally(() => setLoading(false));
  }, [id]);

  const inventory = card?.inventory && typeof card.inventory === 'object' ? card.inventory : null;
  const langs = inventory ? Object.keys(inventory).filter(l => l !== 'default') : [];
  const langData = inventory ? (inventory[language] || inventory['default'] || {}) : {};

  const hasFoil = Object.keys(langData).some(k => k.endsWith('_foil') && (langData[k]?.stock ?? 0) > 0);

  function getPrices() {
    const prices = {};
    Object.entries(langData).forEach(([key, data]) => {
      if (foil) {
        if (key.endsWith('_foil') && data?.price) prices[key.replace('_foil', '')] = data.price;
      } else {
        if (!key.endsWith('_foil') && data?.price) prices[key] = data.price;
      }
    });
    return prices;
  }
  const prices = getPrices();
  const mainPrice = prices.nm ?? prices.lp ?? prices.mp ?? prices.hp;

  function getStock(cond) {
    const key = foil ? `${cond}_foil` : cond;
    return langData[key]?.stock ?? 0;
  }
  const currentStock = getStock(condition);

  useEffect(() => {
    setQtyMax(currentStock || 0);
    if (qty > currentStock) setQty(Math.max(1, currentStock));
  }, [condition, language, foil, card]);

  useEffect(() => {
    setCondition('nm');
    if (!hasFoil) setFoil(false);
  }, [foil, language]);

  const handleAddToCart = async () => {
    if (addState !== 'idle' || currentStock === 0) return;
    setAddState('loading');
    try {
      await api.cart.addItem(id, condition, qty, language, foil);
      await refreshCart();
      setAddState('done');
      setTimeout(() => setAddState('idle'), 2000);
    } catch (ex) {
      console.error('[CardDetail] addToCart:', ex);
      setAddState('idle');
      showToast(
        ex.status === 409 ? 'No hay suficiente stock disponible.' :
        'No se pudo agregar al carrito. Intenta nuevamente.',
        'error'
      );
    }
  };

  const handleWishlist = async () => {
    if (!isLoggedIn) { showToast('Inicia sesión para guardar en wishlist', 'warn'); return; }
    try {
      if (!wishlisted) {
        await api.user.addToWishlist(id);
        setWishlisted(true);
        showToast('Añadido a tu wishlist');
      } else {
        await api.user.removeFromWishlist(id);
        setWishlisted(false);
        showToast('Quitado de la wishlist');
      }
    } catch (ex) {
      console.error('[CardDetail] wishlist:', ex);
      showToast('Error al actualizar la wishlist. Intenta nuevamente.', 'error');
    }
  };

  // ── Stats row ───────────────────────────────────────────────────────────────
  const StatsRow = ({ label, value }) => {
    if (value == null || value === '') return null;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-bold text-white text-right">{value}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-violet-400 animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Carta no encontrada.</p>
          <Link to="/singles" className="text-violet-400 hover:underline">← Volver a Singles</Link>
        </div>
      </div>
    );
  }

  const g = card.game;

  return (
    <>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="min-h-screen bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
            <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
            <Link to="/singles" className="hover:text-violet-400 transition-colors">Singles</Link>
            <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
            <span className="text-white font-medium truncate max-w-[200px]">{card.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-start">

            {/* LEFT: Card Image */}
            <div className="lg:sticky lg:top-24">
              <div className="relative flex items-center justify-center p-8 rounded-3xl"
                style={{ background: 'radial-gradient(ellipse at center, rgba(109,40,217,0.08) 0%, transparent 70%)' }}>

                {/* Rarity badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1 bg-yellow-400 text-slate-900 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                    {card.rarity || 'Carta'}
                  </span>
                </div>

                {/* Wishlist float button */}
                <button
                  onClick={handleWishlist}
                  className={`absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 ${wishlisted ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                >
                  <span className="material-symbols-outlined text-xl">{wishlisted ? 'favorite' : 'favorite_border'}</span>
                </button>

                <HoloCard src={card.image} alt={card.name} rarity={card.rarity} />
              </div>

              {/* Trust badges */}
              <div className="flex gap-4 justify-center mt-6 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-green-400 text-base">verified</span>
                  Autenticidad garantizada
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-violet-400 text-base">local_shipping</span>
                  Envío en 24h
                </div>
              </div>
            </div>

            {/* RIGHT: Product Info */}
            <div className="space-y-7">

              {/* Game + set tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {card.game && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-600/10 text-violet-400 text-xs font-bold rounded-full uppercase tracking-wider">
                    {card.game.charAt(0).toUpperCase() + card.game.slice(1)} TCG
                  </span>
                )}
                <span className="text-gray-400 text-sm">
                  {card.setName || card.set || ''}{card.number ? ` · ${card.number}` : ''}
                </span>
              </div>

              {/* Name */}
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">{card.name}</h1>

              {/* Price */}
              <div className="flex items-end gap-4">
                <span className="text-5xl font-black text-violet-400 leading-none">
                  {mainPrice != null ? formatCLP(mainPrice) : '—'}
                </span>
              </div>
              <p className="text-xs text-gray-500 -mt-4">Precio para Near Mint{foil ? ' Foil' : ''}. Otros estados disponibles abajo.</p>

              <hr className="border-white/5" />

              {/* Language selector */}
              {langs.length >= 2 && (
                <div>
                  <p className="text-sm font-bold text-gray-300 mb-3">Idioma</p>
                  <div className="flex flex-wrap gap-2">
                    {langs.map(l => (
                      <label key={l} className="cursor-pointer">
                        <input type="radio" name="language" value={l} checked={language === l}
                          onChange={() => setLanguage(l)} className="hidden" />
                        <span className={`block px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all select-none
                          ${language === l
                            ? 'border-violet-600 bg-violet-600/15 text-violet-400'
                            : 'border-white/10 text-gray-400 hover:border-violet-500 hover:text-violet-400'}`}>
                          {LANG_NAMES[l] || l.toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Foil toggle */}
              {hasFoil && (
                <div>
                  <p className="text-sm font-bold text-gray-300 mb-3">Versión</p>
                  <div className="flex gap-2">
                    <button onClick={() => setFoil(false)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all
                        ${!foil ? 'border-violet-600 bg-violet-600/15 text-violet-400' : 'border-white/10 text-gray-400 hover:border-violet-500 hover:text-violet-400'}`}>
                      Normal
                    </button>
                    <button onClick={() => setFoil(true)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-1.5
                        ${foil ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-white/10 text-gray-400 hover:border-yellow-500 hover:text-yellow-400'}`}>
                      <span className="material-symbols-outlined text-base">auto_awesome</span>
                      Foil
                    </button>
                  </div>
                </div>
              )}

              {/* Condition selector */}
              <div>
                <p className="text-sm font-bold text-gray-300 mb-3">Estado de la carta</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COND_LABELS).map(([key, label]) => (
                    <CondLabel
                      key={key}
                      value={key}
                      label={label}
                      price={prices[key]}
                      checked={condition === key}
                      onChange={() => setCondition(key)}
                      disabled={prices[key] == null}
                    />
                  ))}
                </div>
              </div>

              {/* Stock info */}
              <div className="flex items-center gap-2 text-sm">
                {currentStock === 0
                  ? <><span className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-red-400 font-medium">Sin stock</span></>
                  : <><span className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-green-400 font-medium">En stock</span><span className="text-gray-500">({currentStock} disponibles)</span></>
                }
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center gap-4">
                <p className="text-sm font-bold text-gray-300">Cantidad</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-violet-600/20 hover:border-violet-500 transition-colors disabled:opacity-30 text-xl font-bold"
                  >−</button>
                  <span className="w-8 text-center font-bold text-white text-lg">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(qtyMax, q + 1))}
                    disabled={qty >= qtyMax}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-violet-600/20 hover:border-violet-500 transition-colors disabled:opacity-30 text-xl font-bold"
                  >+</button>
                </div>
              </div>

              {/* Add to cart + wishlist */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={currentStock === 0 || addState !== 'idle'}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all
                    ${addState === 'done'
                      ? 'bg-green-600'
                      : currentStock === 0
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                      : 'bg-violet-600 hover:bg-violet-700'}`}
                >
                  <span className={`material-symbols-outlined ${addState === 'loading' ? 'animate-spin' : ''}`}>
                    {addState === 'loading' ? 'progress_activity' : addState === 'done' ? 'check_circle' : 'add_shopping_cart'}
                  </span>
                  {addState === 'done' ? '¡Añadido!' : currentStock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                </button>

                <button
                  onClick={handleWishlist}
                  className={`p-3.5 rounded-xl border-2 transition-all ${wishlisted ? 'border-red-500 text-red-400' : 'border-white/10 text-gray-400 hover:border-red-500 hover:text-red-400'}`}
                >
                  <span className="material-symbols-outlined">{wishlisted ? 'favorite' : 'favorite_border'}</span>
                </button>
              </div>

              <hr className="border-white/5" />

              {/* Stats */}
              {card && (
                <div className="bg-white/5 rounded-xl px-4 py-1 border border-white/5">
                  <StatsRow label="Set" value={card.setName || card.set} />
                  <StatsRow label="Rareza" value={card.rarity} />
                  <StatsRow label="Número" value={card.number} />
                  <StatsRow label="Artista" value={card.artist} />
                  {g === 'pokemon' && <>
                    <StatsRow label="HP" value={card.hp ? `${card.hp} HP` : null} />
                    <StatsRow label="Tipo" value={card.type} />
                    <StatsRow label="Retreat" value={card.retreatCost != null ? ('★'.repeat(card.retreatCost) || '0') : null} />
                    <StatsRow label="Regulación" value={card.regulationMark} />
                  </>}
                  {g === 'yugioh' && <>
                    <StatsRow label="ATK / DEF" value={card.atk != null ? `${card.atk} / ${card.def ?? '?'}` : null} />
                    <StatsRow label="Atributo" value={card.attribute} />
                  </>}
                  {g === 'magic' && <>
                    <StatsRow label="Coste de maná" value={card.manaCost} />
                    <StatsRow label="Colores" value={card.colors?.join(', ')} />
                  </>}
                  {g === 'riftbound' && <>
                    <StatsRow label="Dominio" value={card.domain} />
                    <StatsRow label="Tipo" value={card.type} />
                  </>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
