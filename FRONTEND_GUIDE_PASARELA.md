# 🖥️ Recetario Frontend — Transbank WebPay Plus (TypeScript)

> **Contexto**: Tienda de cartas. El frontend consume las APIs del backend propio,  
> hace el redirect a Transbank y maneja las páginas de resultado.  
> Stack: TypeScript (React / Next.js / Vue / vanilla — aplica para cualquiera)

---

## 1. Flujo que debe manejar el frontend

```
1. Usuario confirma pedido
        ↓
2. Frontend llama POST /api/payments/start
        ↓
3. Backend devuelve { tbkToken, redirectUrl }
        ↓
4. Frontend hace form POST a redirectUrl con TBK_TOKEN y token_ws
        ↓
5. Usuario ve el formulario de Transbank y paga
        ↓
6. Transbank redirige al backend (callback) → backend redirige al frontend
        ↓
7. Frontend recibe ?tokenTrx=... en url_success o url_error
        ↓
8. Frontend llama GET /api/payments/:tokenTrx para mostrar el resultado
```

---

## 2. Interfaces TypeScript

```typescript
// types/payment.types.ts

export interface StartPaymentPayload {
  orderId: string;
  amount: number;
  customerName: string;
  customerRut: string;
  customerEmail: string;
  customerPhone?: string;
  urlSuccess: string;   // página de éxito del FRONTEND (ej: https://mitienda.com/pago/exito)
  urlError: string;     // página de error  del FRONTEND (ej: https://mitienda.com/pago/error)
}

export interface StartPaymentResponse {
  tokenTrx: string;
  tbkToken: string;
  redirectUrl: string;
}

export interface PaymentStatus {
  tokenTrx: string;
  orderId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  amount: number;
  customerName: string;
  customerEmail: string;
  tbkAuthorizationCode?: string;
  tbkResponseCode?: number;
  tbkPaymentTypeCode?: string;
  tbkCardNumber?: string;       // últimos 4 dígitos
  tbkTransactionDate?: string;
  createdAt: string;
}
```

---

## 3. Servicio de pagos (cliente HTTP)

```typescript
// services/payment.service.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function startPayment(payload: StartPaymentPayload): Promise<StartPaymentResponse> {
  const res = await fetch(`${API_BASE}/api/payments/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Error ${res.status} al iniciar pago`);
  }

  return res.json();
}

export async function getPaymentStatus(tokenTrx: string): Promise<PaymentStatus> {
  const res = await fetch(`${API_BASE}/api/payments/${tokenTrx}`);

  if (!res.ok) throw new Error(`No se encontró la transacción ${tokenTrx}`);
  return res.json();
}
```

---

## 4. ⚠️ La redirección a Transbank — CLAVE

> Transbank **NO acepta** `window.location.href` ni `window.open()`.  
> **Requiere un HTTP POST** con el token en el body del formulario.  
> Si usas GET o solo abres la URL, Transbank rechaza la solicitud.

### Función de redirección (vanilla TS — funciona en cualquier framework)

```typescript
// utils/tbk-redirect.ts

/**
 * Redirige al usuario al formulario de Transbank via form POST.
 * Transbank necesita el token en el body, no en la URL.
 *
 * @param redirectUrl  - URL de Transbank (viene del backend en /start)
 * @param tbkToken     - Token de Transbank (viene del backend en /start)
 * @param target       - '_self' para misma pestaña (recomendado), '_blank' para nueva
 */
export function redirectToTransbank(
  redirectUrl: string,
  tbkToken: string,
  target: '_self' | '_blank' = '_self'
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = redirectUrl;
  form.target = target;

  // Transbank usa 'token_ws' para WebPay Plus
  // Se envían ambos campos por compatibilidad (TBK_TOKEN también se acepta)
  const fields: [string, string][] = [
    ['token_ws', tbkToken],
    ['TBK_TOKEN', tbkToken],
  ];

  fields.forEach(([name, value]) => {
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
```

---

## 5. Componente: Botón de pago (React)

```tsx
// components/PayButton.tsx
import { useState } from 'react';
import { startPayment } from '../services/payment.service';
import { redirectToTransbank } from '../utils/tbk-redirect';

interface Props {
  orderId: string;
  amount: number;
  customerName: string;
  customerRut: string;
  customerEmail: string;
  customerPhone?: string;
}

export function PayButton({ orderId, amount, customerName, customerRut, customerEmail, customerPhone }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await startPayment({
        orderId,
        amount,
        customerName,
        customerRut,
        customerEmail,
        customerPhone,
        urlSuccess: `${window.location.origin}/pago/exito`,
        urlError:   `${window.location.origin}/pago/error`,
      });

      // Redirigir a Transbank (form POST obligatorio)
      redirectToTransbank(result.redirectUrl, result.tbkToken);

    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar el pago');
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handlePay} disabled={loading}>
        {loading ? 'Conectando con Transbank...' : `Pagar $${amount.toLocaleString('es-CL')}`}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

---

## 6. Página de resultado de éxito

> El backend redirige aquí con `?tokenTrx=TRX-xxxx` en la URL.

```tsx
// pages/pago/exito.tsx  (Next.js)  |  Adaptar a tu router

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';   // Next 13+
import { getPaymentStatus, PaymentStatus } from '../../services/payment.service';

export default function PagoExito() {
  const searchParams = useSearchParams();
  const tokenTrx     = searchParams.get('tokenTrx');

  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!tokenTrx) { setError('Token no encontrado'); return; }

    getPaymentStatus(tokenTrx)
      .then(setPayment)
      .catch(() => setError('No se pudo cargar el resultado del pago'));
  }, [tokenTrx]);

  if (error)   return <p>Error: {error}</p>;
  if (!payment) return <p>Cargando resultado...</p>;

  // Doble verificación: aunque llegaste a /exito, validar status en BD
  if (payment.status !== 'CONFIRMED') {
    return <p>El pago no fue confirmado. Estado: {payment.status}</p>;
  }

  return (
    <div>
      <h1>✅ Pago exitoso</h1>
      <p>Pedido: <strong>{payment.orderId}</strong></p>
      <p>Monto: <strong>${payment.amount.toLocaleString('es-CL')}</strong></p>
      <p>Código autorización: <strong>{payment.tbkAuthorizationCode}</strong></p>
      <p>Últimos 4 dígitos: <strong>**** {payment.tbkCardNumber}</strong></p>
      <p>Fecha: <strong>{new Date(payment.tbkTransactionDate!).toLocaleString('es-CL')}</strong></p>
    </div>
  );
}
```

---

## 7. Página de resultado de error / cancelación

```tsx
// pages/pago/error.tsx

import { useSearchParams } from 'next/navigation';

const REASON_MESSAGES: Record<string, string> = {
  cancelled:            'Cancelaste el pago en Transbank.',
  rejected:             'Tu pago fue rechazado por el banco emisor.',
  tbk_error:            'Hubo un error al procesar el pago con Transbank.',
  no_token:             'No se recibió confirmación de Transbank.',
  intention_not_found:  'No se encontró la transacción.',
};

export default function PagoError() {
  const searchParams = useSearchParams();
  const reason       = searchParams.get('reason') ?? 'rejected';
  const tokenTrx     = searchParams.get('tokenTrx');
  const code         = searchParams.get('code');

  const message = REASON_MESSAGES[reason] ?? 'El pago no pudo completarse.';

  return (
    <div>
      <h1>❌ Pago no completado</h1>
      <p>{message}</p>
      {code && <p>Código Transbank: {code}</p>}
      {tokenTrx && <p>Referencia: {tokenTrx}</p>}
      <a href="/carrito">Volver al carrito</a>
    </div>
  );
}
```

---

## 8. Escenarios que Transbank puede devolver

| Escenario | Campo en callback | Status resultante | Frontend aterriza en |
|---|---|---|---|
| Pago aprobado | `token_ws` | `CONFIRMED` | `url_success` |
| Pago rechazado | `token_ws` | `FAILED` | `url_error?reason=rejected` |
| Usuario canceló | `TBK_TOKEN` (sin `token_ws`) | `CANCELLED` | `url_error?reason=cancelled` |
| Timeout (10 min) | `TBK_TOKEN` (sin `token_ws`) | `CANCELLED` | `url_error?reason=cancelled` |

> **Siempre** consultar `GET /api/payments/:tokenTrx` para mostrar el resultado real.  
> No confiar solo en la URL a la que aterrizas.

---

## 9. Variables de entorno del frontend

```env
# URL base del backend
NEXT_PUBLIC_API_URL=http://localhost:3000   # desarrollo
# NEXT_PUBLIC_API_URL=https://api.mitienda.com  # producción
```

---

## 10. Consideraciones finales

### ✅ DO
- Siempre usar `form.submit()` para redirigir a Transbank
- Consultar `GET /api/payments/:tokenTrx` en la página de resultado para validar estado real
- Mostrar spinner mientras se conecta con Transbank (puede tardar 1-2 seg)
- Usar `url_success` y `url_error` con rutas absolutas (incluyendo dominio)

### ❌ DON'T
- **No** usar `window.location.href = redirectUrl` para ir a Transbank
- **No** confiar solo en que el usuario aterrizó en `/pago/exito` — validar siempre en BD
- **No** guardar `tbkToken` en localStorage (dato sensible, solo en memoria)
- **No** hacer el confirm de Transbank desde el frontend (debe ser backend ↔ Transbank)
