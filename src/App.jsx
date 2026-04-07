import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { Toast } from './components/ui/Toast';
import { Navbar } from './components/layout/Navbar';
import { AdminLayout } from './components/layout/AdminLayout';

// Pages
import { Home }     from './pages/Home';
import { Login }    from './pages/Login';
import { NotFound } from './pages/NotFound';

import { Singles }    from './pages/Singles';
import { Search }     from './pages/Search';
import { CardDetail } from './pages/CardDetail';
import { Cart }     from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Profile }     from './pages/Profile';
import { Deckbuilder } from './pages/Deckbuilder';
import { AdminCards }     from './pages/admin/Cards';
import { AdminInventory } from './pages/admin/Inventory';
import { AdminOrders }    from './pages/admin/Orders';

function PrivateRoute({ children, adminOnly = false }) {
  const { isLoggedIn, user } = useAuthStore();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
    </>
  );
}

export default function App() {
  const initAuth = useAuthStore(s => s.init);
  const refreshCart = useCartStore(s => s.refresh);

  useEffect(() => {
    initAuth();
    refreshCart();
  }, []);

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/login" element={<Login />} />

        <Route path="/singles"  element={<PublicLayout><Singles /></PublicLayout>} />
        <Route path="/search"   element={<PublicLayout><Search /></PublicLayout>} />
        <Route path="/card/:id" element={<PublicLayout><CardDetail /></PublicLayout>} />
        <Route path="/cart"     element={<PublicLayout><Cart /></PublicLayout>} />

        {/* Private */}
        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/profile"     element={<PrivateRoute><PublicLayout><Profile /></PublicLayout></PrivateRoute>} />
        <Route path="/deckbuilder" element={<PublicLayout><Deckbuilder /></PublicLayout>} />
        {/* Admin */}
        <Route path="/admin/cards"     element={<PrivateRoute adminOnly><AdminLayout><AdminCards /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/inventory" element={<PrivateRoute adminOnly><AdminLayout><AdminInventory /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/orders"    element={<PrivateRoute adminOnly><AdminLayout><AdminOrders /></AdminLayout></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
