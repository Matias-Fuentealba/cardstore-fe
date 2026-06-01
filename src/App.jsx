import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { Auth } from './api';
import { supabase } from './lib/supabase';
import { Toast } from './components/ui/Toast';
import { Navbar } from './components/layout/Navbar';
import { AdminLayout } from './components/layout/AdminLayout';

// Pages
import { Home }     from './pages/Home';
import { Login }    from './pages/Login';
import { NotFound } from './pages/NotFound';
import { AuthCallback } from './pages/AuthCallback';
import { VerifyEmail } from './pages/VerifyEmail';

import { Singles }    from './pages/Singles';
import { Search }     from './pages/Search';
import { CardDetail } from './pages/CardDetail';
import { Cart }     from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentError }   from './pages/PaymentError';
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

    // Sync Supabase session changes to Auth/store
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session) {
        Auth.setToken(session.access_token);
        useAuthStore.setState({ token: session.access_token });
      }
      if (event === 'SIGNED_OUT') {
        Auth.clear();
        useAuthStore.setState({ user: null, token: null, isLoggedIn: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/singles"  element={<PublicLayout><Singles /></PublicLayout>} />
        <Route path="/search"   element={<PublicLayout><Search /></PublicLayout>} />
        <Route path="/card/:id" element={<PublicLayout><CardDetail /></PublicLayout>} />
        <Route path="/cart"     element={<PublicLayout><Cart /></PublicLayout>} />

        {/* Private */}
        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/pago/exito" element={<PaymentSuccess />} />
        <Route path="/pago/error" element={<PaymentError />} />
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
