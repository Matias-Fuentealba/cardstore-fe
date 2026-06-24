import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { showToast } from '../ui/Toast';

export function Navbar() {
  const { isLoggedIn, user, logout } = useAuthStore();
  const { count } = useCartStore();
  const navigate = useNavigate();

  const profileHref = !isLoggedIn
    ? '/login'
    : user?.role === 'admin'
    ? '/admin/cards'
    : '/profile';

  const handleLogout = async () => {
    await logout();
    showToast('Sesión cerrada', 'success');
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-4">
          <img src="https://i.imgur.com/dVTFMJf.png" alt="La Tech TCG" className="h-[80px] w-auto object-contain" />
          <span className="font-bold text-white hidden sm:block">La Tech TCG</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
            search
          </span>
          <input
            id="navbar-search"
            type="text"
            placeholder="Buscar cartas..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = e.target.value.trim();
                if (q) {
                  sessionStorage.setItem('searchQuery', q);
                  navigate('/search');
                }
              }
            }}
          />
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/singles">Singles</NavLink>
          <NavLink to="/sellado">Sellado</NavLink>
          {/* <NavLink to="/deckbuilder">Deckbuilder</NavLink> */}
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Cart */}
          <Link to="/cart" className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined">shopping_cart</span>
            {count > 0 && (
              <span className="nav-cart-badge absolute -top-1 -right-1 bg-violet-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </Link>

          {/* Profile */}
          <Link
            to={profileHref}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title={user?.role === 'admin' ? 'Panel de administración' : 'Mi perfil'}
          >
            <span className="material-symbols-outlined">
              {user?.role === 'admin' ? 'admin_panel_settings' : 'person'}
            </span>
          </Link>

          {/* Logout — solo si logueado */}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  );
}
