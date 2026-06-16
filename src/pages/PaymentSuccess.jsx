import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatCLP } from '../api';
import { useCartStore } from '../store/cartStore';

// ─── Check animation ──────────────────────────────────────────────────────────
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

// ─── Detail raow ───────────────────────────────────────────────────────────────
function DetailRow({ label, value, accent = false }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${accent ? 'text-violet-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const tokenTrx = searchParams.get('tokenTrx');
  const provider  = searchParams.get('provider') ?? 'transbank';
  const refreshCart = useCartStore(s => s.refresh);

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!tokenTrx) {
      setError('No se recibió el token de la transacción.');
      setLoading(false);
      return;
    }
    const fetchStatus = provider === 'mercadopago'
      ? api.mpPayments.getStatus(tokenTrx)
      : api.payments.getStatus(tokenTrx);

    fetchStatus
      .then(data => {
        setPayment(data);
        setLoading(false);
        // Sincronizar el carrito local (el backend ya lo vació al confirmar el pago)
        refreshCart();
      })
      .catch(() => { setError('No se pudo obtener el resultado del pago.'); setLoading(false); });
  }, [tokenTrx, provider]);

  return (
    <>
      <style>{`@keyframes checkDraw { to { stroke-dashoffset: 0; } }`}</style>
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

          {/* Loading */}
          {loading && (
            <div className="text-center">
              <span className="material-symbols-outlined text-violet-400 text-5xl animate-spin">progress_activity</span>
              <p className="text-gray-400 mt-4">Verificando el resultado del pago…</p>
            </div>
          )}

          {/* Error fetching */}
          {!loading && error && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-red-400 text-4xl">error</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-gray-400 mb-8">{error}</p>
              <Link to="/cart" className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">shopping_cart</span>
                Volver al carrito
              </Link>
            </div>
          )}

          {/* Payment not confirmed */}
          {!loading && !error && payment && payment.status !== 'CONFIRMED' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-yellow-400 text-4xl">warning</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Pago no confirmado</h2>
              <p className="text-gray-400 mb-2">El pago no pudo ser confirmado.</p>
              <p className="text-sm text-gray-500 mb-8">Estado: <span className="font-semibold text-yellow-400">{payment.status}</span></p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/cart" className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">shopping_cart</span>
                  Volver al carrito
                </Link>
                <Link to="/" className="px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:border-violet-500 transition-colors inline-flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">home</span>
                  Inicio
                </Link>
              </div>
            </div>
          )}

          {/* Success */}
          {!loading && !error && payment && payment.status === 'CONFIRMED' && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
              <CheckAnimation />
              <h2 className="text-3xl font-extrabold text-white mb-2">¡Pago exitoso!</h2>
              <p className="text-gray-400 mb-8">Tu pedido ha sido confirmado. Te enviamos los detalles a tu email.</p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-4">
                {payment.orderId && (
                  <DetailRow label="Número de pedido" value={`#${payment.orderId}`} accent />
                )}
                <DetailRow label="Monto pagado" value={formatCLP(payment.amount)} accent />

                {/* Detalles Transbank */}
                {payment.provider !== 'mercadopago' && (
                  <>
                    {payment.tbkAuthorizationCode && (
                      <DetailRow label="Código autorización" value={payment.tbkAuthorizationCode} />
                    )}
                    {payment.tbkCardNumber && (
                      <DetailRow label="Tarjeta" value={`**** **** **** ${payment.tbkCardNumber}`} />
                    )}
                    {payment.tbkPaymentTypeCode && (
                      <DetailRow label="Tipo de pago" value={payment.tbkPaymentTypeCode} />
                    )}
                    {payment.tbkTransactionDate && (
                      <DetailRow
                        label="Fecha"
                        value={new Date(payment.tbkTransactionDate).toLocaleString('es-CL')}
                      />
                    )}
                  </>
                )}

                {/* Detalles Mercado Pago */}
                {payment.provider === 'mercadopago' && (
                  <>
                    {payment.mpPaymentId && (
                      <DetailRow label="ID de pago" value={payment.mpPaymentId} />
                    )}
                    {payment.mpPaymentMethodId && (
                      <DetailRow label="Método de pago" value={payment.mpPaymentMethodId} />
                    )}
                    {payment.mpPaymentTypeId && (
                      <DetailRow label="Tipo" value={payment.mpPaymentTypeId} />
                    )}
                  </>
                )}

                <DetailRow label="Cliente" value={payment.customerName} />
                <DetailRow label="Email" value={payment.customerEmail} />
              </div>

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
      </div>
    </>
  );
}
