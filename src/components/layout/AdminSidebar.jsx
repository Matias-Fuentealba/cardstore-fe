import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const LINKS = [
  { to: '/admin/cards',     icon: 'style',          label: 'Catálogo' },
  { to: '/admin/inventory', icon: 'inventory_2',    label: 'Inventario' },
  { to: '/admin/orders',    icon: 'receipt_long',   label: 'Pedidos' },
];

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <>
      {/* Hamburger — mobile */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1a1a2e] border border-white/10 rounded-lg text-gray-400"
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0d0d1a] border-r border-white/5 z-40 flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/5">
          <Link to="/" className="block">
            <img src="https://i.imgur.com/dVTFMJf.png" alt="La Tech TCG" className="h-12 w-auto object-contain" />
            <p className="text-[11px] text-gray-500 mt-1 font-semibold tracking-widest uppercase">Panel Admin</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {LINKS.map(({ to, icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="material-symbols-outlined text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-400 text-sm">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500 truncate">{user?.email}</div>
            </div>
          </div>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            Ver tienda
          </Link>
        </div>
      </aside>
    </>
  );
}
