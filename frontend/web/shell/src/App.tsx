import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getUser, clearUser, AuthUser } from './auth';
import Layout from './components/Layout';
import { useStrings } from './i18n';

// Lazy-load each remote micro-frontend
const AuthApp        = lazy(() => import('authMf/App'));
const WarehousesApp  = lazy(() => import('warehousesMf/App'));
const InventoryApp   = lazy(() => import('inventoryMf/App'));
const OrdersApp      = lazy(() => import('ordersMf/App'));
const CompaniesApp   = lazy(() => import('companiesMf/App'));
const FleetApp       = lazy(() => import('fleetMf/App'));
const ProductsApp    = lazy(() => import('productsMf/App'));

function Loading() {
  const s = useStrings();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b', fontSize: '1rem' }}>{s.common.loading}</p>
    </div>
  );
}

function NotFound() {
  const s = useStrings();
  return <p style={{ padding: '2rem' }}>{s.common.error}</p>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(getUser());
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mf_user') {
        setUser(e.newValue ? JSON.parse(e.newValue) as AuthUser : null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
      clearUser();
      setUser(null);
      navigate('/login');
    });
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/warehouses" replace />
          ) : (
            <Suspense fallback={<Loading />}>
              <AuthApp onLogin={(u: AuthUser) => { setUser(u); navigate('/warehouses'); }} />
            </Suspense>
          )
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout user={user!} onLogout={handleLogout}>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/"            element={<Navigate to="/warehouses" replace />} />
                  <Route path="/warehouses"  element={<WarehousesApp />} />
                  <Route path="/inventory"   element={<InventoryApp />} />
                  <Route path="/orders"      element={<OrdersApp />} />
                  <Route path="/companies"   element={<CompaniesApp />} />
                  <Route path="/fleet"       element={<FleetApp />} />
                  <Route path="/products"    element={<ProductsApp />} />
                  <Route path="*"            element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
