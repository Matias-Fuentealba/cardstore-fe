import { Link, useSearchParams } from 'react-router-dom';

// ─── Reason messages ──────────────────────────────────────────────────────────
const REASON_MESSAGES = {
  cancelled:           'Cancelaste el pago en Transbank.',
  rejected:            'Tu pago fue rechazado por el banco emisor.',
  tbk_error:           'Hubo un error al procesar el pago con Transbank.',
  no_token:            'No se recibió confirmación de Transbank.',
  intention_not_found: 'No se encontró la transacción.',
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PaymentError() {
  const [searchParams] = useSearchParams();
  const reason   = searchParams.get('reason')   ?? 'rejected';
  const tokenTrx = searchParams.get('tokenTrx');
  const code     = searchParams.get('code');

  const message = REASON_MESSAGES[reason] ?? 'El pago no pudo completarse.';

  const isCancelled = reason === 'cancelled';

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-12 text-center">

          {/* Icon */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${isCancelled ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
            <span className={`material-symbols-outlined text-5xl ${isCancelled ? 'text-yellow-400' : 'text-red-400'}`}>
              {isCancelled ? 'cancel' : 'error'}
            </span>
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-3">
            {isCancelled ? 'Pago cancelado' : 'Pago no completado'}
          </h2>
          <p className="text-gray-400 mb-6">{message}</p>

          {/* Meta info */}
          {(code || tokenTrx) && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left space-y-2">
              {code && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Código Transbank</span>
                  <span className="font-semibold text-white">{code}</span>
                </div>
              )}
              {tokenTrx && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Referencia</span>
                  <span className="font-mono text-xs text-gray-300">{tokenTrx}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-gray-500 mb-8">
            Puedes intentar nuevamente desde tu carrito. Si el problema persiste, contáctanos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/cart"
              className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              Volver al carrito
            </Link>
            <Link
              to="/"
              className="px-8 py-4 bg-white/5 border-2 border-white/10 text-white font-bold rounded-xl hover:border-violet-500 hover:text-violet-400 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">home</span>
              Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
