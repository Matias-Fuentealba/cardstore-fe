# AGENTS.md — CardStore Frontend

## Visión general

SPA React + Vite para un marketplace de cartas coleccionables (TCG). No usa Next.js ni TypeScript — es **JavaScript puro con JSX**. El backend es una API REST separada; este repo solo maneja el frontend.

## Stack

- **React 19 + Vite 8** con HMR. Sin SSR.
- **React Router v7** — enrutamiento client-side en `src/App.jsx`
- **Zustand v5** — estado global en `src/store/` (solo 2 stores: `authStore`, `cartStore`)
- **Tailwind CSS v4** — tema oscuro, acento violeta `#6d28d9`, fondo `#0f0f0f`
- **Supabase** — solo para OAuth de Google; el backend maneja el resto de la autenticación
- **API centralizada** en `src/api/index.js` — todos los llamados al backend pasan por aquí

## Comandos clave

```bash
npm run dev      # Servidor de desarrollo con HMR
npm run build    # Build de producción → dist/
npm run lint     # ESLint (flat config)
npm run preview  # Vista previa del build
```

## Variables de entorno (prefijo `VITE_`)

```
VITE_SUPABASE_URL       # URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY  # Clave anon pública para OAuth
VITE_API_URL            # Base del backend (default: http://localhost:3000/v1)
```

## Arquitectura principal

### Flujo de autenticación dual
Hay dos vías de login gestionadas en `src/store/authStore.js`:
1. **Email/password** → token JWT del backend guardado en localStorage
2. **Google OAuth** → Supabase entrega el token, el backend lo valida y hace upsert del perfil

Al montar la app (`App.jsx`), se ejecuta `authStore.init()` que parsea el JWT, programa un refresh automático 60s antes del vencimiento, y escucha el listener de Supabase para OAuth callbacks.

### API Client (`src/api/index.js`)
- Singleton con métodos agrupados: `api.cards.*`, `api.cart.*`, `api.orders.*`, `api.admin.*`, etc.
- Inyecta `Authorization: Bearer <token>` automáticamente
- En errores 401 intenta refresh (por Supabase o por endpoint del backend) y reintenta
- Filtros complejos se codifican como `URLSearchParams` (ej. arrays `game[]`, `rarity[]`)
- Helper de formateo incluido: `formatCLP(price)` para pesos chilenos

### Protección de rutas (`src/App.jsx`)
- `<PrivateRoute>` redirige a `/login` si no autenticado
- `<PrivateRoute adminOnly>` redirige al inicio si no es admin
- `<PublicLayout>` envuelve las rutas con el `<Navbar>`

### Carrito (`src/store/cartStore.js`)
Después de cada mutación (agregar/quitar), el store refresca el carrito completo desde el backend para mantener el badge del navbar sincronizado.

## Convenciones del proyecto

**Archivos**: PascalCase para páginas y componentes (`CardDetail.jsx`, `AdminLayout.jsx`), camelCase para utilidades y stores.

**Separadores de sección en código**:
```js
// ─── Nombre de sección ────────────────────────────────────
```

**Estado local típico**:
```js
const [loading, setLoading] = useState(false)
const [addState, setAddState] = useState('idle') // 'idle' | 'loading' | 'done'
```

**Selectors de Zustand**:
```js
const user = useAuthStore(s => s.user)
const { addItem } = useCartStore()
```

**Notificaciones globales**: `showToast(mensaje, tipo)` — el componente `src/components/ui/Toast.jsx` expone un setter global, sin prop drilling.

## Patrones de UI

- Iconos: **Material Symbols Outlined** (cargado vía CSS `@import`)
- Glassmorphism: `backdrop-blur`, `bg-white/5`, `border-white/10`
- Grids responsivos: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Animaciones CSS custom en `src/index.css`: `slide-left`, `sparkle`, `checkDraw`
- Efecto holográfico 3D en `src/pages/CardDetail.jsx`: tracking de cursor con `onMouseMove` + `perspective` transforms

## Áreas funcionales clave

| Área | Archivos principales |
|------|---------------------|
| Autenticación | `src/store/authStore.js`, `src/lib/supabase.js`, `src/pages/Login.jsx` |
| Catálogo/búsqueda | `src/pages/Search.jsx`, `src/pages/Singles.jsx`, `src/api/index.js` |
| Carrito y checkout | `src/store/cartStore.js`, `src/pages/Cart.jsx`, `src/pages/Checkout.jsx` |
| Admin (CRUD + bulk) | `src/pages/admin/` — Cards, Inventory, Orders; importación Excel vía `xlsx` |
| Deck builder | `src/pages/Deckbuilder.jsx` |
| Perfil de usuario | `src/pages/Profile.jsx` — dirección, 2FA, sesiones, cambio de contraseña |

## Lo que NO hay

- No hay TypeScript — no crear archivos `.ts` ni `.tsx`
- No hay tests automatizados configurados
- No hay Context API — usar Zustand para estado compartido
- No hay server components ni SSR
