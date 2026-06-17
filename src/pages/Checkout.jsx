import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatCLP, Auth, COND_LABELS } from '../api';
import { searchComunas } from '../data/comunas';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { showToast } from '../components/ui/Toast';

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ['Envío', 'Pago', 'Confirmación'];

function StepBar({ current }) {
  return (
    <div className="flex items-center mb-10 max-w-lg">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done   = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${done   ? 'bg-violet-600 border-violet-600 text-white' :
                  active ? 'bg-violet-600 border-violet-600 text-white ring-4 ring-violet-600/20' :
                           'bg-white/5 border-white/20 text-gray-500'}`}
              >
                {done
                  ? <span className="material-symbols-outlined text-base">check</span>
                  : step}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${step <= current ? 'text-violet-400' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-colors ${step < current ? 'bg-violet-600' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── RUT validator ────────────────────────────────────────────────────────────
function validarRut(rut) {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const expected = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === expected;
}

// ─── Form input ───────────────────────────────────────────────────────────────
function FormInput({ label, type = 'text', value, onChange, placeholder, error, ...rest }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-colors
          ${error ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-violet-500'}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-xs">error</span>{error}</p>}
    </div>
  );
}

// ─── Payment method tab ───────────────────────────────────────────────────────
function PayTab({ value, selected, onSelect, icon, label }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 flex flex-col items-center gap-1 py-4 px-4 rounded-xl border-2 transition-all
        ${selected ? 'border-violet-600 bg-violet-600/10 text-violet-400' : 'border-white/10 text-gray-400 hover:border-violet-500/50'}`}
    >
      {icon}
      <p className="text-xs font-bold">{label}</p>
    </button>
  );
}

// ─── Order confirmation checkmark ─────────────────────────────────────────────
function CheckAnimation() {
  return (
    <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-8">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" fill="rgba(34,197,94,0.1)" stroke="#22c55e" strokeWidth="2" />
        <path
          d="M14 24.5L21 32L34 17"
          stroke="#16a34a"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="100"
          strokeDashoffset="100"
          style={{ animation: 'checkDraw 0.6s ease forwards 0.3s' }}
        />
      </svg>
    </div>
  );
}

// ─── WebPay redirect ─────────────────────────────────────────────────────────
function redirectToTransbank(redirectUrl, tbkToken) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = redirectUrl;
  form.target = '_self';
  [['token_ws', tbkToken], ['TBK_TOKEN', tbkToken]].forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const refreshCart = useCartStore(s => s.refresh);

  const [step, setStep] = useState(1);
  const [cart, setCart] = useState(null);
  const [order, setOrder] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Step 1 — shipping form
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', tel: '',
    rut: '', address: '', region: '', cp: '',
  });
  const [comunaInput, setComunaInput] = useState('');
  const [comunaId,    setComunaId]    = useState(null);
  const [comunaDropdown, setComunaDropdown] = useState([]);
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quotes,       setQuotes]       = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [errors, setErrors] = useState({});


  // Step 2 — payment
  const [payMethod, setPayMethod] = useState('webpay');

  const setField = (key) => (val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  // Load cart + prefill
  useEffect(() => {
    api.cart.get().then(setCart).catch(() => {});
    if (user) {
      setForm(f => ({
        ...f,
        nombre:   user.firstName || '',
        apellido: user.lastName  || '',
        email:    user.email     || '',
        tel:      user.phone     || '',
        rut:      user.rut       || '',
        address:  user.address   || '',
        region:   user.region    || '',
        cp:       user.cp        || '',
      }));
      if (user.city) setComunaInput(user.city);
    }
  }, []);

  // Commune search
  const handleComunaInput = (val) => {
    setComunaInput(val);
    setComunaId(null);
    setSelectedQuote(null);
    setQuotes([]);
    if (val.length < 2) { setDropdownOpen(false); setComunaDropdown([]); return; }
    const results = searchComunas(val);
    setComunaDropdown(results);
    setDropdownOpen(results.length > 0);
  };

  const selectComuna = (c) => {
    setComunaId(c.id);
    setComunaInput(c.nombre);
    setComunaDropdown([]);
    setDropdownOpen(false);
    if (errors.comuna) setErrors(e => ({ ...e, comuna: '' }));
    if (!form.region && c.ciudad?.nombre) {
      setForm(f => ({ ...f, region: c.ciudad.nombre }));
    }
  };

  const fetchQuote = async () => {
    if (!comunaId) return;
    setQuoteLoading(true);
    setQuotes([]);
    setSelectedQuote(null);
    try {
      const res = await api.shipping.quote({
        communeId: comunaId,
        alto: 10, ancho: 15, largo: 20, kilos: 0.5,
      });
      setQuotes(res.tarifas || res.rates || res.data || []);
    } catch (e) {
      showToast('Error al cotizar envío', 'error');
    } finally {
      setQuoteLoading(false);
    }
  };

  const goToStep2 = () => {
    const errs = {};

    if (!form.nombre.trim())   errs.nombre   = 'Campo requerido';
    if (!form.apellido.trim()) errs.apellido = 'Campo requerido';

    if (!form.email.trim()) {
      errs.email = 'Campo requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email inválido';
    }

    if (form.tel.trim() && !/^(\+?56)?[\s-]?9[\s-]?\d{4}[\s-]?\d{4}$/.test(form.tel.replace(/\s/g, ''))) {
      errs.tel = 'Teléfono inválido (ej: +56 9 1234 5678)';
    }

    if (!form.rut.trim()) {
      errs.rut = 'Campo requerido';
    } else if (!validarRut(form.rut)) {
      errs.rut = 'RUT inválido';
    }

    if (!form.address.trim()) errs.address = 'Campo requerido';

    if (!comunaId) errs.comuna = 'Selecciona una comuna válida';

    if (!form.cp.trim()) {
      errs.cp = 'Campo requerido';
    } else if (!/^\d{7}$/.test(form.cp.replace(/\s/g, ''))) {
      errs.cp = 'Debe tener 7 dígitos';
    }

    if (!selectedQuote) errs.shipping = 'Selecciona un método de envío';

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmOrder = async () => {
    setConfirming(true);
    try {

      // ── Mercado Pago: crear orden, crear preferencia y redirigir al checkout ──
      if (payMethod === 'mercadopago') {
        const orderRes = await api.orders.create({
          shipping: {
            firstName: form.nombre,
            lastName:  form.apellido,
            email:     form.email,
            phone:     form.tel,
            address:   form.address,
            region:    form.region,
            city:      comunaInput,
            communeId: comunaId,
            zipCode:   form.cp,
          },
          paymentMethod:  'mercadopago',
          shippingMethod: selectedQuote?.tipoEntrega || 'standard',
          shippingCost:   selectedQuote?.costoTotal ?? 0,
        });
        const mpRes = await api.mpPayments.start({
          orderId:       orderRes.orderId,
          amount:        grandTotal,
          customerName:  `${form.nombre} ${form.apellido}`.trim(),
          customerEmail: form.email,
          customerPhone: form.tel || undefined,
          urlSuccess: `${window.location.origin}/pago/exito`,
          urlError:   `${window.location.origin}/pago/error`,
        });
        window.location.href = mpRes.checkoutUrl;
        return;
      }

      // ── WebPay: crear orden primero, luego iniciar pago en Transbank ─────────
      if (payMethod === 'webpay') {
        const orderRes = await api.orders.create({
          shipping: {
            firstName: form.nombre,
            lastName:  form.apellido,
            email:     form.email,
            phone:     form.tel,
            address:   form.address,
            region:    form.region,
            city:      comunaInput,
            communeId: comunaId,
            zipCode:   form.cp,
          },
          paymentMethod:  'webpay',
          shippingMethod: selectedQuote?.tipoEntrega || 'standard',
          shippingCost:   selectedQuote?.costoTotal ?? 0,
        });
        const paymentRes = await api.payments.start({
          orderId:       orderRes.orderId,
          amount:        grandTotal,
          customerName:  `${form.nombre} ${form.apellido}`.trim(),
          customerRut:   form.rut,
          customerEmail: form.email,
          customerPhone: form.tel || undefined,
          urlSuccess: `${window.location.origin}/pago/exito`,
          urlError:   `${window.location.origin}/pago/error`,
        });
        redirectToTransbank(paymentRes.redirectUrl, paymentRes.tbkToken);
        return;
      }

      // ── Otros métodos: crear la orden y mostrar confirmación ────────────────
      const orderRes = await api.orders.create({
        shipping: {
          firstName: form.nombre,
          lastName:  form.apellido,
          email:     form.email,
          phone:     form.tel,
          address:   form.address,
          region:    form.region,
          city:      comunaInput,
          communeId: comunaId,
          zipCode:   form.cp,
        },
        paymentMethod:  payMethod,
        shippingMethod: selectedQuote?.tipoEntrega || 'standard',
        shippingCost:   selectedQuote?.costoTotal ?? 0,
      });
      setOrder(orderRes);
      refreshCart();
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (ex) {
      showToast(ex.error || ex.message || 'Error al confirmar el pedido', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const shippingCost = selectedQuote?.costoTotal ?? null;
  const cartTotal    = cart?.total ?? 0;
  const grandTotal   = shippingCost != null ? cartTotal + shippingCost : cartTotal;

  const typeLabel = (tipo) =>
    tipo === 'AGENCIA' ? 'Retiro en agencia Starken' :
    tipo === 'DOMICILIO' ? 'Envío a domicilio Starken' : tipo;

  return (
    <>
      <style>{`
        @keyframes checkDraw { to { stroke-dashoffset: 0; } }
      `}</style>

      <div className="min-h-screen bg-[#0f0f0f]">
        {/* Checkout header */}
        <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">playing_cards</span>
              </div>
              <span className="font-bold text-white hidden sm:block">La Tech TCG</span>
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-green-400 text-sm">lock</span>Pago 100% seguro</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-violet-400 text-sm">verified_user</span>SSL Encriptado</span>
            </div>
            <Link to="/cart" className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-violet-400 transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Volver al carrito
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link to="/" className="hover:text-violet-400 transition-colors">Home</Link>
            <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
            <Link to="/cart" className="hover:text-violet-400 transition-colors">Carrito</Link>
            <span className="material-symbols-outlined text-base text-gray-600">chevron_right</span>
            <span className="text-white font-medium">Checkout</span>
          </nav>

          <StepBar current={step} />

          <div className="grid lg:grid-cols-3 gap-8 items-start">

            {/* ── Steps ── */}
            <div className="lg:col-span-2">

              {/* STEP 1 — Shipping */}
              {step === 1 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400">local_shipping</span>
                    Información de envío
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormInput label="Nombre *"   value={form.nombre}   onChange={setField('nombre')}   placeholder="Juan"            error={errors.nombre} />
                    <FormInput label="Apellido *" value={form.apellido} onChange={setField('apellido')} placeholder="García"           error={errors.apellido} />
                    <FormInput label="Email *"    type="email" value={form.email} onChange={setField('email')} placeholder="juan@email.com"  error={errors.email} />
                    <FormInput label="Teléfono"   type="tel"   value={form.tel}   onChange={v => setField('tel')(v.replace(/[^\d\s+\-]/g, ''))}   placeholder="+56 9 0000 0000" error={errors.tel} />
                    <FormInput label="RUT *"      value={form.rut}     onChange={v => setField('rut')(v.replace(/[^\d.\-kK]/g, ''))}     placeholder="12.345.678-9"       error={errors.rut} />
                    <div className="sm:col-span-2">
                      <FormInput label="Dirección *" value={form.address} onChange={setField('address')} placeholder="Calle, número, piso/depto" error={errors.address} />
                    </div>
                    <FormInput label="Región" value={form.region} onChange={setField('region')} placeholder="Región" />

                    {/* Commune search */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-300 mb-1.5">Comuna *</label>
                      <input
                        type="text"
                        value={comunaInput}
                        onChange={e => handleComunaInput(e.target.value)}
                        onFocus={() => comunaDropdown.length > 0 && setDropdownOpen(true)}
                        placeholder="Escribe tu comuna…"
                        autoComplete="off"
                        className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-colors
                          ${errors.comuna ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-violet-500'}`}
                      />
                      {errors.comuna && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-xs">error</span>{errors.comuna}</p>}
                      {dropdownOpen && comunaDropdown.length > 0 && (
                        <ul className="absolute z-50 w-full bg-[#1a1a2e] border border-white/10 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto text-sm">
                          {comunaDropdown.map(c => (
                            <li
                              key={c.id}
                              onMouseDown={() => selectComuna(c)}
                              className="px-4 py-2.5 cursor-pointer hover:bg-violet-600/10 hover:text-violet-400 transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium">{c.nombre}</span>
                              <span className="text-xs text-gray-400">{c.ciudad?.nombre || ''}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <FormInput label="Código postal *" value={form.cp} onChange={v => setField('cp')(v.replace(/\D/g, ''))} placeholder="1234567" error={errors.cp} />
                  </div>

                  {/* Shipping quote */}
                  <h3 className="text-base font-bold text-white mt-8 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400 text-xl">inventory_2</span>
                    Método de envío
                  </h3>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-400">Selecciona tu comuna para ver tarifas de Starken</p>
                    <button
                      onClick={fetchQuote}
                      disabled={!comunaId || quoteLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <span className={`material-symbols-outlined text-base ${quoteLoading ? 'animate-spin' : ''}`}>
                        {quoteLoading ? 'progress_activity' : 'calculate'}
                      </span>
                      {quoteLoading ? 'Consultando…' : 'Cotizar'}
                    </button>
                  </div>

                  {/* Retiro en tienda — siempre visible */}
                  <div className="mt-3">
                    {(() => {
                      const retiro = { tipoEntrega: 'RETIRO_TIENDA', costoTotal: 0, diasEntrega: null, tipoServicio: '' };
                      const sel    = selectedQuote?.tipoEntrega === 'RETIRO_TIENDA';
                      return (
                        <label className="block cursor-pointer">
                          <input type="radio" name="shipping-method" className="hidden"
                            onChange={() => { setSelectedQuote(retiro); setErrors(e => ({ ...e, shipping: '' })); }} />
                          <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                            ${sel ? 'border-violet-600 bg-violet-600/10' : 'border-white/10 hover:border-violet-500/50'}`}>
                            <span className="material-symbols-outlined text-violet-400">storefront</span>
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${sel ? 'text-violet-400' : 'text-white'}`}>Retiro en tienda</p>
                              <p className="text-xs text-gray-400">Coordinar retiro por WhatsApp / redes sociales</p>
                            </div>
                            <span className={`text-sm font-bold ${sel ? 'text-violet-400' : 'text-white'}`}>Gratis</span>
                          </div>
                        </label>
                      );
                    })()}
                  </div>

                  {quotes.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {quotes.map((r, i) => {
                        const tipo   = r.tipoEntrega || '';
                        const precio = r.costoTotal ?? 0;
                        const dias   = r.diasEntrega;
                        const sel    = selectedQuote?.tipoEntrega === tipo;
                        return (
                          <label key={i} className="block cursor-pointer">
                            <input type="radio" name="shipping-method" className="hidden"
                              onChange={() => { setSelectedQuote(r); setErrors(e => ({ ...e, shipping: '' })); }} />
                            <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                              ${sel ? 'border-violet-600 bg-violet-600/10' : 'border-white/10 hover:border-violet-500/50'}`}>
                              <span className="material-symbols-outlined text-violet-400">
                                {tipo === 'AGENCIA' ? 'store' : 'local_shipping'}
                              </span>
                              <div className="flex-1">
                                <p className={`text-sm font-bold ${sel ? 'text-violet-400' : 'text-white'}`}>{typeLabel(tipo)}</p>
                                <p className="text-xs text-gray-400">{dias ? `${dias} días hábiles · ` : ''}Starken {r.tipoServicio || ''}</p>
                              </div>
                              <span className={`text-sm font-bold ${sel ? 'text-violet-400' : 'text-white'}`}>{formatCLP(precio)}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {errors.shipping && (
                    <p className="text-sm text-red-400 mt-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">error</span>
                      {errors.shipping}
                    </p>
                  )}

                  <div className="flex justify-end mt-8">
                    <button
                      onClick={goToStep2}
                      className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      Continuar al pago
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — Payment */}
              {step === 2 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-400">credit_card</span>
                    Método de pago
                  </h2>

                  <div className="flex gap-3 mb-6">
                    <PayTab value="webpay" selected={payMethod === 'webpay'} onSelect={setPayMethod}
                      icon={<span className="material-symbols-outlined text-violet-400 text-2xl">credit_card</span>}
                      label="WebPay" />
                    <PayTab value="mercadopago" selected={payMethod === 'mercadopago'} onSelect={setPayMethod}
                      icon={<span className="text-blue-400 font-black text-sm">Mercado<span className="text-cyan-400">Pago</span></span>}
                      label="Mercado Pago" />
                    <PayTab value="transfer" selected={payMethod === 'transfer'} onSelect={setPayMethod}
                      icon={<span className="material-symbols-outlined text-violet-400 text-2xl">account_balance</span>}
                      label="Transferencia" />
                  </div>

                  {payMethod === 'webpay' && (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center mx-auto mb-5">
                        <img
                          src="https://www.transbank.cl/public/img/webpay-plus/logo_webpay_plus_color.svg"
                          alt="WebPay Plus"
                          className="h-14 object-contain"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <h3 className="font-bold text-white mb-2">Pagar con WebPay Plus</h3>
                      <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                        Serás redirigido al formulario seguro de Transbank para completar tu pago con tarjeta de débito, crédito o prepago.
                      </p>
                      <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-green-400">lock</span>
                          Conexión SSL
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-green-400">verified_user</span>
                          Pago 100% seguro
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-violet-400">credit_card</span>
                          Débito / Crédito
                        </span>
                      </div>
                    </div>
                  )}

                  {payMethod === 'mercadopago' && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-cyan-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-blue-400 font-black text-lg">MP</span>
                      </div>
                      <h3 className="font-bold text-white mb-2">Pagar con Mercado Pago</h3>
                      <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Serás redirigido a Mercado Pago para completar el pago de forma segura.</p>
                      <div className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-400 text-slate-900 font-bold rounded-xl cursor-pointer">
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Continuar con Mercado Pago
                      </div>
                    </div>
                  )}

                  {payMethod === 'transfer' && (
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <h3 className="font-bold mb-4 flex items-center gap-2 text-white">
                        <span className="material-symbols-outlined text-violet-400">account_balance</span>
                        Datos bancarios
                      </h3>
                      <div className="space-y-3 text-sm">
                        {[['Banco','Banco Estado'],['N° de cuenta','00000001'],['Tipo','Cuenta Corriente'],['Titular','La Tech TCG']].map(([k,v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-gray-400">{k}</span>
                            <span className="font-semibold text-white">{v}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        Una vez realizada la transferencia, envíanos el comprobante a{' '}
                        <span className="text-violet-400">pagos@latechtcg.com</span>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between mt-8 gap-4">
                    <button
                      onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="px-6 py-4 bg-white/5 border-2 border-white/10 text-gray-300 font-bold rounded-xl hover:border-violet-500 hover:text-violet-400 transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      Volver
                    </button>
                    <button
                      onClick={confirmOrder}
                      disabled={confirming}
                      className="px-8 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                      {confirming
                        ? <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        : <span className="material-symbols-outlined">lock</span>}
                      {confirming
                        ? (payMethod === 'webpay' ? 'Conectando con WebPay…' : payMethod === 'mercadopago' ? 'Conectando con Mercado Pago…' : 'Procesando…')
                        : (payMethod === 'webpay' ? 'Pagar con WebPay' : payMethod === 'mercadopago' ? 'Pagar con Mercado Pago' : 'Confirmar pedido')}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — Confirmation */}
              {step === 3 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                  <CheckAnimation />
                  <h2 className="text-3xl font-extrabold text-white mb-2">¡Pedido confirmado!</h2>
                  <p className="text-gray-400 text-base mb-6">Gracias por tu compra. Te enviamos la confirmación a tu email.</p>

                  {order && (
                    <div className="bg-white/5 rounded-2xl p-6 mb-6 text-left space-y-4 border border-white/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Número de pedido</span>
                        <span className="font-black text-violet-400 text-base">#{order.orderId}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Estado</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Procesando
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Entrega estimada</span>
                        <span className="font-semibold text-white">{order.estimatedDelivery || '5–7 días hábiles'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total pagado</span>
                        <span className="font-black text-xl text-violet-400">{formatCLP(order.total ?? grandTotal)}</span>
                      </div>
                    </div>
                  )}

                  {/* Confirmation items */}
                  {cart?.items?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl mb-6 overflow-hidden text-left">
                      {cart.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0">
                          <img src={item.card?.image || ''} alt={item.card?.name} className="w-12 h-16 object-contain rounded-lg" />
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-white">{item.card?.name}</p>
                            <p className="text-xs text-gray-400">x{item.qty} · {item.condition?.toUpperCase()}</p>
                          </div>
                          <span className="font-bold text-sm text-violet-400">{formatCLP(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/" className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">home</span>
                      Volver al inicio
                    </Link>
                    <Link to="/singles" className="px-8 py-4 bg-white/5 border-2 border-white/10 text-white font-bold rounded-xl hover:border-violet-500 hover:text-violet-400 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">storefront</span>
                      Seguir comprando
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ── Order summary sidebar ── */}
            {step < 3 && (
              <div className="hidden lg:block sticky top-24">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h2 className="text-base font-bold text-white mb-5">Resumen del pedido</h2>

                  {cart?.items?.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center mb-4">
                      <div className="relative flex-shrink-0">
                        <img src={item.card?.image || ''} className="w-12 h-16 object-contain rounded-xl" alt={item.card?.name} />
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.qty}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.card?.name}</p>
                        <p className="text-xs text-gray-400">{COND_LABELS[item.condition] || item.condition}</p>
                      </div>
                      <span className="text-sm font-bold text-violet-400 flex-shrink-0">{formatCLP(item.subtotal)}</span>
                    </div>
                  ))}

                  <hr className="border-white/10 mb-4" />

                  <div className="space-y-2.5 text-sm mb-5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="font-semibold text-white">{cart ? formatCLP(cart.subtotal) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Envío</span>
                      <span className={`font-semibold ${shippingCost != null ? 'text-violet-400' : 'text-gray-500 italic text-xs'}`}>
                        {shippingCost != null ? (shippingCost === 0 ? 'Gratis' : formatCLP(shippingCost)) : 'Por cotizar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-4 border-t border-white/10">
                    <span className="font-bold text-white">Total</span>
                    <span className="text-xl font-black text-violet-400">{formatCLP(grandTotal)}</span>
                  </div>

                  <div className="mt-4 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <p className="text-xs text-green-400 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      Tu compra está protegida con encriptación SSL de 256 bits.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
