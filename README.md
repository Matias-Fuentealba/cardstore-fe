# La Tech TCG — Frontend

SPA para tienda de cartas coleccionables (TCG). React + Vite, sin TypeScript ni SSR.

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19 + Vite 8 |
| Routing | React Router v7 |
| Estado global | Zustand v5 |
| Estilos | Tailwind CSS v4 (tema oscuro, acento violeta) |
| Auth Google | Supabase (solo OAuth) |
| Pagos | Transbank WebPay Plus + Mercado Pago |
| Deploy | Vercel |

## Setup

```bash
npm install
cp .env.local.example .env.local   # completar con tus valores
npm run dev
```

## Variables de entorno

```env
VITE_API_URL=http://localhost:3000/api/v1   # URL base del backend
VITE_SUPABASE_URL=                          # URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY=                     # Clave anon pública (solo OAuth)
```

Sin VITE_API_URL apunta a http://localhost:3000/api/v1 por defecto.

## Scripts

```bash
npm run dev      # Servidor de desarrollo (HMR)
npm run build    # Build de producción → dist/
npm run preview  # Vista previa del build
npm run lint     # ESLint
```

## Estructura

```
src/
├── api/          # Cliente HTTP centralizado (api/index.js)
├── components/
│   ├── layout/   # Navbar, AdminSidebar, AdminLayout
│   └── ui/       # Toast, componentes reutilizables
├── data/         # Datos estáticos (comunas de Chile, etc.)
├── lib/          # supabase.js
├── pages/
│   ├── admin/    # Cards, Inventory, Orders (solo admin)
│   └── ...       # Home, Singles, CardDetail, Cart, Checkout,
│                 #   Profile, Login, ForgotPassword, ResetPassword,
│                 #   PaymentSuccess, PaymentError, Deckbuilder
├── store/        # authStore.js, cartStore.js (Zustand)
└── App.jsx       # Rutas + PrivateRoute + bootstrap de sesión
```

## Autenticación

Hay dos flujos gestionados en src/store/authStore.js:

- **Email/password** — POST /auth/login; el backend setea una cookie httpOnly. El access token se guarda en memoria (no en localStorage).
- **Google OAuth** — Supabase entrega el token; se intercambia por sesión del backend vía POST /auth/social-login. El token Supabase se guarda en memoria.

Al montar la app, hydrate() verifica la sesión contra /users/me antes de renderizar rutas privadas.

## Rutas

| Ruta | Acceso |
|------|--------|
| `/` | Pública |
| `/singles`, `/search`, `/card/:id` | Pública |
| `/cart` | Pública |
| `/checkout` | Requiere login |
| `/profile` | Requiere login |
| `/pago/exito`, `/pago/error` | Pública |
| `/admin/*` | Requiere rol admin |
| `/forgot-password`, `/reset-password` | Pública |

## Deploy

El proyecto se despliega en Vercel desde la rama `main`. El vercel.json redirige todo al index.html para el routing client-side. Las variables de entorno se configuran en el dashboard de Vercel.
